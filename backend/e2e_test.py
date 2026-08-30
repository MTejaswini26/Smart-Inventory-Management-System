"""End-to-end test harness for SmartInventorySystem.

Runs a real local SMTP sink, the real Flask app (real MySQL), and drives the
real HTTP API. Writes results to e2e_results.txt.
"""
import email as email_lib
import json
import os
import re
import socket
import sys
import threading
import time
import urllib.request
import urllib.error

BACKEND = r"c:\Users\Nagendra\SmartInventorySystem\backend"
sys.path.insert(0, BACKEND)
os.chdir(BACKEND)

# ---- test configuration (set BEFORE importing app) ------------------------
os.environ["SMTP_HOST"] = "127.0.0.1"
os.environ["SMTP_PORT"] = "1025"
os.environ["SMTP_SECURITY"] = "false"
os.environ["SMTP_USERNAME"] = ""
os.environ["SMTP_PASSWORD"] = ""
os.environ["SMTP_FROM"] = "e2e-test@smartinventory.local"
os.environ["APP_URL"] = "http://localhost:5173"
os.environ["ADMIN_EMAIL"] = "admin@smartinventory.test"

BASE = "http://127.0.0.1:5002"
OUT_PATH = os.path.join(BACKEND, "e2e_results.txt")
OUT = open(OUT_PATH, "w", encoding="utf-8")


def log(*args):
    OUT.write(" ".join(str(a) for a in args) + "\n")
    OUT.flush()
    print(" ".join(str(a) for a in args))


FAILURES = []


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    if not condition:
        FAILURES.append(f"{name}: {detail}")
    log(f"[{status}] {name}" + (f" -- {detail}" if detail and not condition else ""))


# ---------------------------------------------------------------------------
# Mini SMTP sink (captures every message the app sends)
# ---------------------------------------------------------------------------
class MiniSMTPServer(threading.Thread):
    def __init__(self, host="127.0.0.1", port=1025):
        super().__init__(daemon=True)
        self.host, self.port = host, port
        self.messages = []
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind((self.host, self.port))
        self.sock.listen(5)
        self._stop = False

    def run(self):
        self.sock.settimeout(0.5)
        while not self._stop:
            try:
                conn, _ = self.sock.accept()
            except socket.timeout:
                continue
            try:
                self._handle(conn)
            except Exception as exc:
                log(f"SMTP sink error: {exc}")
            finally:
                try:
                    conn.close()
                except Exception:
                    pass

    def _handle(self, conn):
        f = conn.makefile("rb")
        conn.sendall(b"220 localhost ESMTP e2e-sink\r\n")
        data_lines = []
        in_data = False
        while True:
            line = f.readline()
            if not line:
                return
            text = line.decode("utf-8", "replace").rstrip("\r\n")
            if in_data:
                if text == ".":
                    self.messages.append("\r\n".join(data_lines))
                    data_lines = []
                    in_data = False
                    conn.sendall(b"250 OK\r\n")
                else:
                    data_lines.append(text)
                continue
            cmd = text.upper()
            if cmd.startswith("EHLO"):
                conn.sendall(b"250-localhost\r\n250 OK\r\n")
            elif cmd.startswith("HELO"):
                conn.sendall(b"250 localhost\r\n")
            elif cmd.startswith(("MAIL FROM", "RCPT TO", "RSET", "NOOP")):
                conn.sendall(b"250 OK\r\n")
            elif cmd.startswith("DATA"):
                conn.sendall(b"354 End data with <CR><LF>.<CR><LF>\r\n")
                in_data = True
            elif cmd.startswith("QUIT"):
                conn.sendall(b"221 Bye\r\n")
                return
            else:
                conn.sendall(b"250 OK\r\n")

    def stop(self):
        self._stop = True
        self.sock.close()


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------
TOKEN = {"value": None}


def http(method, path, body=None, auth=True):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if auth and TOKEN["value"]:
        req.add_header("Authorization", f"Bearer {TOKEN['value']}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.loads(exc.read().decode())
        except Exception:
            return exc.code, {}
    except Exception as exc:
        return 0, {"message": f"{exc.__class__.__name__}: {exc}"}


def wait_ready(seconds=30):
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(BASE + "/", timeout=3) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False


# ---------------------------------------------------------------------------
# Start everything
# ---------------------------------------------------------------------------
import mysql.connector  # noqa: E402

sink = MiniSMTPServer()
sink.start()
log("SMTP sink listening on 127.0.0.1:1025")

import app as app_module  # noqa: E402

flask_thread = threading.Thread(
    target=lambda: app_module.app.run(
        host="127.0.0.1", port=5002, debug=False, use_reloader=False, threaded=True
    ),
    daemon=True,
)
flask_thread.start()

check("Flask test server ready on :5002", wait_ready())

conn = mysql.connector.connect(
    host="localhost", user="root", password="Tej@$wini_4726",
    database="smart_inventory", autocommit=True,
)
cur = conn.cursor(dictionary=True)

cur.execute(
    "SELECT (SELECT COUNT(*) FROM products) AS p, "
    "(SELECT COUNT(*) FROM sales) AS s, "
    "(SELECT COUNT(*) FROM invoices) AS i"
)
row = cur.fetchone()
baseline = {"products": row["p"], "sales": row["s"], "invoices": row["i"]}
log(f"Baseline DB counts: {baseline}")

log()
log("=" * 30, "T0: LOGIN", "=" * 30)
status, body = http("POST", "/api/auth/login", {"username": "admin", "password": "admin123"}, auth=False)
check("login admin/admin123 -> 200", status == 200, f"status={status} body={body}")
TOKEN["value"] = body.get("token")

log()
log("=" * 25, "T1: AI PREDICTION (3 products)", "=" * 25)
for pid, expect_history, label in ((3, True, "Laptop/substantial"), (6, True, "Mouse/sparse"), (5, False, "WirelessKeyboard/none")):
    status, pred = http("GET", f"/api/ai-stock-prediction/{pid}?days=30")
    check(f"prediction product {pid} ({label}) -> 200", status == 200, f"{status} {pred}")
    if status != 200:
        continue
    int_fields = ["averageDailySales", "expectedSales", "remainingStock", "recommendedQuantity", "currentStock", "minimumStock", "totalSales", "predictionDays", "historyDays"]
    all_int = all(isinstance(pred.get(f), int) and not isinstance(pred.get(f), bool) for f in int_fields)
    check(f"product {pid}: all quantity fields are INTEGER", all_int, json.dumps({f: pred.get(f) for f in int_fields}))
    check(f"product {pid}: hasSalesHistory == {expect_history}", pred.get("hasSalesHistory") == expect_history, f"got {pred.get('hasSalesHistory')}")
    if expect_history:
        check(f"product {pid}: expectedSales > 0", pred.get("expectedSales", 0) > 0, f"expectedSales={pred.get('expectedSales')}")
        check(f"product {pid}: real R^2 calculated (not None)", pred.get("rSquared") is not None, f"rSquared={pred.get('rSquared')}")
    else:
        check(f"product {pid}: R^2 is N/A (None)", pred.get("rSquared") is None, f"rSquared={pred.get('rSquared')}")
        check(f"product {pid}: no-sales note present", "No historical sales found" in (pred.get("historyNote") or ""), pred.get("historyNote"))
    log(f"    product {pid} ({label}): " + json.dumps({k: pred.get(k) for k in ("productName", "averageDailySales", "expectedSales", "remainingStock", "recommendedQuantity", "rSquared", "hasSalesHistory", "model")}))

log()
log("=" * 22, "T2: PRODUCTS SEQUENTIAL CODES", "=" * 22)
status, products = http("GET", "/api/products")
codes_before = [p.get("product_code") for p in products]
check("GET /api/products -> 200", status == 200, str(status))
check("existing product codes are sequential 1..n", codes_before == list(range(1, len(codes_before) + 1)), f"codes={codes_before}")
log(f"    codes before: {codes_before}")

status, added = http("POST", "/api/products", {"name": "E2E-TEST Product", "category": "E2E", "price": 10, "stock": 50, "minimum_stock": 10})
check("POST /api/products -> 201", status == 201, f"{status} {added}")
e2e_product_code = added.get("product_code")
e2e_product_id = added.get("productId")
check("new product received next sequential code", e2e_product_code == max([c for c in codes_before if c is not None]) + 1, f"new code={e2e_product_code}, previous max={max(codes_before)}")
log(f"    new product id={e2e_product_id} code={e2e_product_code}")

log()
log("=" * 22, "T3: SALE -> INVENTORY -> INVOICE", "=" * 22)
TODAY = time.strftime("%Y-%m-%d")
status, sale1 = http("POST", "/api/sales", {"customer": "E2E-TEST Customer", "product": "E2E-TEST Product", "quantity": 2, "price": 10, "sale_date": TODAY})
check("POST /api/sales (sale 1) -> 201", status == 201, f"{status} {sale1}")
sale1_id = sale1.get("id")

status, products = http("GET", "/api/products")
stock_now = next((p["stock"] for p in products if p["id"] == e2e_product_id), None)
check("inventory updated after sale (50 -> 48)", stock_now == 48, f"stock={stock_now}")

status, invoices = http("GET", "/api/invoices")
inv1 = next((i for i in invoices if i.get("sale_id") == sale1_id), None)
check("invoice auto-created for sale 1", inv1 is not None, json.dumps([i.get("sale_id") for i in invoices]))
if inv1:
    check("invoice_number format INV-YYYY-NNNN", bool(re.fullmatch(r"INV-\d{4}-\d{4}", inv1.get("invoice_number") or "")), f"got {inv1.get('invoice_number')}")
    for field, want in (("customer", "E2E-TEST Customer"), ("product", "E2E-TEST Product"), ("quantity", 2)):
        check(f"invoice field {field} == {want}", inv1.get(field) == want, f"got {inv1.get(field)}")
    check("invoice unit price == 10", float(inv1.get("price")) == 10.0, f"got {inv1.get('price')}")
    check("invoice total == 20", float(inv1.get("total")) == 20.0, f"got {inv1.get('total')}")
    check("invoice_date == sale date", str(inv1.get("invoice_date"))[:10] == TODAY, f"got {inv1.get('invoice_date')}")
    cur.execute("SELECT COUNT(*) AS c FROM invoices WHERE sale_id = %s", (sale1_id,))
    check("exactly ONE invoice for sale 1 (duplicate protection)", cur.fetchone()["c"] == 1)
    log(f"    invoice 1: {inv1.get('invoice_number')} (sale_id={sale1_id})")

log()
log("=" * 22, "T4: SECOND SALE -> UNIQUE NUMBER", "=" * 22)
status, sale2 = http("POST", "/api/sales", {"customer": "E2E-TEST Customer", "product": "E2E-TEST Product", "quantity": 1, "price": 10, "sale_date": TODAY})
check("POST /api/sales (sale 2) -> 201", status == 201, f"{status} {sale2}")
sale2_id = sale2.get("id")
status, invoices = http("GET", "/api/invoices")
inv2 = next((i for i in invoices if i.get("sale_id") == sale2_id), None)
check("invoice auto-created for sale 2", inv2 is not None)
if inv1 and inv2:
    check("invoice number 2 differs from 1", inv2.get("invoice_number") != inv1.get("invoice_number"), f"{inv1.get('invoice_number')} vs {inv2.get('invoice_number')}")
    check("invoice numbers globally unique", len({i["invoice_number"] for i in invoices}) == len(invoices))
    log(f"    invoice 2: {inv2.get('invoice_number')} (sale_id={sale2_id})")

log()
log("=" * 20, "T5: RAPID DOUBLE-SUBMIT (2 sales)", "=" * 20)
results = []


def fire_sale():
    results.append(http("POST", "/api/sales", {"customer": "E2E-TEST Customer", "product": "E2E-TEST Product", "quantity": 1, "price": 10, "sale_date": TODAY}))


threads = [threading.Thread(target=fire_sale) for _ in range(2)]
for t in threads:
    t.start()
for t in threads:
    t.join()
check("both rapid sale submissions handled", len(results) == 2, str(results))
cur.execute(
    "SELECT COUNT(*) AS c FROM invoices WHERE sale_id IN (%s, %s)",
    (results[0][1].get("id"), results[1][1].get("id")),
)
cnt = cur.fetchone()["c"]
check("rapid submissions: every sale still has exactly one invoice", cnt == 2, f"invoices for the 2 sales={cnt}")
cur.execute("SELECT COUNT(*) AS total, COUNT(DISTINCT invoice_number) AS uniq FROM invoices")
r = cur.fetchone()
check("invoice_number uniqueness across whole table", r["total"] == r["uniq"], json.dumps(r))
log(f"    rapid sale results: {[(s, b.get('invoice_id')) for s, b in results]}")

log()
log("=" * 20, "T6: DELETE PRODUCT -> CODE REUSED", "=" * 20)
status, _ = http("DELETE", f"/api/products/{e2e_product_id}")
check("DELETE /api/products -> 200", status == 200, str(status))
status, added2 = http("POST", "/api/products", {"name": "E2E-TEST Product B", "category": "E2E", "price": 5, "stock": 30, "minimum_stock": 5})
check("re-added product takes freed sequential code", added2.get("product_code") == e2e_product_code, f"got {added2.get('product_code')}")
e2e_product_b_id = added2.get("productId")
log(f"    product B: id={e2e_product_b_id} code={added2.get('product_code')} (freed code reused: {added2.get('product_code') == e2e_product_code})")

log()
log("=" * 20, "T7: FORGOT PASSWORD -> REAL EMAIL", "=" * 20)
sink.messages.clear()
status, fp = http("POST", "/api/auth/forgot-password", {"username": "admin"}, auth=False)
check("POST /api/auth/forgot-password -> 200", status == 200, f"{status} {fp}")
check("no token leaked in API response", "token" not in json.dumps(fp).lower(), json.dumps(fp))
time.sleep(0.5)
check("email actually sent through SMTP (sink captured 1)", len(sink.messages) == 1, f"captured={len(sink.messages)}")
reset_token = None
if sink.messages:
    msg = email_lib.message_from_string(sink.messages[-1])
    subject = msg.get("Subject", "")
    frm = msg.get("From", "")
    to = msg.get("To", "")
    check("email subject exact", subject == "Smart Inventory Management System - Password Reset", subject)
    check("email from = SMTP_FROM", "e2e-test@smartinventory.local" in frm, frm)
    check("email to = registered address", "admin@smartinventory.test" in to, to)
    text_body = ""
    for part in msg.walk():
        if part.get_content_type() == "text/plain":
            text_body = part.get_payload(decode=True).decode("utf-8", "replace")
    check("body contains required sentence", "A password reset request was made for your account." in text_body)
    check("body contains expiry line", "expires after 15 minutes" in text_body)
    check("body contains ignore notice", "If you did not request this, ignore this email." in text_body)
    check("body signed Smart Inventory Management System", text_body.rstrip().endswith("Smart Inventory Management System"))
    m = re.search(r"(http://localhost:5173/forgot-password\?username=admin&token=\S+)", text_body)
    check("body contains real reset URL", m is not None, text_body)
    if m:
        reset_token = m.group(1).split("token=")[1]
        log(f"    captured reset URL: {m.group(1)}")

log()
log("=" * 20, "T8: RESET LINK WORKS / SECURITY", "=" * 20)
if reset_token:
    status, rp = http("POST", "/api/auth/reset-password", {"username": "admin", "token": reset_token, "new_password": "NewPass456!"}, auth=False)
    check("reset with emailed token -> 200", status == 200, f"{status} {rp}")
    status, lg = http("POST", "/api/auth/login", {"username": "admin", "password": "NewPass456!"}, auth=False)
    check("login with NEW password -> 200", status == 200, f"{status} {lg}")
    status, _ = http("POST", "/api/auth/login", {"username": "admin", "password": "admin123"}, auth=False)
    check("login with OLD password -> 401", status == 401, str(status))
    status, _ = http("POST", "/api/auth/reset-password", {"username": "admin", "token": reset_token, "new_password": "Hacked999!"}, auth=False)
    check("token reuse rejected -> 400", status == 400, str(status))
    status, _ = http("POST", "/api/auth/reset-password", {"username": "admin", "token": "bogus-token", "new_password": "Whatever1!"}, auth=False)
    check("invalid token rejected -> 400", status == 400, str(status))

    # restore the original password through the same email flow
    sink.messages.clear()
    status, _ = http("POST", "/api/auth/forgot-password", {"username": "admin"}, auth=False)
    time.sleep(0.5)
    msg = email_lib.message_from_string(sink.messages[-1])
    text_body = ""
    for part in msg.walk():
        if part.get_content_type() == "text/plain":
            text_body = part.get_payload(decode=True).decode("utf-8", "replace")
    token2 = re.search(r"token=(\S+)", text_body).group(1)
    status, _ = http("POST", "/api/auth/reset-password", {"username": "admin", "token": token2, "new_password": "admin123"}, auth=False)
    check("password restored to admin123 via email flow", status == 200, str(status))
    status, _ = http("POST", "/api/auth/login", {"username": "admin", "password": "admin123"}, auth=False)
    check("login admin/admin123 works again", status == 200, str(status))
else:
    check("reset flow skipped (no token captured)", False)

log()
log("=" * 20, "T9: UPDATE-EMAIL ENDPOINT", "=" * 20)
status, ue = http("POST", "/api/auth/update-email", {"email": "changed@smartinventory.test", "current_password": "wrongpw"})
check("update-email with wrong current password -> 403", status == 403, f"{status} {ue}")
status, ue = http("POST", "/api/auth/update-email", {"email": "changed@smartinventory.test", "current_password": "admin123"})
check("update-email with correct password -> 200", status == 200, f"{status} {ue}")
cur.execute("SELECT email FROM users WHERE username = 'admin'")
check("email persisted in DB", cur.fetchone()["email"] == "changed@smartinventory.test")

log()
log("=" * 20, "T10: REGRESSION ALL MODULES", "=" * 20)
for path in ("/api/auth/me", "/api/products", "/api/inventory", "/api/suppliers", "/api/purchases", "/api/sales", "/api/invoices", "/api/low-stock-alerts", "/api/procurement-recommendations", "/api/reports/summary", "/api/reports/sales", "/api/reports/purchases", "/api/dashboard"):
    status, _b = http("GET", path)
    check(f"GET {path} -> 200", status == 200, str(status))

log()
log("=" * 20, "CLEANUP TEST DATA", "=" * 20)
cur.execute("DELETE FROM invoices WHERE customer LIKE 'E2E-TEST%'")
cur.execute("DELETE FROM sales WHERE customer LIKE 'E2E-TEST%'")
cur.execute("DELETE FROM products WHERE name LIKE 'E2E-TEST%'")
cur.execute("UPDATE users SET email = NULL WHERE username = 'admin'")
conn.commit()
cur.execute(
    "SELECT (SELECT COUNT(*) FROM products) AS p, "
    "(SELECT COUNT(*) FROM sales) AS s, "
    "(SELECT COUNT(*) FROM invoices) AS i, "
    "(SELECT email FROM users WHERE username='admin') AS email, "
    "(SELECT COUNT(*) FROM invoices WHERE invoice_number IS NULL) AS missing_numbers"
)
r = cur.fetchone()
check("DB restored to baseline counts", (r["p"], r["s"], r["i"]) == (baseline["products"], baseline["sales"], baseline["invoices"]), json.dumps(r))
check("all invoices still have invoice_number", r["missing_numbers"] == 0, str(r["missing_numbers"]))
log(f"    after cleanup: {json.dumps(r)}")

conn.close()
sink.stop()

log()
log("=" * 20, "SUMMARY", "=" * 20)
log(f"TOTAL FAILURES: {len(FAILURES)}")
for f in FAILURES:
    log(f"  - {f}")
log("E2E DONE")
OUT.close()





