import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import "./Reports.css";

// Fixed chart size used only while printing (see the print handlers below).
// 240px safely fits one chart column on A4 paper even with 1-inch margins.
const PRINT_CHART_WIDTH = 240;

function Reports() {
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(true);

  // True only while the print dialog is open - during that time the charts
  // switch from responsive width to the fixed PRINT_CHART_WIDTH.
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Totals are computed by the Flask backend (SQL) for the selected range.
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalPurchases: 0,
    itemsSold: 0,
    itemsPurchased: 0,
    salesTransactions: 0,
    purchasesTransactions: 0,
    netCashFlow: 0,
  });

  // Date inputs (YYYY-MM-DD) and the range actually applied to the report.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });
  const [rangeError, setRangeError] = useState("");

  // Fetch the raw report payloads for a date range. Kept free of state
  // updates so both the mount effect and the date-range handlers can share
  // the same request logic.
  const fetchReportsData = async (range) => {
    const params = new URLSearchParams();
    if (range.from) {
      params.append("from_date", range.from);
    }
    if (range.to) {
      params.append("to_date", range.to);
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";

    const [salesResponse, purchasesResponse, summaryResponse] =
      await Promise.all([
        api(`/api/reports/sales${suffix}`),
        api(`/api/reports/purchases${suffix}`),
        api(`/api/reports/summary${suffix}`),
      ]);

    const salesData = await salesResponse.json();
    const purchasesData = await purchasesResponse.json();
    const summaryData = await summaryResponse.json();

    if (!salesResponse.ok) {
      throw new Error(salesData.message || "Failed to load sales report");
    }
    if (!purchasesResponse.ok) {
      throw new Error(
        purchasesData.message || "Failed to load purchases report"
      );
    }
    if (!summaryResponse.ok) {
      throw new Error(summaryData.message || "Failed to load report totals");
    }

    return { salesData, purchasesData, summaryData };
  };

  // Apply fetched payloads to state (runs asynchronously via .then)
  const applyReportsData = ({ salesData, purchasesData, summaryData }) => {
    setSales(Array.isArray(salesData) ? salesData : []);
    setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
    setSummary((current) => ({ ...current, ...summaryData }));
  };

  const handleReportsError = (error) => {
    console.error("Error fetching reports:", error);
    alert(error.message || "Failed to load reports");
  };

  // =========================
  // FETCH REPORTS (date filtering happens in the backend SQL queries)
  // =========================

  const fetchReports = (range) => {
    fetchReportsData(range)
      .then(applyReportsData)
      .catch(handleReportsError)
      .finally(() => {
        setLoading(false);
      });
  };

  // =========================
  // LOAD REPORTS WHEN PAGE OPENS
  // =========================

  useEffect(() => {
    fetchReportsData({ from: "", to: "" })
      .then(applyReportsData)
      .catch(handleReportsError)
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // =========================
  // DATE RANGE HELPERS
  // =========================

  const toDateInputValue = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  };

  const applyRange = (from, to) => {
    if (from && to && new Date(from) > new Date(to)) {
      setRangeError("From Date cannot be after To Date.");
      return;
    }
    setRangeError("");
    setFromDate(from);
    setToDate(to);
    setAppliedRange({ from, to });
    fetchReports({ from, to });
  };

  const applyQuickPreset = (preset) => {
    const today = new Date();

    if (preset === "today") {
      applyRange(toDateInputValue(today), toDateInputValue(today));
    } else if (preset === "last7") {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      applyRange(toDateInputValue(start), toDateInputValue(today));
    } else if (preset === "month") {
      applyRange(
        toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
        toDateInputValue(today)
      );
    } else {
      applyRange("", "");
    }
  };

  const formatDisplayDate = (value) => {
    if (!value) {
      return "";
    }
    const parts = String(value).substring(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : value;
  };

  const rangeLabel = () => {
    const { from, to } = appliedRange;
    if (!from && !to) {
      return "All Time";
    }
    if (from && !to) {
      return `${formatDisplayDate(from)} onwards`;
    }
    if (!from && to) {
      return `Up to ${formatDisplayDate(to)}`;
    }
    return `${formatDisplayDate(from)} to ${formatDisplayDate(to)}`;
  };

  const isActivePreset = (preset) => {
    const { from, to } = appliedRange;
    const today = toDateInputValue(new Date());

    if (preset === "today") {
      return from === today && to === today;
    }
    if (preset === "last7") {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return from === toDateInputValue(start) && to === today;
    }
    if (preset === "month") {
      const start = new Date();
      return (
        from ===
          toDateInputValue(new Date(start.getFullYear(), start.getMonth(), 1)) &&
        to === today
      );
    }
    return !from && !to;
  };

  // =========================
  // SALES / PURCHASE TOTALS (from backend SQL summary)
  // =========================

  const totalSales = Number(summary.totalSales || 0); // Money Received
  const totalPurchases = Number(summary.totalPurchases || 0); // Money Paid
  const itemsSold = Number(summary.itemsSold || 0);
  const itemsPurchased = Number(summary.itemsPurchased || 0);
  const salesTransactions = Number(summary.salesTransactions || 0);
  const purchasesTransactions = Number(summary.purchasesTransactions || 0);
  const netCashFlow =
    summary.netCashFlow != null
      ? Number(summary.netCashFlow)
      : totalSales - totalPurchases;

  // Table summaries (per tab) computed from the filtered rows returned by
  // the backend. `amount` is the database-computed (quantity * price) value.
  const rowAmount = (row) =>
    Number(
      row.amount != null
        ? row.amount
        : Number(row.price || 0) * Number(row.quantity || 0)
    );

  const salesRowsSummary = {
    transactions: sales.length,
    quantity: sales.reduce(
      (total, sale) => total + Number(sale.quantity || 0),
      0
    ),
    amount: sales.reduce((total, sale) => total + rowAmount(sale), 0),
  };

  const purchasesRowsSummary = {
    transactions: purchases.length,
    quantity: purchases.reduce(
      (total, purchase) => total + Number(purchase.quantity || 0),
      0
    ),
    amount: purchases.reduce(
      (total, purchase) => total + rowAmount(purchase),
      0
    ),
  };

  // =========================
  // GRAPH DATA
  // =========================

  const chartData = [
    {
      name: "Sales",
      amount: totalSales
    },
    {
      name: "Purchases",
      amount: totalPurchases
    }
  ];

  const quantityChartData = [
    {
      name: "Items Sold",
      quantity: itemsSold
    },
    {
      name: "Items Purchased",
      quantity: itemsPurchased
    }
  ];

  // =========================
  // FORMAT CURRENCY
  // =========================

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(value);
  };

  // =========================
  // PRINT REPORT
  // =========================

  // While printing, render the charts at a fixed size instead of letting
  // recharts measure the paper with its ResizeObserver. Recharts unmounts a
  // chart whenever it measures a non-positive size, and Chrome's print
  // re-layout can produce exactly that mid-measurement - which is why the
  // graphs were disappearing from the saved print. Fixed dimensions skip
  // recharts' measuring logic completely. `beforeprint` also covers
  // Ctrl+P / browser-menu printing, and `flushSync` guarantees the
  // fixed-size charts are committed BEFORE the print snapshot is taken.
  useEffect(() => {
    const handleBeforePrint = () => {
      flushSync(() => {
        setIsPrintMode(true);
      });
    };

    const handleAfterPrint = () => {
      flushSync(() => {
        setIsPrintMode(false);
      });
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const printReport = () => {
    window.print();
  };

  return (
    <div className="reports-page">

      {/* HEADER */}

      <div className="reports-header">

        <div>
          <h1>Reports & Analytics</h1>
          <p>
            View sales, purchase and inventory reports
          </p>
        </div>

        <div className="reports-header-buttons">

          <button
            className="print-btn"
            onClick={printReport}
          >
            🖨️ Print Report
          </button>

          <button
            className="back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>

      </div>

      {/* DATE RANGE FILTER */}

      <div className="reports-filter-card">

        <div className="reports-filter-fields">

          <div className="reports-filter-field">

            <label htmlFor="report-from-date">From Date</label>

            <input
              id="report-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

          </div>

          <div className="reports-filter-field">

            <label htmlFor="report-to-date">To Date</label>

            <input
              id="report-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

          </div>

          <div className="reports-filter-actions">

            <button
              type="button"
              className="filter-apply-btn"
              onClick={() => applyRange(fromDate, toDate)}
            >
              Apply Range
            </button>

            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => applyQuickPreset("all")}
            >
              All Time
            </button>

          </div>

        </div>

        <div className="reports-filter-presets">

          <button
            type="button"
            className={isActivePreset("today") ? "preset-btn active" : "preset-btn"}
            onClick={() => applyQuickPreset("today")}
          >
            Today
          </button>

          <button
            type="button"
            className={isActivePreset("last7") ? "preset-btn active" : "preset-btn"}
            onClick={() => applyQuickPreset("last7")}
          >
            Last 7 Days
          </button>

          <button
            type="button"
            className={isActivePreset("month") ? "preset-btn active" : "preset-btn"}
            onClick={() => applyQuickPreset("month")}
          >
            This Month
          </button>

          <button
            type="button"
            className={isActivePreset("all") ? "preset-btn active" : "preset-btn"}
            onClick={() => applyQuickPreset("all")}
          >
            All Time
          </button>

        </div>

        {rangeError && (
          <p className="reports-filter-error">{rangeError}</p>
        )}

        <p className="reports-range-label">
          Showing: <strong>{rangeLabel()}</strong>
        </p>

      </div>

      {loading ? (

        <div className="loading">
          Loading reports...
        </div>

      ) : (

        <>

          {/* KPI CARDS */}

          <div className="reports-kpi-grid">

            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                💰
              </div>

              <div>
                <p>Money Received (Sales)</p>
                <h2>{formatCurrency(totalSales)}</h2>
                <span className="report-kpi-sub">
                  {salesTransactions} sales transaction
                  {salesTransactions === 1 ? "" : "s"}
                </span>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                🛒
              </div>

              <div>
                <p>Money Paid (Purchases)</p>
                <h2>{formatCurrency(totalPurchases)}</h2>
                <span className="report-kpi-sub">
                  {purchasesTransactions} purchase transaction
                  {purchasesTransactions === 1 ? "" : "s"}
                </span>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                🧮
              </div>

              <div>
                <p>Net Cash Flow</p>
                <h2>{formatCurrency(netCashFlow)}</h2>
                <span className="report-kpi-sub">
                  Money Received − Money Paid
                </span>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                📦
              </div>

              <div>
                <p>Items Sold</p>
                <h2>{itemsSold}</h2>
                <span className="report-kpi-sub">
                  Total quantity sold
                </span>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                📥
              </div>

              <div>
                <p>Items Purchased</p>
                <h2>{itemsPurchased}</h2>
                <span className="report-kpi-sub">
                  Total quantity purchased
                </span>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                📅
              </div>

              <div>
                <p>Report Period</p>
                <h2 className="report-period-text">{rangeLabel()}</h2>
                <span className="report-kpi-sub">
                  Any date range, including a single day
                </span>
              </div>

            </div>

          </div>


          {/* GRAPHS */}

          <div className="charts-section">

            {/* MONEY GRAPH */}

            <div className="chart-card">

              <h2>💰 Sales vs Purchases</h2>

              <p>
                Comparison of total sales and purchase amounts
              </p>

              <ResponsiveContainer
                width={isPrintMode ? PRINT_CHART_WIDTH : "100%"}
                height={320}
              >

                <BarChart data={chartData}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(value)
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="amount"
                    name="Amount"
                    fill="#2563eb"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>


            {/* QUANTITY GRAPH */}

            <div className="chart-card">

              <h2>📦 Items Sold vs Purchased</h2>

              <p>
                Comparison of total item quantities
              </p>

              <ResponsiveContainer
                width={isPrintMode ? PRINT_CHART_WIDTH : "100%"}
                height={320}
              >

                <BarChart data={quantityChartData}>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="name" />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="quantity"
                    name="Quantity"
                    fill="#16a34a"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>


          {/* TABS */}

          <div className="report-tabs">

            <button
              className={
                activeTab === "sales"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => setActiveTab("sales")}
            >
              Sales Report
            </button>

            <button
              className={
                activeTab === "purchases"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => setActiveTab("purchases")}
            >
              Purchase Report
            </button>

          </div>


          {/* SALES TABLE */}

          {activeTab === "sales" && (

            <div className="report-table-container">

              <div className="report-table-header">

                <h2>Sales Report</h2>

                <div className="report-tab-summary">

                  <span>
                    Transactions: <strong>{salesRowsSummary.transactions}</strong>
                  </span>

                  <span>
                    Total Quantity: <strong>{salesRowsSummary.quantity}</strong>
                  </span>

                  <span>
                    Money Received:{" "}
                    <strong>{formatCurrency(salesRowsSummary.amount)}</strong>
                  </span>

                </div>

              </div>

              {sales.length === 0 ? (

                <p className="no-data">
                  No sales records found for the selected date range.
                </p>

              ) : (

                <table>

                  <thead>

                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>

                  </thead>

                  <tbody>

                    {sales.map((sale) => (

                      <tr key={sale.id}>

                        <td>{sale.id}</td>

                        <td>
                          {sale.customer}
                        </td>

                        <td>
                          {sale.product}
                        </td>

                        <td>
                          {sale.quantity}
                        </td>

                        <td>
                          {formatCurrency(rowAmount(sale))}
                        </td>

                        <td>
                          {formatDisplayDate(sale.sale_date)}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              )}

            </div>

          )}


          {/* PURCHASE TABLE */}

          {activeTab === "purchases" && (

            <div className="report-table-container">

              <div className="report-table-header">

                <h2>Purchase Report</h2>

                <div className="report-tab-summary">

                  <span>
                    Transactions: <strong>{purchasesRowsSummary.transactions}</strong>
                  </span>

                  <span>
                    Total Quantity: <strong>{purchasesRowsSummary.quantity}</strong>
                  </span>

                  <span>
                    Money Paid:{" "}
                    <strong>{formatCurrency(purchasesRowsSummary.amount)}</strong>
                  </span>

                </div>

              </div>

              {purchases.length === 0 ? (

                <p className="no-data">
                  No purchase records found for the selected date range.
                </p>

              ) : (

                <table>

                  <thead>

                    <tr>
                      <th>ID</th>
                      <th>Supplier</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>

                  </thead>

                  <tbody>

                    {purchases.map((purchase) => (

                      <tr key={purchase.id}>

                        <td>{purchase.id}</td>

                        <td>
                          {purchase.supplier}
                        </td>

                        <td>
                          {purchase.product}
                        </td>

                        <td>
                          {purchase.quantity}
                        </td>

                        <td>
                          {formatCurrency(rowAmount(purchase))}
                        </td>

                        <td>
                          {formatDisplayDate(purchase.purchase_date)}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              )}

            </div>

          )}

        </>

      )}

    </div>
  );
}

export default Reports;