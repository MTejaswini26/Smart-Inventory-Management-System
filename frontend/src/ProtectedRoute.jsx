import { Navigate } from "react-router-dom";
import { getToken } from "./api";

function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
