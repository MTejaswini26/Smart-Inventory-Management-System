"""Verification harness for the Reports / Bills / Low-stock features.

Uses the Flask test client against the real MySQL database, validates the
8 acceptance test scenarios, and cleans up the transactions it creates.
Run:  backend\\venv\\Scripts\\python.exe backend\\verify_features.py
"""

import sys
import os
from datetime import date, timedelta

BACKEND = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND)
os.chdir(BACKEND)

import app as backend  # noqa: E402  (applies idempotent schema upgrades on import)

client = backend.app.test_client()
TOKEN = {"value": None}
failures = []


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name}" + (f"  -- {detail}" if detail and not condition else ""))
    if not condition:
        failures.append(name)


def login():
    resp = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    body = resp.get_json()
    TOKEN["value"] = body.get("token")
    check("login admin/admin123 -> 200", resp.status_code == 200, str(resp.status_code))


def http(method, path, payload=None):
    headers = {"Authorization": f"Bearer {TOKEN['value']}"}
    if method in ("POST", "PUT"):
        return client.open(path, method=method, json=payload, headers=headers)
    return client.open(path, method=method, headers=headers)


def product_stock(product_id):
    row = backend.fetch_one("SELECT stock FROM products WHERE id = %s", (product_id,))
    return int(row["stock"]) if row else None


def cleanup_leftovers():
    """Remove Verify* rows left over from any previous crashed run."""
    leftovers_sales = backend.fetch_all(
        "SELECT id FROM sales WHERE customer = 'Verify Customer'"
    )
    for row in leftovers_sales:
        http("DELETE", f"/api/sales/{row['id']}")
    leftovers_purchases = backend.fetch_all(
        "SELECT id FROM purchases WHERE supplier = 'Verify Supplier'"
    )
    for row in leftovers_purchases:
        http("DELETE", f"/api/purchases/{row['id']}")
    if leftovers_sales or leftovers_purchases:
        print(f"cleaned leftovers: {len(leftovers_sales)} sale(s), "
              f"{len(leftovers_purchases)} purchase(s)")


# ---------------------------------------------------------------------------
login()
cleanup_leftovers()

TODAY = date.today()
today_str = TODAY.strftime("%Y-%m-%d")
week_ago_str = (TODAY - timedelta(days=6)).strftime("%Y-%m-%d")

# Pick the products used for the live tests.
products = http("GET", "/api/products").get_json()
laptop = next((p for p in products if p["name"] == "Laptop"), products[0])
mouse = next((p for p in products if p["name"] == "Mouse"), products[0])

laptop_stock_before = product_stock(laptop["id"])

# =========================================================================
# TEST 5a + TEST 6a: create one sale and one purchase dated TODAY
# =========================================================================
print("=" * 25, "SETUP: sale + purchase for today", "=" * 25)

sale_resp = http(
    "POST",
    "/api/sales",
    {
        "customer": "Verify Customer",
        "product": laptop["name"],
        "quantity": 2,
        "price": 500,
        "sale_date": today_str,
        "payment_method": "Cash",
        "amount_received": 1100,
    },
)
sale_body = sale_resp.get_json()
check("POST /api/sales -> 201", sale_resp.status_code == 201, str(sale_body))
sale_id = sale_body.get("id")

bill = sale_body.get("bill") or {}
check("sale response contains bill payload", bool(bill), str(sale_body))
check("bill has invoice number from DB", bool(bill.get("billNumber")), str(bill.get("billNumber")))
check("bill customer/product/qty correct",
      bill.get("partyName") == "Verify Customer"
      and (bill.get("items") or [{}])[0].get("name") == laptop["name"]
      and (bill.get("items") or [{}])[0].get("quantity") == 2,
      str(bill))
check("bill subtotal 500*2=1000", bill.get("subtotal") == 1000, str(bill.get("subtotal")))
check("bill grand total 1000", bill.get("grandTotal") == 1000, str(bill.get("grandTotal")))
check("bill payment method Cash", bill.get("paymentMethod") == "Cash", str(bill.get("paymentMethod")))
check("bill amount received 1100", bill.get("amountReceived") == 1100, str(bill.get("amountReceived")))
check("bill change 100", bill.get("change") == 100, str(bill.get("change")))
check("bill date is today (DD-MM-YYYY)", bill.get("date") == TODAY.strftime("%d-%m-%Y"), str(bill.get("date")))
check("bill has time", bool(bill.get("time")), str(bill.get("time")))

purchase_resp = http(
    "POST",
    "/api/purchases",
    {
        "supplier": "Verify Supplier",
        "product": laptop["name"],
        "quantity": 3,
        "price": 400,
        "purchase_date": today_str,
    },
)
purchase_body = purchase_resp.get_json()
check("POST /api/purchases -> 201", purchase_resp.status_code == 201, str(purchase_body))
purchase_id = purchase_body.get("id")

pbill = purchase_body.get("bill") or {}
check("purchase response contains bill payload", bool(pbill), str(purchase_body))
check("purchase bill number PUR-####", str(pbill.get("billNumber", "")).startswith("PUR-"), str(pbill.get("billNumber")))
check("purchase bill supplier correct", pbill.get("partyName") == "Verify Supplier", str(pbill.get("partyName")))
check("purchase bill total 400*3=1200", pbill.get("grandTotal") == 1200, str(pbill.get("grandTotal")))
check("purchase bill amount paid 1200", pbill.get("amountPaid") == 1200, str(pbill.get("amountPaid")))

laptop_stock_after = product_stock(laptop["id"])
check(
    "TEST 5b/6b: sale decreased stock & purchase increased stock (net +1)",
    laptop_stock_after == laptop_stock_before + 1,
    f"before={laptop_stock_before} after={laptop_stock_after}",
)

# Bill endpoints for existing records
bill_resp = http("GET", f"/api/sales/{sale_id}/bill")
check("GET /api/sales/<id>/bill -> 200", bill_resp.status_code == 200, str(bill_resp.status_code))
stored_bill = bill_resp.get_json().get("bill") or {}
check(
    "stored bill matches created bill (invoice no, totals)",
    stored_bill.get("billNumber") == bill.get("billNumber")
    and stored_bill.get("grandTotal") == 1000
    and stored_bill.get("paymentMethod") == "Cash",
    str(stored_bill),
)

pbill_resp = http("GET", f"/api/purchases/{purchase_id}/bill")
check("GET /api/purchases/<id>/bill -> 200", pbill_resp.status_code == 200, str(pbill_resp.status_code))
stored_pbill = pbill_resp.get_json().get("bill") or {}
check("stored purchase bill total 1200", stored_pbill.get("grandTotal") == 1200, str(stored_pbill))

# =========================================================================
# TEST 1: single-day report (from == to == today) includes today's rows
# =========================================================================
print("=" * 25, "TEST 1: single day range", "=" * 25)

resp = http("GET", f"/api/reports/sales?from_date={today_str}&to_date={today_str}")
sales_today = resp.get_json()
check("single-day sales report -> 200", resp.status_code == 200, str(resp.status_code))
check(
    "single-day report includes today's sale",
    any(s["id"] == sale_id for s in sales_today),
    str([s["id"] for s in sales_today]),
)
check(
    "single-day report only contains today's rows",
    all(str(s["sale_date"])[:10] == today_str for s in sales_today),
    str({str(s["sale_date"]) for s in sales_today}),
)

resp = http("GET", f"/api/reports/purchases?from_date={today_str}&to_date={today_str}")
purchases_today = resp.get_json()
check(
    "single-day purchase report includes today's purchase",
    any(p["id"] == purchase_id for p in purchases_today),
    str([p["id"] for p in purchases_today]),
)

# DD-MM-YYYY parameter support
dmy = TODAY.strftime("%d-%m-%Y")
resp = http("GET", f"/api/reports/sales?from_date={dmy}&to_date={dmy}")
check(
    "DD-MM-YYYY parameters accepted",
    resp.status_code == 200 and any(s["id"] == sale_id for s in resp.get_json()),
    str(resp.status_code),
)

summary = http(
    "GET", f"/api/reports/summary?from_date={today_str}&to_date={today_str}"
).get_json()
check(
    "TEST 1: summary single day -> 1 sale & 1 purchase transaction",
    summary.get("salesTransactions") == 1 and summary.get("purchasesTransactions") == 1,
    str(summary),
)

# =========================================================================
# TEST 2: 7-day range [today-6, today] includes them; older range excludes
# =========================================================================
print("=" * 25, "TEST 2: 7-day range", "=" * 25)

resp = http("GET", f"/api/reports/sales?from_date={week_ago_str}&to_date={today_str}")
sales_7d = resp.get_json()
check(
    "TEST 2a: 7-day report includes today's sale",
    any(s["id"] == sale_id for s in sales_7d),
    str([s["id"] for s in sales_7d]),
)
check(
    "TEST 2b: 7-day report excludes rows older than 7 days",
    all(week_ago_str <= str(s["sale_date"])[:10] <= today_str for s in sales_7d),
    str({str(s["sale_date"]) for s in sales_7d}),
)

old_from = (TODAY - timedelta(days=60)).strftime("%Y-%m-%d")
old_to = (TODAY - timedelta(days=40)).strftime("%Y-%m-%d")
sales_old = http(
    "GET", f"/api/reports/sales?from_date={old_from}&to_date={old_to}"
).get_json()
check(
    "TEST 2c: out-of-range window excludes today's sale",
    all(s["id"] != sale_id for s in sales_old),
    str([s["id"] for s in sales_old]),
)

invalid = http("GET", "/api/reports/sales?from_date=2026-08-31&to_date=2026-08-01")
check("from > to rejected with 400", invalid.status_code == 400, str(invalid.status_code))

# =========================================================================
# TEST 3 + TEST 4: Money Received / Money Paid match the DB exactly
# =========================================================================
print("=" * 25, "TEST 3/4: money totals vs SQL", "=" * 25)

summary = http(
    "GET", f"/api/reports/summary?from_date={week_ago_str}&to_date={today_str}"
).get_json()

db_sales = backend.fetch_one(
    "SELECT COALESCE(SUM(quantity*price),0) AS amt, COUNT(*) AS cnt, "
    "COALESCE(SUM(quantity),0) AS qty FROM sales "
    "WHERE sale_date >= %s AND sale_date < %s + INTERVAL 1 DAY",
    (week_ago_str, today_str),
)
db_purchases = backend.fetch_one(
    "SELECT COALESCE(SUM(quantity*price),0) AS amt, COUNT(*) AS cnt, "
    "COALESCE(SUM(quantity),0) AS qty FROM purchases "
    "WHERE purchase_date >= %s AND purchase_date < %s + INTERVAL 1 DAY",
    (week_ago_str, today_str),
)

check(
    "TEST 3: Money Received matches SQL SUM(quantity*price)",
    abs(summary["totalSales"] - float(db_sales["amt"])) < 0.01,
    f"api={summary['totalSales']} sql={db_sales['amt']}",
)
check(
    "TEST 3: sales transaction count matches SQL COUNT(*)",
    summary["salesTransactions"] == int(db_sales["cnt"]),
    f"api={summary['salesTransactions']} sql={db_sales['cnt']}",
)
check(
    "TEST 3: items sold matches SQL SUM(quantity)",
    abs(summary["itemsSold"] - float(db_sales["qty"])) < 0.01,
    f"api={summary['itemsSold']} sql={db_sales['qty']}",
)
check(
    "TEST 4: Money Paid matches SQL SUM(quantity*price)",
    abs(summary["totalPurchases"] - float(db_purchases["amt"])) < 0.01,
    f"api={summary['totalPurchases']} sql={db_purchases['amt']}",
)
check(
    "TEST 4: purchase transaction count matches SQL COUNT(*)",
    summary["purchasesTransactions"] == int(db_purchases["cnt"]),
    f"api={summary['purchasesTransactions']} sql={db_purchases['cnt']}",
)
check(
    "Net Cash Flow = Money Received - Money Paid (not labelled profit)",
    abs(summary["netCashFlow"] - (summary["totalSales"] - summary["totalPurchases"]))
    < 0.01,
    str(summary["netCashFlow"]),
)

# =========================================================================
# TEST 7 + TEST 8: low stock data for the dashboard popup
# =========================================================================
print("=" * 25, "TEST 7/8: low stock", "=" * 25)

alerts = http("GET", "/api/low-stock-alerts").get_json()
check(
    "TEST 7: low-stock alerts list not empty (Mouse is below minimum)",
    len(alerts or []) > 0,
    str(len(alerts or [])),
)
check(
    "TEST 7: every alert has stock <= minimum_stock",
    all(int(a["stock"]) <= int(a["minimum_stock"]) for a in alerts or []),
    str([(a["name"], a["stock"], a["minimum_stock"]) for a in alerts or []]),
)
mouse_alert = next((a for a in alerts or [] if a["name"] == mouse["name"]), None)
check(
    "TEST 7: Mouse (stock 8 <= 10) appears in the popup data",
    mouse_alert is not None,
    str(mouse_alert),
)

high_stock_products = [
    p for p in products if int(p["stock"]) > int(p["minimum_stock"])
]
if high_stock_products:
    names = {p["name"] for p in high_stock_products}
    check(
        "TEST 8: products above minimum stock are NOT in the low-stock list",
        all(a["name"] not in names for a in alerts or []),
        str(names),
    )
else:
    check("TEST 8: (skipped - no products above minimum in current data)", True)

dashboard = http("GET", "/api/dashboard").get_json()
check(
    "TEST 9: dashboard still returns lowStockItems count (existing card)",
    "lowStockItems" in dashboard
    and int(dashboard["lowStockItems"]) == len(alerts or []),
    str(dashboard.get("lowStockItems")),
)

# =========================================================================
# CLEANUP: delete the created sale and purchase (restores stock)
# =========================================================================
print("=" * 25, "CLEANUP", "=" * 25)

resp = http("DELETE", f"/api/sales/{sale_id}")
check(
    "cleanup: sale deleted + stock restored",
    resp.status_code == 200,
    str(resp.get_json()),
)
resp = http("DELETE", f"/api/purchases/{purchase_id}")
check(
    "cleanup: purchase deleted + stock restored",
    resp.status_code == 200,
    str(resp.get_json()),
)
check(
    "cleanup: product stock back to original",
    product_stock(laptop["id"]) == laptop_stock_before,
    f"final={product_stock(laptop['id'])} original={laptop_stock_before}",
)

print()
if failures:
    print(f"RESULT: {len(failures)} FAILURE(S): {failures}")
    sys.exit(1)
print("RESULT: ALL CHECKS PASSED")

