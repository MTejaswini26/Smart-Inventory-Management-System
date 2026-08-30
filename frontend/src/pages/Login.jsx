import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, logout } from "../api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password, remember_me: rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid username or password");
        return;
      }

      // Clear any stale session data first, then persist the new login in
      // the storage that matches the user's "Remember me" choice.
      logout();
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", data.token);
      storage.setItem("username", data.username);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to the server. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        {/* LEFT BRANDING SECTION */}
        <div className="login-brand">

          <div className="brand-icon">
            📦
          </div>

          <h1>
            Smart Inventory
            <br />
            Management
          </h1>

          <p className="brand-subtitle">
            Inventory Management System
          </p>

          <div className="brand-line"></div>

          <p className="brand-description">
            Manage your products, stock, sales
            and reports efficiently in one place.
          </p>

          <div className="brand-features">

            <div className="brand-feature">
              <span>📦</span>
              <p>Real-time Inventory Tracking</p>
            </div>

            <div className="brand-feature">
              <span>⚠️</span>
              <p>Smart Stock Alerts</p>
            </div>

            <div className="brand-feature">
              <span>📈</span>
              <p>Reports & Analytics</p>
            </div>

            <div className="brand-feature">
              <span>🔒</span>
              <p>Secure & Reliable</p>
            </div>

          </div>

        </div>

        {/* LOGIN FORM SECTION */}
        <div className="login-form-section">

          <div className="login-form-content">

            <div className="welcome-icon">
              👋
            </div>

            <h2>Welcome Back!</h2>

            <p className="login-subtitle">
              Please sign in to continue
            </p>

            <form onSubmit={handleLogin}>

              {/* USERNAME */}
              <div className="login-form-group">

                <label>Username</label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    required
                  />

                </div>

              </div>

              {/* PASSWORD */}
              <div className="login-form-group">

                <label>Password</label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>

                </div>

              </div>

              {/* OPTIONS */}
              <div className="login-options">

                <label className="remember-option">

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) =>
                      setRememberMe(e.target.checked)
                    }
                  />

                  <span>Remember me</span>

                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    navigate("/forgot-password")
                  }
                >
                  Forgot Password?
                </button>

              </div>

              {/* LOGIN BUTTON */}
              {error && (
                <p className="login-error">{error}</p>
              )}

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </button>

            </form>

            <p className="demo-login">
              Demo Login: <strong>admin / admin123</strong>
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;