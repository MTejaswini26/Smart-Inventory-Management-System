import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./LowStockAlerts.css";

function LowStockAlerts() {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // =============================
  // LOAD LOW STOCK PRODUCTS
  // =============================

  const loadAlerts = async () => {
    try {
      const response = await api(
        "/api/low-stock-alerts"
      );

      if (!response.ok) {
        throw new Error("Failed to load low stock alerts");
      }

      const data = await response.json();

      setAlerts(data);
    } catch (error) {
      console.error("Error loading low stock alerts:", error);
      alert("Failed to load low stock alerts");
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // LOAD WHEN PAGE OPENS
  // =============================

  useEffect(() => {
    loadAlerts();
  }, []);

  // =============================
  // GET STATUS
  // =============================

  const getStatus = (stock, minimumStock) => {
    if (stock === 0) {
      return "Out of Stock";
    }

    if (stock <= minimumStock) {
      return "Low Stock";
    }

    return "In Stock";
  };

  // =============================
  // PAGE
  // =============================

  return (
    <div className="low-stock-page">

      {/* HEADER */}

      <div className="low-stock-header">

        <div>
          <h1>Low Stock Alerts</h1>

          <p>
            Products that need attention
          </p>
        </div>

        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>

      </div>


      {/* ALERT SUMMARY */}

      <div className="alert-summary">

        <h2>
          ⚠️ {alerts.length} Alert
          {alerts.length !== 1 ? "s" : ""}
        </h2>

        <p>
          Products have reached or fallen below
          their minimum stock level.
        </p>

      </div>


      {/* LOADING */}

      {loading && (
        <div className="loading-message">
          Loading alerts...
        </div>
      )}


      {/* NO ALERTS */}

      {!loading && alerts.length === 0 && (
        <div className="no-alerts">
          <h2>✅ No Low Stock Products</h2>

          <p>
            All products have sufficient stock.
          </p>
        </div>
      )}


      {/* ALERT TABLE */}

      {!loading && alerts.length > 0 && (

        <div className="low-stock-table-container">

          <table>

            <thead>

              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Minimum Stock</th>
                <th>Status</th>
                <th>Recommended Qty</th>
                <th>Price</th>
              </tr>

            </thead>

            <tbody>

              {alerts.map((item) => (

                <tr key={item.id}>

                  <td>{item.id}</td>

                  <td>{item.name}</td>

                  <td>{item.category}</td>

                  <td>
                    {item.stock}
                  </td>

                  <td>
                    {item.minimum_stock}
                  </td>

                  <td>

                    <span
                      className={
                        item.stock === 0
                          ? "alert-status out"
                          : "alert-status low"
                      }
                    >
                      {getStatus(
                        item.stock,
                        item.minimum_stock
                      )}
                    </span>

                  </td>

                  <td>
                    {item.recommended_quantity ?? 0}
                  </td>

                  <td>
                    ₹{Number(item.price).toLocaleString("en-IN")}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

export default LowStockAlerts;