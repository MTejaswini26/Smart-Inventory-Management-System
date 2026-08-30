import { useEffect, useState } from "react";
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

function Reports() {
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [salesResponse, purchasesResponse] = await Promise.all([
        api("/api/sales"),
        api("/api/purchases")
      ]);

      const salesData = await salesResponse.json();
      const purchasesData = await purchasesResponse.json();

      setSales(Array.isArray(salesData) ? salesData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);

    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // CALCULATE SALES
  // =========================

  const totalSales = sales.reduce(
    (total, sale) =>
      total + Number(sale.price || 0) * Number(sale.quantity || 0),
    0
  );

  const itemsSold = sales.reduce(
    (total, sale) => total + Number(sale.quantity || 0),
    0
  );

  // =========================
  // CALCULATE PURCHASES
  // =========================

  const totalPurchases = purchases.reduce(
    (total, purchase) =>
      total +
      Number(purchase.price || 0) * Number(purchase.quantity || 0),
    0
  );

  const itemsPurchased = purchases.reduce(
    (total, purchase) =>
      total + Number(purchase.quantity || 0),
    0
  );

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
                <p>Total Sales</p>
                <h2>{formatCurrency(totalSales)}</h2>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                🛒
              </div>

              <div>
                <p>Total Purchases</p>
                <h2>{formatCurrency(totalPurchases)}</h2>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                📦
              </div>

              <div>
                <p>Items Sold</p>
                <h2>{itemsSold}</h2>
              </div>

            </div>


            <div className="report-kpi-card">

              <div className="report-kpi-icon">
                📥
              </div>

              <div>
                <p>Items Purchased</p>
                <h2>{itemsPurchased}</h2>
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
                width="100%"
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
                width="100%"
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

              <h2>Sales Report</h2>

              {sales.length === 0 ? (

                <p className="no-data">
                  No sales records found.
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
                          {formatCurrency(
                            Number(sale.price || 0) *
                            Number(sale.quantity || 0)
                          )}
                        </td>

                        <td>
                          {sale.sale_date}
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

              <h2>Purchase Report</h2>

              {purchases.length === 0 ? (

                <p className="no-data">
                  No purchase records found.
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
                          {formatCurrency(
                            Number(purchase.price || 0) *
                            Number(purchase.quantity || 0)
                          )}
                        </td>

                        <td>
                          {purchase.purchase_date}
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