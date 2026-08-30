import hashlib
import os
import re
import secrets
import smtplib
import ssl
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from functools import wraps
from urllib.parse import quote

import jwt
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request
from flask_cors import CORS
from mysql.connector import pooling
from mysql.connector.errors import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from ml_forecast import forecast_demand

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

JWT_SECRET = os.getenv("JWT_SECRET", "smart-inventory-dev-secret")
JWT_HOURS = int(os.getenv("JWT_EXPIRES_HOURS", "24"))
REMEMBER_ME_DAYS = int(os.getenv("REMEMBER_ME_DAYS", "30"))
RESET_TOKEN_MINUTES = int(os.getenv("RESET_TOKEN_MINUTES", "15"))

# ---------------------------------------------------------------------------
# SMTP / password-reset email configuration (all from environment variables).
# backend/.env is loaded with load_dotenv() below, so the values can live in
# backend/.env. SMTP_HOST left empty disables email sending.
# ---------------------------------------------------------------------------
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "").strip() or SMTP_USERNAME
# "true" = STARTTLS (port 587), "false" = plain, "ssl" = implicit TLS (port 465).
SMTP_SECURITY = os.getenv("SMTP_SECURITY", "true").strip().lower()
# Base URL of the frontend, used to build the password reset link.
APP_URL = os.getenv("APP_URL", "http://localhost:5173").rstrip("/")
# Optional: email address assigned to the "admin" account at startup when it
# has no email yet, so the password reset email has a destination.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip()

EMAIL_SUBJECT = "Smart Inventory Management System - Password Reset"

pool = pooling.MySQLConnectionPool(
    pool_name="smart_inventory_pool",
    pool_size=8,
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "smart_inventory"),
    port=int(os.getenv("DB_PORT", "3306")),
)


def serialize_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, date):
        return value.isoformat()
    return value


def serialize_row(row):
    if row is None:
        return None
    return {key: serialize_value(value) for key, value in row.items()}


def get_conn():
    return pool.get_connection()


def fetch_all(sql, params=None):
    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql, params or ())
        return [serialize_row(row) for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()


def fetch_one(sql, params=None):
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql, params=None):
    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql, params or ())
        conn.commit()
        return cursor.lastrowid, cursor.rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def init_auth_table():
    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute("SELECT id FROM users WHERE username = %s", ("admin",))
        if cursor.fetchone() is None:
            cursor.execute(
                "INSERT INTO users (username, password_hash) VALUES (%s, %s)",
                ("admin", generate_password_hash("admin123")),
            )
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _column_exists(cursor, table, column):
    cursor.execute(
        """
        SELECT COUNT(*) AS cnt
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = %s
          AND COLUMN_NAME = %s
        """,
        (table, column),
    )
    return cursor.fetchone()["cnt"] > 0


def _index_exists(cursor, table, index_name):
    cursor.execute(
        """
        SELECT COUNT(*) AS cnt
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = %s
          AND INDEX_NAME = %s
        """,
        (table, index_name),
    )
    return cursor.fetchone()["cnt"] > 0


def _year_of(value):
    """Extract the invoice year used for invoice numbering."""
    if value is None:
        return date.today().year
    if isinstance(value, datetime):
        return value.year
    if isinstance(value, date):
        return value.year
    try:
        return int(str(value)[:4])
    except (TypeError, ValueError):
        return date.today().year


def _next_invoice_number(cursor, year):
    """Generate the next invoice number for a year, e.g. INV-2026-0001.

    FOR UPDATE is a locking read: it always sees the latest committed rows
    (not the transaction snapshot), so concurrent sales cannot compute the
    same sequence number.
    """
    year = int(year)
    cursor.execute(
        "SELECT invoice_number FROM invoices "
        "WHERE invoice_number LIKE %s FOR UPDATE",
        (f"INV-{year}-%",),
    )
    max_seq = 0
    for row in cursor.fetchall():
        raw = row.get("invoice_number") or ""
        try:
            max_seq = max(max_seq, int(raw.rsplit("-", 1)[1]))
        except (IndexError, ValueError):
            continue
    return f"INV-{year}-{max_seq + 1:04d}"


def _insert_invoice_with_number(
    cursor,
    *,
    customer,
    product,
    quantity,
    price,
    total,
    invoice_date,
    sale_id=None,
    max_attempts=5,
):
    """Insert an invoice with a unique invoice number.

    A MySQL advisory lock (GET_LOCK) serializes number generation across
    connections, and the invoices table has a UNIQUE key on invoice_number
    as the final guarantee. If two requests somehow generate the same number
    at the same moment the second insert fails with a duplicate-key error
    and the number is regenerated (retried a few times).
    """
    year = _year_of(invoice_date)
    cursor.execute(
        "SELECT GET_LOCK('smart_inventory_invoice_number', 10) AS got"
    )
    # fetchall() drains the single-row result (fetchone() alone would leave an
    # "unread result" on the cursor and break the next statement).
    locked = (cursor.fetchall() or [{}])[0].get("got") == 1
    last_error = None
    try:
        for _ in range(max_attempts):
            number = _next_invoice_number(cursor, year)
            try:
                cursor.execute(
                    """
                    INSERT INTO invoices
                        (invoice_number, sale_id, customer, product, quantity,
                         price, total, invoice_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        number,
                        sale_id,
                        customer,
                        product,
                        int(quantity or 0),
                        float(price or 0),
                        float(total or 0),
                        invoice_date,
                    ),
                )
                return cursor.lastrowid
            except IntegrityError as exc:
                if exc.errno == 1062:
                    last_error = exc
                    continue
                raise
        raise last_error
    finally:
        if locked:
            cursor.execute(
                "SELECT RELEASE_LOCK('smart_inventory_invoice_number') AS done"
            )
            cursor.fetchall()


def _next_product_code(cursor):
    """Smallest unused human friendly product code (1, 2, 3, ...).

    The primary key (id) keeps MySQL AUTO_INCREMENT behaviour and is never
    touched. This code is only a display value with a UNIQUE constraint.
    """
    cursor.execute(
        "SELECT product_code FROM products WHERE product_code IS NOT NULL"
    )
    used = {
        int(row["product_code"])
        for row in cursor.fetchall()
        if row["product_code"] is not None
    }
    code = 1
    while code in used:
        code += 1
    return code


def ensure_schema_upgrades():
    """Idempotent, minimal schema upgrades required by application features."""
    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        # ---- invoices: unique invoice number + link to the originating sale ----
        if not _column_exists(cursor, "invoices", "invoice_number"):
            cursor.execute(
                "ALTER TABLE invoices "
                "ADD COLUMN invoice_number VARCHAR(30) NULL AFTER id"
            )
        if not _column_exists(cursor, "invoices", "sale_id"):
            cursor.execute(
                "ALTER TABLE invoices ADD COLUMN sale_id INT NULL AFTER invoice_number"
            )
        if not _index_exists(cursor, "invoices", "uq_invoices_invoice_number"):
            cursor.execute(
                "ALTER TABLE invoices "
                "ADD UNIQUE KEY uq_invoices_invoice_number (invoice_number)"
            )
        if not _index_exists(cursor, "invoices", "uq_invoices_sale_id"):
            cursor.execute(
                "ALTER TABLE invoices ADD UNIQUE KEY uq_invoices_sale_id (sale_id)"
            )
        # Backfill invoice numbers for invoices created before this upgrade.
        cursor.execute(
            "SELECT id, COALESCE(YEAR(invoice_date), %s) AS yr "
            "FROM invoices WHERE invoice_number IS NULL ORDER BY id ASC",
            (date.today().year,),
        )
        for row in cursor.fetchall():
            cursor.execute(
                "UPDATE invoices SET invoice_number = %s WHERE id = %s",
                (_next_invoice_number(cursor, row["yr"]), row["id"]),
            )

        # ---- products: human friendly sequential display code (PK untouched) ----
        if not _column_exists(cursor, "products", "product_code"):
            cursor.execute(
                "ALTER TABLE products ADD COLUMN product_code INT NULL AFTER id"
            )
        if not _index_exists(cursor, "products", "uq_products_product_code"):
            cursor.execute(
                "ALTER TABLE products "
                "ADD UNIQUE KEY uq_products_product_code (product_code)"
            )
        cursor.execute(
            "SELECT id FROM products WHERE product_code IS NULL ORDER BY id ASC"
        )
        for row in cursor.fetchall():
            cursor.execute(
                "UPDATE products SET product_code = %s WHERE id = %s",
                (_next_product_code(cursor), row["id"]),
            )

        # ---- users: optional email + password reset token support ----
        for column_sql in (
            "ALTER TABLE users ADD COLUMN email VARCHAR(150) NULL AFTER username",
            "ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(64) NULL AFTER password_hash",
            "ALTER TABLE users ADD COLUMN reset_token_expires BIGINT NULL AFTER reset_token_hash",
        ):
            column_name = column_sql.split("ADD COLUMN ")[1].split(" ")[0]
            if not _column_exists(cursor, "users", column_name):
                cursor.execute(column_sql)
        if not _index_exists(cursor, "users", "uq_users_email"):
            cursor.execute("ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)")

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def create_token(user, remember=False):
    payload = {
        "user_id": user["id"],
        "username": user["username"],
        "exp": datetime.utcnow()
        + (
            timedelta(days=REMEMBER_ME_DAYS)
            if remember
            else timedelta(hours=JWT_HOURS)
        ),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"message": "Authentication required"}), 401

        token = header.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Session expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid authentication token"}), 401

        g.user = payload
        return fn(*args, **kwargs)

    return wrapper


def smtp_configured():
    """True when the mandatory SMTP settings are present."""
    return bool(SMTP_HOST and SMTP_FROM)


def smtp_help_message():
    return (
        "Email sending is not configured. Set SMTP_HOST, SMTP_PORT, "
        "SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM (and optionally "
        "SMTP_SECURITY) in backend/.env and restart the Flask server."
    )


def build_reset_email(to_email, username, reset_url):
    """Build the professional password reset email (plain text + HTML)."""
    expires_text = f"{RESET_TOKEN_MINUTES} minutes"

    text_body = (
        "Hello,\n"
        "\n"
        "A password reset request was made for your account.\n"
        "\n"
        "Click the password reset link to create a new password:\n"
        f"{reset_url}\n"
        "\n"
        f"The link expires after {expires_text}.\n"
        "\n"
        "If you did not request this, ignore this email.\n"
        "\n"
        "Smart Inventory Management System\n"
    )

    html_body = f"""\
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #222222; line-height: 1.6;">
    <p>Hello,</p>
    <p>A password reset request was made for your account
       (<strong>{username}</strong>).</p>
    <p>
      Click the password reset link to create a new password:<br />
      <a href="{reset_url}">Reset my password</a><br />
      <span style="color: #666666; font-size: 13px;">{reset_url}</span>
    </p>
    <p>The link expires after {expires_text}.</p>
    <p>If you did not request this, ignore this email.</p>
    <p>Smart Inventory Management System</p>
  </body>
</html>
"""

    message = MIMEMultipart("alternative")
    message["Subject"] = EMAIL_SUBJECT
    message["From"] = formataddr(("Smart Inventory Management System", SMTP_FROM))
    message["To"] = formataddr((username, to_email))
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid()
    message.attach(MIMEText(text_body, "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))
    return message


def send_reset_email(to_email, username, reset_url):
    """Send the password reset email through the configured SMTP server.

    Returns None on success. Raises smtplib/OS errors with the exact SMTP
    error message so the operator can see why delivery failed.
    """
    message = build_reset_email(to_email, username, reset_url)

    timeout = 30
    if SMTP_SECURITY == "ssl" or SMTP_PORT == 465:
        with smtplib.SMTP_SSL(
            SMTP_HOST, SMTP_PORT, timeout=timeout,
            context=ssl.create_default_context(),
        ) as server:
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], message.as_string())
        return None

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=timeout) as server:
        server.ehlo()
        if SMTP_SECURITY == "true":
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, [to_email], message.as_string())
    return None


def _valid_email(value):
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value or ""))


def ensure_admin_email():
    """Bind ADMIN_EMAIL to the admin account when it has no email yet."""
    if not ADMIN_EMAIL or not _valid_email(ADMIN_EMAIL):
        return
    try:
        execute(
            """
            UPDATE users
            SET email = %s
            WHERE LOWER(username) = 'admin'
              AND (email IS NULL OR email = '')
            """,
            (ADMIN_EMAIL,),
        )
    except Exception as exc:
        print("Could not bind ADMIN_EMAIL to the admin account:", exc)


def find_product_by_name(name):
    return fetch_one(
        """
        SELECT id, name, stock
        FROM products
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(%s))
        LIMIT 1
        """,
        (name,),
    )


def sales_for_product(product_name):
    return fetch_all(
        """
        SELECT quantity, sale_date
        FROM sales
        WHERE LOWER(TRIM(product)) = LOWER(TRIM(%s))
        ORDER BY sale_date ASC
        """,
        (product_name,),
    )


def prediction_payload(product, days=30):
    forecast = forecast_demand(
        sales_for_product(product["name"]),
        product.get("stock"),
        product.get("minimum_stock"),
        days,
    )
    return {
        "productId": product["id"],
        "productName": product["name"],
        "category": product.get("category"),
        "currentStock": int(product.get("stock") or 0),
        "minimumStock": int(product.get("minimum_stock") or 0),
        **forecast,
    }


init_auth_table()
ensure_schema_upgrades()
ensure_admin_email()


@app.get("/")
def health():
    return jsonify({"message": "Smart Inventory Backend is running!"})


@app.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    user = fetch_one(
        "SELECT id, username, password_hash FROM users WHERE username = %s",
        (username,),
    )
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"message": "Invalid username or password"}), 401

    # "Remember me" extends the signed token lifetime (30 days by default).
    # The token itself is still a short-lived JWT when the box is unchecked.
    remember_me = bool(data.get("remember_me"))
    return jsonify(
        {
            "message": "Login successful",
            "token": create_token(user, remember=remember_me),
            "username": user["username"],
        }
    )


@app.post("/api/auth/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("username") or data.get("email") or "").strip()

    if not identifier:
        return jsonify({"message": "Username or email is required"}), 400

    if not smtp_configured():
        # Never pretend an email was sent: fail loudly with the exact
        # configuration the operator has to provide.
        print(
            "Forgot password requested but SMTP is not configured.\n"
            + smtp_help_message(),
            flush=True,
        )
        return jsonify({"message": smtp_help_message()}), 503

    user = fetch_one(
        """
        SELECT id, username, email
        FROM users
        WHERE LOWER(username) = LOWER(%s)
           OR (email IS NOT NULL AND LOWER(email) = LOWER(%s))
        LIMIT 1
        """,
        (identifier, identifier),
    )

    # Identical response whether or not the account exists, so attackers
    # cannot enumerate registered usernames/emails.
    generic_message = (
        "If the account exists and has a registered email address, a "
        "password reset link has been sent to that email address. "
        f"The link expires after {RESET_TOKEN_MINUTES} minutes."
    )

    if not user:
        return jsonify({"message": generic_message})

    if not user.get("email"):
        # The account exists but no email address is bound to it, so the
        # reset link has nowhere to go. Report it in the server console only
        # (never in the API response, to avoid account enumeration).
        print(
            f"PASSWORD RESET blocked: account '{user['username']}' has no "
            "email address on file. Bind one with POST /api/auth/update-email "
            "(login + current password required) or set ADMIN_EMAIL in "
            "backend/.env before starting Flask.",
            flush=True,
        )
        return jsonify({"message": generic_message})

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires = int((datetime.utcnow() + timedelta(minutes=RESET_TOKEN_MINUTES)).timestamp())
    execute(
        """
        UPDATE users
        SET reset_token_hash = %s, reset_token_expires = %s
        WHERE id = %s
        """,
        (token_hash, expires, user["id"]),
    )

    reset_url = (
        f"{APP_URL}/forgot-password"
        f"?username={quote(user['username'])}&token={quote(token)}"
    )

    try:
        send_reset_email(user["email"], user["username"], reset_url)
    except Exception as exc:
        # Surface the exact SMTP error to the caller and keep a console
        # fallback token so a reset stays possible while SMTP is fixed.
        print(
            "PASSWORD RESET EMAIL FAILED - exact SMTP error:\n"
            f"{exc.__class__.__name__}: {exc}",
            flush=True,
        )
        print(
            "Fallback reset token (valid for "
            f"{RESET_TOKEN_MINUTES} minutes): {token}",
            flush=True,
        )
        return jsonify(
            {
                "message": (
                    "Password reset email could not be sent: "
                    f"{exc.__class__.__name__}: {exc}. Check SMTP_HOST, "
                    "SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM "
                    "in backend/.env."
                )
            }
        ), 500

    print(
        f"PASSWORD RESET email sent to {user['email']} for user "
        f"'{user['username']}' (link expires in {RESET_TOKEN_MINUTES} minutes).",
        flush=True,
    )
    return jsonify(
        {
            "message": (
                "A password reset link has been sent to your registered "
                "email address. "
                f"The link expires after {RESET_TOKEN_MINUTES} minutes."
            )
        }
    )


@app.post("/api/auth/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    token = (data.get("token") or "").strip()
    new_password = data.get("new_password") or ""

    if not username or not token:
        return jsonify({"message": "Username and reset token are required"}), 400
    if len(new_password) < 6:
        return jsonify(
            {"message": "New password must be at least 6 characters long"}
        ), 400

    user = fetch_one(
        """
        SELECT id, reset_token_hash, reset_token_expires
        FROM users
        WHERE LOWER(username) = LOWER(%s)
        LIMIT 1
        """,
        (username,),
    )
    if not user or not user.get("reset_token_hash"):
        return jsonify({"message": "Invalid or expired reset token"}), 400

    expires = user.get("reset_token_expires")
    try:
        expires = int(expires)
    except (TypeError, ValueError):
        expires = 0
    if expires < int(datetime.utcnow().timestamp()):
        return jsonify(
            {"message": "Reset token has expired. Please request a new one."}
        ), 400

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if token_hash != user["reset_token_hash"]:
        return jsonify({"message": "Invalid or expired reset token"}), 400

    execute(
        """
        UPDATE users
        SET password_hash = %s, reset_token_hash = NULL, reset_token_expires = NULL
        WHERE id = %s
        """,
        (generate_password_hash(new_password), user["id"]),
    )
    return jsonify(
        {"message": "Password reset successful. You can now log in with your new password."}
    )


@app.post("/api/auth/update-email")
@require_auth
def update_email():
    """Bind or replace the email address of the logged-in account.

    Requires the current password so a stolen session cannot silently
    redirect future password-reset emails to another address.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    current_password = data.get("current_password") or ""

    if not _valid_email(email):
        return jsonify({"message": "A valid email address is required"}), 400
    if not current_password:
        return jsonify({"message": "Current password is required"}), 400

    user = fetch_one(
        "SELECT id, password_hash FROM users WHERE id = %s",
        (g.user["user_id"],),
    )
    if not user or not check_password_hash(user["password_hash"], current_password):
        return jsonify({"message": "Current password is incorrect"}), 403

    try:
        execute("UPDATE users SET email = %s WHERE id = %s", (email, user["id"]))
    except IntegrityError:
        return jsonify({"message": "This email address is already in use"}), 409

    return jsonify(
        {"message": f"Email address saved for password resets: {email}"}
    )


@app.get("/api/auth/me")
@require_auth
def me():
    return jsonify(
        {
            "userId": g.user["user_id"],
            "username": g.user["username"],
        }
    )


@app.get("/api/products")
@require_auth
def get_products():
    return jsonify(fetch_all("SELECT * FROM products ORDER BY id ASC"))


@app.post("/api/products")
@require_auth
def add_product():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    category = data.get("category")
    price = data.get("price")
    stock = data.get("stock")
    minimum_stock = data.get("minimum_stock", 10)

    if not name or not category or price is None or stock is None:
        return jsonify(
            {"message": "Name, category, price and stock are required"}
        ), 400

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        # Assign the smallest unused human friendly product code (1, 2, 3, ...)
        # while the AUTO_INCREMENT primary key stays untouched. The UNIQUE key
        # on product_code protects against race conditions between requests.
        product_code = None
        last_error = None
        for _ in range(5):
            product_code = _next_product_code(cursor)
            try:
                cursor.execute(
                    """
                    INSERT INTO products
                        (product_code, name, category, price, stock, minimum_stock)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        product_code,
                        name.strip(),
                        category,
                        float(price),
                        int(stock),
                        int(minimum_stock),
                    ),
                )
                break
            except IntegrityError as exc:
                if exc.errno == 1062:
                    last_error = exc
                    continue
                raise
        else:
            raise last_error
        product_id = cursor.lastrowid
        conn.commit()
        return jsonify(
            {
                "message": "Product added successfully",
                "productId": product_id,
                "product_code": product_code,
            }
        ), 201
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


@app.put("/api/products/<int:product_id>")
@require_auth
def update_product(product_id):
    data = request.get_json(silent=True) or {}
    _, count = execute(
        """
        UPDATE products
        SET name = %s, category = %s, price = %s, stock = %s, minimum_stock = %s
        WHERE id = %s
        """,
        (
            data.get("name"),
            data.get("category"),
            float(data.get("price") or 0),
            int(data.get("stock") or 0),
            int(data.get("minimum_stock") if data.get("minimum_stock") is not None else 10),
            product_id,
        ),
    )
    if count == 0:
        return jsonify({"message": "Product not found"}), 404
    return jsonify({"message": "Product updated successfully"})


@app.delete("/api/products/<int:product_id>")
@require_auth
def delete_product(product_id):
    _, count = execute("DELETE FROM products WHERE id = %s", (product_id,))
    if count == 0:
        return jsonify({"message": "Product not found"}), 404
    return jsonify({"message": "Product deleted successfully"})


@app.get("/api/inventory")
@require_auth
def get_inventory():
    rows = fetch_all(
        """
        SELECT
            id, product_code, name, category, stock AS quantity, minimum_stock,
            price,
            CASE
                WHEN stock <= 0 THEN 'Out of Stock'
                WHEN stock <= minimum_stock THEN 'Low Stock'
                ELSE 'In Stock'
            END AS status
        FROM products
        ORDER BY id ASC
        """
    )
    return jsonify(rows)


@app.get("/api/suppliers")
@require_auth
def get_suppliers():
    return jsonify(fetch_all("SELECT * FROM suppliers ORDER BY id ASC"))


@app.post("/api/suppliers")
@require_auth
def add_supplier():
    data = request.get_json(silent=True) or {}
    last_id, _ = execute(
        """
        INSERT INTO suppliers (name, contact, email, address)
        VALUES (%s, %s, %s, %s)
        """,
        (
            data.get("name"),
            data.get("contact"),
            data.get("email"),
            data.get("address"),
        ),
    )
    return jsonify({"message": "Supplier added successfully", "id": last_id}), 201


@app.put("/api/suppliers/<int:supplier_id>")
@require_auth
def update_supplier(supplier_id):
    data = request.get_json(silent=True) or {}
    _, count = execute(
        """
        UPDATE suppliers
        SET name = %s, contact = %s, email = %s, address = %s
        WHERE id = %s
        """,
        (
            data.get("name"),
            data.get("contact"),
            data.get("email"),
            data.get("address"),
            supplier_id,
        ),
    )
    if count == 0:
        return jsonify({"message": "Supplier not found"}), 404
    return jsonify({"message": "Supplier updated successfully"})


@app.delete("/api/suppliers/<int:supplier_id>")
@require_auth
def delete_supplier(supplier_id):
    _, count = execute("DELETE FROM suppliers WHERE id = %s", (supplier_id,))
    if count == 0:
        return jsonify({"message": "Supplier not found"}), 404
    return jsonify({"message": "Supplier deleted successfully"})


@app.get("/api/purchases")
@require_auth
def get_purchases():
    return jsonify(fetch_all("SELECT * FROM purchases ORDER BY id ASC"))


@app.post("/api/purchases")
@require_auth
def add_purchase():
    data = request.get_json(silent=True) or {}
    supplier = data.get("supplier")
    product_name = data.get("product")
    quantity = int(data.get("quantity") or 0)
    price = data.get("price")
    purchase_date = data.get("purchase_date")

    if not supplier or not product_name or quantity <= 0:
        return jsonify(
            {"message": "Supplier, product and valid quantity are required"}
        ), 400

    product = find_product_by_name(product_name)
    if not product:
        return jsonify({"message": "Product not found. Add the product first."}), 404

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO purchases (supplier, product, quantity, price, purchase_date)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (supplier, product["name"], quantity, float(price or 0), purchase_date),
        )
        purchase_id = cursor.lastrowid
        cursor.execute(
            "UPDATE products SET stock = stock + %s WHERE id = %s",
            (quantity, product["id"]),
        )
        conn.commit()
        return jsonify(
            {
                "message": "Purchase added and stock increased successfully",
                "id": purchase_id,
            }
        ), 201
    except Exception as exc:
        conn.rollback()
        print("Error adding purchase:", exc)
        return jsonify({"message": "Error adding purchase"}), 500
    finally:
        cursor.close()
        conn.close()


@app.put("/api/purchases/<int:purchase_id>")
@require_auth
def update_purchase(purchase_id):
    data = request.get_json(silent=True) or {}
    supplier = data.get("supplier")
    product_name = data.get("product")
    new_quantity = int(data.get("quantity") or 0)
    price = data.get("price")
    purchase_date = data.get("purchase_date")

    if not supplier or not product_name or new_quantity <= 0:
        return jsonify(
            {"message": "Supplier, product and valid quantity are required"}
        ), 400

    old = fetch_one(
        "SELECT id, supplier, product, quantity FROM purchases WHERE id = %s",
        (purchase_id,),
    )
    if not old:
        return jsonify({"message": "Purchase not found"}), 404

    new_product = find_product_by_name(product_name)
    if not new_product:
        return jsonify({"message": "Product not found"}), 404

    old_product = find_product_by_name(old["product"])
    old_quantity = int(old["quantity"] or 0)

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        if old_product and old_product["id"] != new_product["id"]:
            cursor.execute(
                "UPDATE products SET stock = stock - %s WHERE id = %s",
                (old_quantity, old_product["id"]),
            )
            cursor.execute(
                "UPDATE products SET stock = stock + %s WHERE id = %s",
                (new_quantity, new_product["id"]),
            )
        else:
            cursor.execute(
                "UPDATE products SET stock = stock + %s WHERE id = %s",
                (new_quantity - old_quantity, new_product["id"]),
            )

        cursor.execute(
            """
            UPDATE purchases
            SET supplier = %s, product = %s, quantity = %s, price = %s, purchase_date = %s
            WHERE id = %s
            """,
            (
                supplier,
                new_product["name"],
                new_quantity,
                float(price or 0),
                purchase_date,
                purchase_id,
            ),
        )
        conn.commit()
        return jsonify({"message": "Purchase and inventory updated successfully"})
    except Exception as exc:
        conn.rollback()
        print("Error updating purchase:", exc)
        return jsonify({"message": "Error updating purchase"}), 500
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/purchases/<int:purchase_id>")
@require_auth
def delete_purchase(purchase_id):
    purchase = fetch_one(
        "SELECT product, quantity FROM purchases WHERE id = %s",
        (purchase_id,),
    )
    if not purchase:
        return jsonify({"message": "Purchase not found"}), 404

    product = find_product_by_name(purchase["product"])
    quantity = int(purchase["quantity"] or 0)

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        if product:
            cursor.execute(
                "UPDATE products SET stock = stock - %s WHERE id = %s",
                (quantity, product["id"]),
            )
        cursor.execute("DELETE FROM purchases WHERE id = %s", (purchase_id,))
        conn.commit()
        return jsonify(
            {"message": "Purchase deleted and stock decreased successfully"}
        )
    except Exception as exc:
        conn.rollback()
        print("Error deleting purchase:", exc)
        return jsonify({"message": "Error deleting purchase"}), 500
    finally:
        cursor.close()
        conn.close()


@app.get("/api/sales")
@require_auth
def get_sales():
    return jsonify(fetch_all("SELECT * FROM sales ORDER BY id ASC"))


@app.post("/api/sales")
@require_auth
def add_sale():
    data = request.get_json(silent=True) or {}
    customer = data.get("customer")
    product_name = data.get("product")
    quantity = int(data.get("quantity") or 0)
    price = data.get("price")
    sale_date = data.get("sale_date")

    if not customer or not product_name or quantity <= 0:
        return jsonify(
            {"message": "Customer, product and valid quantity are required"}
        ), 400

    product = find_product_by_name(product_name)
    if not product:
        return jsonify({"message": "Product not found. Add the product first."}), 404

    current_stock = int(product["stock"] or 0)
    if quantity > current_stock:
        return jsonify(
            {
                "message": (
                    f"Insufficient stock. Available stock for {product['name']}: "
                    f"{current_stock}"
                )
            }
        ), 400

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO sales (customer, product, quantity, price, sale_date)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (customer, product["name"], quantity, float(price or 0), sale_date),
        )
        sale_id = cursor.lastrowid

        # Race-safe stock decrement: the guard in the WHERE clause prevents the
        # stock from going negative even with concurrent sale requests.
        cursor.execute(
            "UPDATE products SET stock = stock - %s WHERE id = %s AND stock >= %s",
            (quantity, product["id"], quantity),
        )
        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT stock FROM products WHERE id = %s", (product["id"],)
            )
            latest = cursor.fetchone()
            available = int(latest["stock"] or 0) if latest else 0
            conn.rollback()
            return jsonify(
                {
                    "message": (
                        f"Insufficient stock. Available stock for "
                        f"{product['name']}: {available}"
                    )
                }
            ), 400

        # Automatic invoice generation for this sale inside the SAME
        # transaction. If the invoice cannot be created the whole sale is
        # rolled back, so a sale is never saved without its invoice.
        # The UNIQUE key on invoices.sale_id guarantees exactly one invoice
        # per sale (duplicate invoice protection).
        unit_price = float(price or 0)
        invoice_id = _insert_invoice_with_number(
            cursor,
            customer=customer,
            product=product["name"],
            quantity=quantity,
            price=unit_price,
            total=round(unit_price * quantity, 2),
            invoice_date=sale_date,
            sale_id=sale_id,
        )

        conn.commit()
        return jsonify(
            {
                "message": (
                    "Sale added, stock decreased and invoice generated "
                    "automatically"
                ),
                "id": sale_id,
                "invoice_id": invoice_id,
            }
        ), 201
    except Exception as exc:
        conn.rollback()
        print("Error adding sale:", exc)
        return jsonify({"message": "Error adding sale"}), 500
    finally:
        cursor.close()
        conn.close()


@app.put("/api/sales/<int:sale_id>")
@require_auth
def update_sale(sale_id):
    data = request.get_json(silent=True) or {}
    customer = data.get("customer")
    product_name = data.get("product")
    new_quantity = int(data.get("quantity") or 0)
    price = data.get("price")
    sale_date = data.get("sale_date")

    if not customer or not product_name or new_quantity <= 0:
        return jsonify(
            {"message": "Customer, product and valid quantity are required"}
        ), 400

    old = fetch_one(
        "SELECT id, customer, product, quantity FROM sales WHERE id = %s",
        (sale_id,),
    )
    if not old:
        return jsonify({"message": "Sale not found"}), 404

    new_product = find_product_by_name(product_name)
    if not new_product:
        return jsonify({"message": "Product not found"}), 404

    old_product = find_product_by_name(old["product"])
    if not old_product:
        return jsonify({"message": "Old product not found"}), 404

    old_quantity = int(old["quantity"] or 0)

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        if old_product["id"] != new_product["id"]:
            cursor.execute(
                "UPDATE products SET stock = stock + %s WHERE id = %s",
                (old_quantity, old_product["id"]),
            )
            cursor.execute(
                "SELECT stock FROM products WHERE id = %s",
                (new_product["id"],),
            )
            latest = cursor.fetchone()
            available = int(latest["stock"] if latest else 0)
            if new_quantity > available:
                conn.rollback()
                return jsonify(
                    {
                        "message": (
                            f"Insufficient stock. Available stock for "
                            f"{new_product['name']}: {available}"
                        )
                    }
                ), 400
            cursor.execute(
                "UPDATE products SET stock = stock - %s WHERE id = %s",
                (new_quantity, new_product["id"]),
            )
        else:
            difference = old_quantity - new_quantity
            available = int(new_product["stock"] or 0)
            if difference < 0 and abs(difference) > available:
                return jsonify(
                    {
                        "message": (
                            f"Insufficient stock. Available stock for "
                            f"{new_product['name']}: {available}"
                        )
                    }
                ), 400
            cursor.execute(
                "UPDATE products SET stock = stock + %s WHERE id = %s",
                (difference, new_product["id"]),
            )

        cursor.execute(
            """
            UPDATE sales
            SET customer = %s, product = %s, quantity = %s, price = %s, sale_date = %s
            WHERE id = %s
            """,
            (
                customer,
                new_product["name"],
                new_quantity,
                float(price or 0),
                sale_date,
                sale_id,
            ),
        )

        # Keep the automatically generated invoice in sync with the sale.
        cursor.execute("SELECT id FROM invoices WHERE sale_id = %s", (sale_id,))
        linked_invoice = cursor.fetchone()
        if linked_invoice:
            cursor.execute(
                """
                UPDATE invoices
                SET customer = %s, product = %s, quantity = %s, price = %s,
                    total = %s, invoice_date = %s
                WHERE id = %s
                """,
                (
                    customer,
                    new_product["name"],
                    new_quantity,
                    float(price or 0),
                    round(float(price or 0) * new_quantity, 2),
                    sale_date,
                    linked_invoice["id"],
                ),
            )

        conn.commit()
        return jsonify({"message": "Sale and inventory updated successfully"})
    except Exception as exc:
        conn.rollback()
        print("Error updating sale:", exc)
        return jsonify({"message": "Error updating sale"}), 500
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/sales/<int:sale_id>")
@require_auth
def delete_sale(sale_id):
    sale = fetch_one(
        "SELECT product, quantity FROM sales WHERE id = %s",
        (sale_id,),
    )
    if not sale:
        return jsonify({"message": "Sale not found"}), 404

    product = find_product_by_name(sale["product"])
    quantity = int(sale["quantity"] or 0)

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        if product:
            cursor.execute(
                "UPDATE products SET stock = stock + %s WHERE id = %s",
                (quantity, product["id"]),
            )
        # Remove the invoice that was generated automatically for this sale so
        # no orphaned invoice remains. Manually created invoices (no sale_id)
        # are never touched.
        cursor.execute("DELETE FROM invoices WHERE sale_id = %s", (sale_id,))
        cursor.execute("DELETE FROM sales WHERE id = %s", (sale_id,))
        conn.commit()
        return jsonify({"message": "Sale deleted and stock restored successfully"})
    except Exception as exc:
        conn.rollback()
        print("Error deleting sale:", exc)
        return jsonify({"message": "Error deleting sale"}), 500
    finally:
        cursor.close()
        conn.close()


@app.get("/api/low-stock-alerts")
@require_auth
def low_stock_alerts():
    products = fetch_all(
        """
        SELECT id, name, category, stock, minimum_stock, price
        FROM products
        WHERE stock <= minimum_stock
        ORDER BY stock ASC
        """
    )
    results = []
    for product in products:
        forecast = forecast_demand(
            sales_for_product(product["name"]),
            product.get("stock"),
            product.get("minimum_stock"),
            30,
        )
        results.append(
            {
                **product,
                "recommended_quantity": forecast["recommendedQuantity"],
                "status": forecast["status"],
                "recommendation": forecast["recommendation"],
            }
        )
    return jsonify(results)


@app.get("/api/invoices")
@require_auth
def get_invoices():
    return jsonify(fetch_all("SELECT * FROM invoices ORDER BY id ASC"))


@app.post("/api/invoices")
@require_auth
def add_invoice():
    data = request.get_json(silent=True) or {}

    conn = get_conn()
    cursor = conn.cursor(dictionary=True)
    try:
        # Manually created invoices keep working; they simply get a unique
        # invoice number generated (they are not linked to any sale).
        invoice_id = _insert_invoice_with_number(
            cursor,
            customer=data.get("customer"),
            product=data.get("product"),
            quantity=int(data.get("quantity") or 0),
            price=float(data.get("price") or 0),
            total=float(data.get("total") or 0),
            invoice_date=data.get("invoice_date"),
            sale_id=None,
        )
        conn.commit()
        return jsonify(
            {"message": "Invoice added successfully", "id": invoice_id}
        ), 201
    except Exception as exc:
        conn.rollback()
        print("Error adding invoice:", exc)
        return jsonify({"message": "Error adding invoice"}), 500
    finally:
        cursor.close()
        conn.close()


@app.put("/api/invoices/<int:invoice_id>")
@require_auth
def update_invoice(invoice_id):
    data = request.get_json(silent=True) or {}
    _, count = execute(
        """
        UPDATE invoices
        SET customer = %s, product = %s, quantity = %s, price = %s,
            total = %s, invoice_date = %s
        WHERE id = %s
        """,
        (
            data.get("customer"),
            data.get("product"),
            int(data.get("quantity") or 0),
            float(data.get("price") or 0),
            float(data.get("total") or 0),
            data.get("invoice_date"),
            invoice_id,
        ),
    )
    if count == 0:
        return jsonify({"message": "Invoice not found"}), 404
    return jsonify({"message": "Invoice updated successfully"})


@app.delete("/api/invoices/<int:invoice_id>")
@require_auth
def delete_invoice(invoice_id):
    _, count = execute("DELETE FROM invoices WHERE id = %s", (invoice_id,))
    if count == 0:
        return jsonify({"message": "Invoice not found"}), 404
    return jsonify({"message": "Invoice deleted successfully"})


@app.get("/api/ai-stock-prediction/<int:product_id>")
@require_auth
def ai_stock_prediction(product_id):
    product = fetch_one(
        """
        SELECT id, name, category, stock, minimum_stock, price
        FROM products
        WHERE id = %s
        """,
        (product_id,),
    )
    if not product:
        return jsonify({"message": "Product not found"}), 404

    days = request.args.get("days", 30)
    try:
        days = int(days)
    except (TypeError, ValueError):
        days = 30

    return jsonify(prediction_payload(product, days))


@app.get("/api/procurement-recommendations")
@require_auth
def procurement_recommendations():
    days = request.args.get("days", 30)
    try:
        days = int(days)
    except (TypeError, ValueError):
        days = 30

    products = fetch_all(
        """
        SELECT id, name, category, stock, minimum_stock, price
        FROM products
        ORDER BY id ASC
        """
    )
    recommendations = []
    for product in products:
        payload = prediction_payload(product, days)
        if payload["recommendedQuantity"] > 0 or payload["status"] != "Sufficient":
            recommendations.append(payload)

    recommendations.sort(
        key=lambda item: (
            0 if item["status"] == "Critical" else 1 if item["status"] == "Low Stock" else 2,
            -item["recommendedQuantity"],
        )
    )
    return jsonify(recommendations)


@app.get("/api/reports/summary")
@require_auth
def reports_summary():
    sales = fetch_one(
        """
        SELECT
            COALESCE(SUM(quantity * price), 0) AS totalSales,
            COALESCE(SUM(quantity), 0) AS itemsSold
        FROM sales
        """
    )
    purchases = fetch_one(
        """
        SELECT
            COALESCE(SUM(quantity * price), 0) AS totalPurchases,
            COALESCE(SUM(quantity), 0) AS itemsPurchased
        FROM purchases
        """
    )
    return jsonify(
        {
            "totalSales": float(sales["totalSales"] if sales else 0),
            "totalPurchases": float(purchases["totalPurchases"] if purchases else 0),
            "itemsSold": float(sales["itemsSold"] if sales else 0),
            "itemsPurchased": float(purchases["itemsPurchased"] if purchases else 0),
        }
    )


@app.get("/api/reports/sales")
@require_auth
def reports_sales():
    return jsonify(
        fetch_all(
            """
            SELECT id, customer, product, quantity, price,
                   (quantity * price) AS amount, sale_date
            FROM sales
            ORDER BY id ASC
            """
        )
    )


@app.get("/api/reports/purchases")
@require_auth
def reports_purchases():
    return jsonify(
        fetch_all(
            """
            SELECT id, supplier, product, quantity, price,
                   (quantity * price) AS amount, purchase_date
            FROM purchases
            ORDER BY id ASC
            """
        )
    )


@app.get("/api/dashboard")
@require_auth
def dashboard():
    totals = {
        "totalProducts": fetch_one("SELECT COUNT(*) AS total FROM products")["total"],
        "totalStock": fetch_one(
            "SELECT COALESCE(SUM(stock), 0) AS total FROM products"
        )["total"],
        "lowStockItems": fetch_one(
            "SELECT COUNT(*) AS total FROM products WHERE stock <= minimum_stock"
        )["total"],
        "totalSales": fetch_one(
            "SELECT COALESCE(SUM(quantity * price), 0) AS total FROM sales"
        )["total"],
        "totalPurchases": fetch_one(
            "SELECT COALESCE(SUM(quantity * price), 0) AS total FROM purchases"
        )["total"],
        "itemsSold": fetch_one(
            "SELECT COALESCE(SUM(quantity), 0) AS total FROM sales"
        )["total"],
        "itemsPurchased": fetch_one(
            "SELECT COALESCE(SUM(quantity), 0) AS total FROM purchases"
        )["total"],
    }

    sales_trend = fetch_all(
        """
        SELECT DATE(sale_date) AS date, COALESCE(SUM(quantity * price), 0) AS amount
        FROM sales
        GROUP BY DATE(sale_date)
        ORDER BY date ASC
        """
    )
    purchase_trend = fetch_all(
        """
        SELECT DATE(purchase_date) AS date,
               COALESCE(SUM(quantity * price), 0) AS amount
        FROM purchases
        GROUP BY DATE(purchase_date)
        ORDER BY date ASC
        """
    )

    products = fetch_all(
        """
        SELECT id, name, category, stock, minimum_stock, price
        FROM products
        ORDER BY id ASC
        """
    )
    recommendations = []
    for product in products:
        payload = prediction_payload(product, 30)
        if payload["recommendedQuantity"] > 0:
            recommendations.append(payload)

    recommendations.sort(
        key=lambda item: (
            0 if item["status"] == "Critical" else 1 if item["status"] == "Low Stock" else 2,
            -item["recommendedQuantity"],
        )
    )

    return jsonify(
        {
            "totalProducts": int(totals["totalProducts"] or 0),
            "totalStock": int(totals["totalStock"] or 0),
            "lowStockItems": int(totals["lowStockItems"] or 0),
            "totalSales": float(totals["totalSales"] or 0),
            "totalPurchases": float(totals["totalPurchases"] or 0),
            "itemsSold": int(totals["itemsSold"] or 0),
            "itemsPurchased": int(totals["itemsPurchased"] or 0),
            "salesTrend": sales_trend,
            "purchaseTrend": purchase_trend,
            "recommendations": recommendations[:8],
        }
    )


if __name__ == "__main__":
    print("======================================")
    print("Smart Inventory Flask Backend Started")
    print("Server running on http://localhost:5001")
    print("======================================")
    app.run(host="0.0.0.0", port=5001, debug=True)
