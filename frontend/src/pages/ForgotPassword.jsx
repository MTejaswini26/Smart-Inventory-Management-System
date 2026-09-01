import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import "./Login.css";
import "./ForgotPassword.css";

function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // The password reset email links back to this page with the username and
  // the reset token in the query string (?username=...&token=...). When the
  // user clicks the link, the form is prefilled and opens directly on the
  // "set a new password" step. The query params are read once here as the
  // initial state, so no effect is needed to sync them.
  const emailedToken = searchParams.get("token");
  const emailedUsername = searchParams.get("username");

  const [step, setStep] = useState(emailedToken ? 2 : 1);
  const [username, setUsername] = useState(
    emailedToken ? emailedUsername || "" : ""
  );
  const [token, setToken] = useState(emailedToken || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to process the request");
        return;
      }
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Unable to connect to the server. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ username, token, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to reset the password");
        return;
      }
      setMessage(data.message);
      setStep(3);
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Unable to connect to the server. Make sure Flask is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* LEFT BRANDING SECTION (same design as the Login page) */}
        <div className="login-brand">
          <div className="brand-icon">📦</div>
          <h1>
            Smart Inventory
            <br />
            Management
          </h1>
          <p className="brand-subtitle">Inventory Management System</p>
          <div className="brand-line"></div>
          <p className="brand-description">
            Manage your products, stock, sales
            and reports efficiently in one place.
          </p>
        </div>

        {/* FORM SECTION */}
        <div className="login-form-section">
          <div className="login-form-content">
            <div className="welcome-icon">🔑</div>
            <h2>Reset Password</h2>
            <p className="login-subtitle">Recover access to your account</p>

            {step === 1 && (
              <form onSubmit={handleRequestToken}>
                <div className="login-form-group">
                  <label>Username or Email</label>
                  <div className="input-wrapper">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      placeholder="Enter your username or email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <p className="login-error">{error}</p>}
                {message && <p className="forgot-message">{message}</p>}

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Send Reset Link"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleResetPassword}>
                <p className="forgot-hint">
                  A password reset link has been sent to your registered email
                  address. Click the link in the email to come back here with
                  the token prefilled, or paste the token below to continue.
                </p>

                <div className="login-form-group">
                  <label>Reset Token</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔐</span>
                    <input
                      type="text"
                      placeholder="Paste the reset token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-form-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength="6"
                      required
                    />
                  </div>
                </div>

                <div className="login-form-group">
                  <label>Confirm New Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      type="password"
                      placeholder="Repeat the new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength="6"
                      required
                    />
                  </div>
                </div>

                {error && <p className="login-error">{error}</p>}

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Set New Password"}
                </button>
              </form>
            )}

            {step === 3 && (
              <div>
                <p className="forgot-message">{message}</p>
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={() => navigate("/")}
                >
                  Back to Login
                </button>
              </div>
            )}

            <p className="demo-login">
              <button
                type="button"
                className="forgot-password"
                onClick={() => navigate("/")}
              >
                ← Back to Login
              </button>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
