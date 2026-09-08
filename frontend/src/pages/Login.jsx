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

  // Registration runs inside this same login card: "login" keeps the
  // existing sign-in form, "register" swaps in the create-account form.
  const [mode, setMode] = useState("login");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match");
      return;
    }

    setRegLoading(true);
    try {
      const response = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
          confirm_password: regConfirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRegError(data.message || "Unable to register. Please try again.");
        return;
      }

      // Success -> return to the login form with the username prefilled so
      // the new user can sign in through the normal login flow.
      setRegSuccess(data.message || "Registration successful. You can now log in.");
      setUsername(regUsername);
      setPassword("");
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
      setMode("login");
    } catch (err) {
      console.error("Registration error:", err);
      setRegError("Unable to connect to the server. Make sure Flask is running.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setRegSuccess("");
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

            <h2>{mode === "login" ? "Welcome Back!" : "Create Account"}</h2>

            <p className="login-subtitle">
              {mode === "login"
                ? "Please sign in to continue"
                : "Register a new account to continue"}
            </p>

            {mode === "login" ? (
            <>
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

              {regSuccess && (
                <p className="register-success">{regSuccess}</p>
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

            <p className="demo-login">
              New user?{" "}
              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setRegSuccess("");
                }}
              >
                Create Account
              </button>
            </p>
            </>
            ) : (
            <>
            <form onSubmit={handleRegister}>

              {/* USERNAME */}
              <div className="login-form-group">

                <label>Username</label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={regUsername}
                    onChange={(e) =>
                      setRegUsername(e.target.value)
                    }
                    minLength="3"
                    maxLength="100"
                    required
                  />

                </div>

              </div>

              {/* EMAIL */}
              <div className="login-form-group">

                <label>Email</label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    📧
                  </span>

                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={regEmail}
                    onChange={(e) =>
                      setRegEmail(e.target.value)
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
                    type="password"
                    placeholder="At least 6 characters"
                    value={regPassword}
                    onChange={(e) =>
                      setRegPassword(e.target.value)
                    }
                    minLength="6"
                    required
                  />

                </div>

              </div>

              {/* CONFIRM PASSWORD */}
              <div className="login-form-group">

                <label>Confirm Password</label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    type="password"
                    placeholder="Repeat your password"
                    value={regConfirmPassword}
                    onChange={(e) =>
                      setRegConfirmPassword(e.target.value)
                    }
                    minLength="6"
                    required
                  />

                </div>

              </div>

              {regError && (
                <p className="login-error">{regError}</p>
              )}

              <button
                type="submit"
                className="login-submit-btn"
                disabled={regLoading}
              >
                {regLoading ? "Creating Account..." : "Register"}
              </button>

            </form>

            <p className="demo-login">
              Already have an account?{" "}
              <button
                type="button"
                className="forgot-password"
                onClick={() => {
                  setMode("login");
                  setRegError("");
                }}
              >
                Back to Login
              </button>
            </p>
            </>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;