import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api, getUsername, logout } from "../api";

function Dashboard() {
  const navigate = useNavigate();
  const username = getUsername();

  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockItems: 0,
    totalSales: 0,
    totalPurchases: 0,
    itemsSold: 0,
    itemsPurchased: 0,
    salesTrend: [],
    purchaseTrend: [],
    recommendations: [],
  });

  useEffect(() => {
    api("/api/dashboard")
      .then((response) => response.json())
      .then((data) => {
        setDashboardData((current) => ({
          ...current,
          ...data,
          salesTrend: data.salesTrend || [],
          purchaseTrend: data.purchaseTrend || [],
          recommendations: data.recommendations || [],
        }));
      })
      .catch((error) => {
        console.error("Dashboard API Error:", error);
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const comparisonData = [
    { name: "Sales", amount: Number(dashboardData.totalSales || 0) },
    { name: "Purchases", amount: Number(dashboardData.totalPurchases || 0) },
  ];

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-logo">Smart Inventory Management</div>

        <nav>
          <button className="menu-item active" onClick={() => navigate("/dashboard")}>
            🏠 Dashboard
          </button>
          <button className="menu-item" onClick={() => navigate("/products")}>
            📦 Products
          </button>
          <button className="menu-item" onClick={() => navigate("/inventory")}>
            📊 Inventory
          </button>
          <button className="menu-item" onClick={() => navigate("/suppliers")}>
            🏢 Suppliers
          </button>
          <button className="menu-item" onClick={() => navigate("/purchases")}>
            🛒 Purchases
          </button>
          <button className="menu-item" onClick={() => navigate("/sales")}>
            💰 Sales
          </button>
          <button className="menu-item" onClick={() => navigate("/invoices")}>
            🧾 Invoices
          </button>
          <button
            className="menu-item"
            onClick={() => navigate("/ai-stock-prediction")}
          >
            🤖 AI Stock Prediction
          </button>
          <button
            className="menu-item"
            onClick={() => navigate("/low-stock-alerts")}
          >
            ⚠️ Low Stock Alerts
          </button>
          <button className="menu-item" onClick={() => navigate("/reports")}>
            📈 Reports
          </button>
        </nav>

        <button className="logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p>Smart Inventory Management System</p>
          </div>
          <div className="admin-profile">{username}</div>
        </header>

        <section className="dashboard-content">
          <h2>Overview</h2>
          <p className="welcome-text">
            Welcome to your inventory dashboard.
          </p>

          <div className="kpi-grid">
            <div className="kpi-card" onClick={() => navigate("/products")}>
              <div className="kpi-icon">📦</div>
              <div>
                <p>Total Products</p>
                <h3>{dashboardData.totalProducts}</h3>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigate("/inventory")}>
              <div className="kpi-icon">📊</div>
              <div>
                <p>Total Stock</p>
                <h3>{dashboardData.totalStock}</h3>
              </div>
            </div>

            <div
              className="kpi-card"
              onClick={() => navigate("/low-stock-alerts")}
            >
              <div className="kpi-icon">⚠️</div>
              <div>
                <p>Low Stock Items</p>
                <h3>{dashboardData.lowStockItems}</h3>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigate("/sales")}>
              <div className="kpi-icon">💰</div>
              <div>
                <p>Total Sales</p>
                <h3>
                  ₹
                  {Number(dashboardData.totalSales).toLocaleString("en-IN")}
                </h3>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigate("/purchases")}>
              <div className="kpi-icon">🛒</div>
              <div>
                <p>Total Purchases</p>
                <h3>
                  ₹
                  {Number(dashboardData.totalPurchases).toLocaleString("en-IN")}
                </h3>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigate("/sales")}>
              <div className="kpi-icon">📤</div>
              <div>
                <p>Items Sold</p>
                <h3>{dashboardData.itemsSold}</h3>
              </div>
            </div>

            <div className="kpi-card" onClick={() => navigate("/purchases")}>
              <div className="kpi-icon">📥</div>
              <div>
                <p>Items Purchased</p>
                <h3>{dashboardData.itemsPurchased}</h3>
              </div>
            </div>
          </div>

          <div className="dashboard-charts">
            <div className="dashboard-chart-card">
              <h3>Sales vs Purchases</h3>
              <p>Revenue compared with procurement spend</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" name="Amount (₹)" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="dashboard-chart-card">
              <h3>Sales Trend</h3>
              <p>Daily sales performance from recorded transactions</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dashboardData.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Sales (₹)"
                    stroke="#16a34a"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="recommendations-card">
            <div className="recommendations-header">
              <div>
                <h3>Procurement Recommendations</h3>
                <p>
                  Linear Regression demand forecast with suggested purchase
                  quantities
                </p>
              </div>
              <button
                type="button"
                className="view-all-btn"
                onClick={() => navigate("/ai-stock-prediction")}
              >
                Open AI Forecast
              </button>
            </div>

            {dashboardData.recommendations.length === 0 ? (
              <p className="no-recommendations">
                No purchase is required right now. Stock levels cover predicted
                demand.
              </p>
            ) : (
              <table className="recommendations-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th>Expected Sales</th>
                    <th>Buy Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recommendations.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{item.currentStock}</td>
                      <td>{item.expectedSales}</td>
                      <td>{item.recommendedQuantity}</td>
                      <td>
                        <span
                          className={
                            item.status === "Critical"
                              ? "rec-status critical"
                              : item.status === "Low Stock"
                              ? "rec-status low"
                              : "rec-status ok"
                          }
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
