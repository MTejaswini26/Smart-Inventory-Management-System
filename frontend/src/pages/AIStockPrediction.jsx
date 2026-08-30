import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./AIStockPrediction.css";

function AIStockPrediction() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [days, setDays] = useState("30");

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/products")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load products");
        }
        return response.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading products:", err);
        setError(
          "Unable to connect to backend. Make sure the Flask server is running."
        );
        setLoading(false);
      });
  }, []);

  const handleProductChange = (e) => {
    setProductId(e.target.value);
    setPrediction(null);
  };

  const predictStock = async (e) => {
    e.preventDefault();
    setError("");
    setPrediction(null);

    if (!productId) {
      setError("Please select a product.");
      return;
    }

    const predictionDays = Number(days);
    if (!predictionDays || predictionDays <= 0) {
      setError("Please enter a valid prediction period.");
      return;
    }

    setPredicting(true);

    try {
      const response = await api(
        `/api/ai-stock-prediction/${productId}?days=${predictionDays}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Prediction failed");
      }

      setPrediction(data);
    } catch (err) {
      console.error("Prediction error:", err);
      setError(err.message || "Unable to generate prediction.");
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="ai-prediction-page">
      <div className="ai-prediction-header">
        <div>
          <h1>🤖 AI Stock Prediction</h1>
          <p>
            Forecast demand with Linear Regression on historical sales
          </p>
        </div>

        <button
          className="ai-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      <div className="prediction-container">
        <h2>Stock Prediction</h2>
        <p>
          Select a product and a forecast period. The model learns from
          recorded sales and recommends how many units to purchase.
        </p>

        {loading ? (
          <p className="loading">Loading products...</p>
        ) : (
          <form onSubmit={predictStock}>
            <div className="prediction-form-group">
              <label>Product Name</label>
              <select
                value={productId}
                onChange={handleProductChange}
                required
              >
                <option value="">-- Select Product --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="prediction-form-group">
              <label>Prediction Period (Days)</label>
              <input
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="Example: 30"
                required
              />
            </div>

            <button type="submit" className="predict-btn" disabled={predicting}>
              {predicting ? "Predicting..." : "🤖 Predict Stock"}
            </button>
          </form>
        )}
      </div>

      {prediction && (
        <div className="prediction-result">
          <h2>Prediction Result</h2>

          <div className="prediction-card">
            <div className="product-title">
              <h3>📦 {prediction.productName}</h3>
              <span>{prediction.category}</span>
            </div>

            <div className="prediction-info">
              <div className="info-box">
                <span>Model</span>
                <strong>{prediction.model}</strong>
              </div>

              <div className="info-box">
                <span>Current Stock</span>
                <strong>{prediction.currentStock}</strong>
              </div>

              <div className="info-box">
                <span>Minimum Stock</span>
                <strong>{prediction.minimumStock}</strong>
              </div>

              <div className="info-box">
                <span>Predicted Daily Demand</span>
                <strong>{prediction.averageDailySales}</strong>
              </div>

              <div className="info-box">
                <span>Prediction Period</span>
                <strong>{prediction.predictionDays} days</strong>
              </div>

              <div className="info-box">
                <span>Expected Sales</span>
                <strong>{prediction.expectedSales}</strong>
              </div>

              <div className="info-box">
                <span>Remaining Stock</span>
                <strong>{prediction.remainingStock}</strong>
              </div>

              <div className="info-box">
                <span>Recommended Purchase</span>
                <strong>{prediction.recommendedQuantity}</strong>
              </div>

              <div className="info-box">
                <span>R² Score</span>
                <strong>
                  {prediction.rSquared === null ? "N/A" : prediction.rSquared}
                </strong>
              </div>

              <div className="info-box">
                <span>Status</span>
                <strong
                  className={
                    prediction.status === "Critical"
                      ? "critical"
                      : prediction.status === "Low Stock"
                      ? "low-stock"
                      : "sufficient"
                  }
                >
                  {prediction.status}
                </strong>
              </div>
            </div>

            <div className="recommendation">
              <h3>💡 Recommendation</h3>
              {prediction.hasSalesHistory === false && (
                <p>
                  ⚠️ No historical sales found for this product. Predictions
                  stay at 0 until sales are recorded for it.
                </p>
              )}
              <p>{prediction.recommendation}</p>
              {prediction.historyNote && <p>{prediction.historyNote}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIStockPrediction;
