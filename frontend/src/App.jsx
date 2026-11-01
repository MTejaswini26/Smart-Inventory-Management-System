import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import VoiceAssistant from "./components/VoiceAssistant/VoiceAssistant";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Invoices from "./pages/Invoices";
import AIStockPrediction from "./pages/AIStockPrediction";
import LowStockAlerts from "./pages/LowStockAlerts";
import Reports from "./pages/Reports";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases"
          element={
            <ProtectedRoute>
              <Purchases />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          }
        />
        {/* Voice Assistant: global floating widget (floating mic button + chat
            window). Rendered inside BrowserRouter but OUTSIDE <Routes> so it
            floats over every page; its fixed bottom-right FAB acts as the
            visible launcher. */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-stock-prediction"
          element={
            <ProtectedRoute>
              <AIStockPrediction />
            </ProtectedRoute>
          }
        />
        <Route
          path="/low-stock-alerts"
          element={
            <ProtectedRoute>
              <LowStockAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Routes>
      <VoiceAssistant />
    </BrowserRouter>
  );
}

export default App;
