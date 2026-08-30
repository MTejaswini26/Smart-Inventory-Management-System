const API_BASE = "http://localhost:5001";

export function getToken() {
  // "Remember me" logins persist in localStorage; normal logins live only in
  // sessionStorage and are cleared automatically when the browser is closed.
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export function getUsername() {
  return (
    localStorage.getItem("username") ||
    sessionStorage.getItem("username") ||
    "Admin"
  );
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("username");
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && path !== "/api/auth/login") {
    logout();
    if (window.location.pathname !== "/") {
      window.location.assign("/");
    }
  }

  return response;
}
