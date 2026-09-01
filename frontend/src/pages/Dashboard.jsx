import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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

  // Low stock popup (uses the existing /api/low-stock-alerts endpoint).
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const lowStockPopupShown = useRef(false);

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

    // Check for low-stock products when the dashboard is opened/refreshed.
    // The popup is shown at most once per dashboard visit (no duplicates).
    api("/api/low-stock-alerts")
      .then((response) => response.json())
      .then((data) => {
        const alerts = Array.isArray(data) ? data : [];
        setLowStockAlerts(alerts);
        if (alerts.length > 0 && !lowStockPopupShown.current) {
          lowStockPopupShown.current = true;
          setShowLowStockModal(true);
        }
      })
      .catch((error) => {
        console.error("Low stock alert check failed:", error);
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

      {/* LOW STOCK POPUP - shown automatically when the dashboard opens
          and at least one product is at/below its minimum stock level. */}
      {showLowStockModal && lowStockAlerts.length > 0 && (
        <div
          className="lowstock-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Low stock alert"
        >
          <div className="lowstock-modal">
            <div className="lowstock-modal-header">
              <span className="lowstock-modal-icon">⚠️</span>
              <div>
                <h3>LOW STOCK ALERT</h3>
                <p>
                  {lowStockAlerts.length} product
                  {lowStockAlerts.length === 1 ? "" : "s"} at or below the
                  minimum stock level
                </p>
              </div>
            </div>

            <div className="lowstock-modal-list">
              {lowStockAlerts.map((product) => (
                <div
                  key={product.id}
                  className={
                    Number(product.stock) <= 0
                      ? "lowstock-item out"
                      : "lowstock-item"
                  }
                >
                  <div className="lowstock-item-name">
                    {product.name}
                    {Number(product.stock) <= 0 && (
                      <span className="lowstock-out-tag">Out of Stock</span>
                    )}
                  </div>
                  <div className="lowstock-item-levels">
                    <span>
                      Current Stock:{" "}
                      <strong>{product.stock}</strong>
                    </span>
                    <span>
                      Minimum Stock:{" "}
                      <strong>{product.minimum_stock}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="lowstock-modal-actions">
              <button
                type="button"
                className="lowstock-view-btn"
                onClick={() => {
                  setShowLowStockModal(false);
                  navigate("/inventory");
                }}
              >
                View Inventory
              </button>

              <button
                type="button"
                className="lowstock-close-btn"
                onClick={() => setShowLowStockModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
