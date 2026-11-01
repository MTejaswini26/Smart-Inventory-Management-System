// Command Executor: Connects NLU intents to Existing Flask Backend APIs & React Routing
// Reuses 100% of existing application APIs with JWT auth without modifying backend behavior

import { api, logout } from "../../api";
import { getMessage } from "./translations";

// Helper to fetch all products for fuzzy matching and data queries
export async function fetchProductsList() {
  try {
    const res = await api("/api/products");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to load products for voice assistant:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Voice bill/report lookup helpers
// ---------------------------------------------------------------------------

// Normalize a name/number for safe comparisons (case, spacing, quotes).
const normalizeLookupValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Compare a customer name from the database with the name extracted from a
// voice command. Exact match first, then safe word-boundary containment so
// "ram" never matches "ramya" by accident.
const isSameCustomer = (dbCustomer, spokenName) => {
  const db = normalizeLookupValue(dbCustomer);
  const spoken = normalizeLookupValue(spokenName);
  if (!db || !spoken) return false;
  if (db === spoken) return true;
  const escaped = spoken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}($|\\s)`).test(db);
};

// Canonicalize an invoice number, e.g. "inv 2026 5" -> "INV-2026-0005".
const normalizeInvoiceNumber = (value) => {
  const digits = String(value || "").match(/\d+/g) || [];
  if (digits.length < 2) {
    return normalizeLookupValue(value).toUpperCase().replace(/\s+/g, "");
  }
  const year = digits[0];
  const seq = String(parseInt(digits[1], 10)).padStart(4, "0");
  return `INV-${year}-${seq}`;
};

// Format an ISO/DB date as DD-MM-YYYY (same format the backend bill builder uses).
const formatBillDateDMY = (value) => {
  if (!value) return "";
  const parts = String(value).substring(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : String(value);
};

// Round money like the backend bill builder.
const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

// "ram kumar" -> "Ram Kumar" for messages.
const titleCaseName = (value) =>
  String(value || "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "customer";

export async function executeVoiceIntent({
  parsedIntent,
  context,
  setContext,
  lang = "en",
  navigate,
  onShowBill,
}) {
  const dispatchRefresh = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("inventory-updated"));
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Multi-turn Field Provider (e.g. user answered "20" or "50000" or "Laptop")
  if (parsedIntent.intent === "PROVIDE_FIELD") {
    const action = parsedIntent.pendingAction;
    const field = parsedIntent.field;
    const val = parsedIntent.value;

    if (action.type === "ADD_PRODUCT") {
      if (field === "name") {
        action.name = typeof val === "string" ? val.trim() || action.name : action.name;
        if (!action.category) {
          action.step = "CATEGORY";
          setContext({ pendingAction: action });
          return getMessage("askProductCategory", lang, { name: action.name });
        }
        if (!action.quantity) {
          action.step = "QUANTITY";
          setContext({ pendingAction: action });
          return getMessage("askProductQuantity", lang, action.name);
        }
        if (!action.price) {
          action.step = "PRICE";
          setContext({ pendingAction: action });
          return getMessage("askProductPrice", lang, action.name);
        }
      } else if (field === "category") {
        action.category = titleCaseName(val);
        if (!action.quantity) {
          action.step = "QUANTITY";
          setContext({ pendingAction: action });
          return getMessage("askProductQuantity", lang, action.name);
        }
        if (!action.price) {
          action.step = "PRICE";
          setContext({ pendingAction: action });
          return getMessage("askProductPrice", lang, action.name);
        }
      } else if (field === "quantity") {
        action.quantity = Number(val);
        if (!action.price) {
          action.step = "PRICE";
          setContext({ pendingAction: action });
          return getMessage("askProductPrice", lang, action.name);
        }
      } else if (field === "price") {
        action.price = Number(val);
        if (!action.quantity) {
          action.step = "QUANTITY";
          setContext({ pendingAction: action });
          return getMessage("askProductQuantity", lang, action.name);
        }
      }

      // All four details collected — confirm before saving (existing confirm flow).
      action.step = "CONFIRM_ADD";
      setContext({ pendingAction: action });
      return getMessage("confirmAddProduct", lang, {
        name: action.name,
        category: action.category,
        quantity: action.quantity,
        price: action.price,
      });
    }

    if (action.type === "UPDATE_PRODUCT") {
      // Field name just chosen ("quantity") -> ask for the new value.
      if (parsedIntent.advanceToValue && parsedIntent.value === null) {
        setContext({ pendingAction: parsedIntent.pendingAction });
        return getMessage("askUpdateValue", lang, { name: action.name, field });
      }
      if (field === "quantity" || field === "price" || field === "category") {
        const value = field === "category" ? val : Number(val);
        setContext({ pendingAction: null });
        const prodRes = await api("/api/products");
        const prods = await prodRes.json();
        const prod = prods.find((p) => p.id === action.productId);
        if (!prod) return getMessage("productNotFound", lang, action.name);
        return await applyProductUpdates(prod, { [field]: value }, lang, dispatchRefresh);
      }
    }

    if (action.type === "ADD_SALE") {
      // Details handoff: "Create a sale for Ram" -> "2 laptops 50000".
      // Product/quantity/price arrive on the parsed intent (parser 2c).
      const saleProduct = parsedIntent.product || action.product;
      const saleQuantity = parsedIntent.quantity ?? action.quantity;
      const salePriceValue = parsedIntent.price ?? action.price;
      const saleCustomer =
        parsedIntent.customerName || action.customerName || null;
      if (!saleProduct || !saleQuantity) {
        setContext({ pendingAction: action });
        return getMessage("askSaleDetails", lang);
      }
      setContext({ pendingAction: null });
      const prodRes = await api("/api/products");
      const prods = await prodRes.json().catch(() => []);
      const prod = (Array.isArray(prods) ? prods : []).find(
        (p) => p.name.toLowerCase() === String(saleProduct).toLowerCase()
      );
      if (!prod) {
        return getMessage("productNotFound", lang, saleProduct || "Product");
      }
      return await createSaleAndShowBill(prod, saleQuantity, salePriceValue, saleCustomer, {
        lang,
        todayStr,
        onShowBill,
        dispatchRefresh,
      });
    }

    if (action.type === "ADD_PURCHASE") {
      // Multi-turn purchase answers: product -> quantity -> price, then the
      // actual POST /api/purchases (same API the Purchases page uses).
      if (field === "product") action.product = val;
      else if (field === "quantity") action.quantity = Number(val);
      else if (field === "price") action.price = Number(val);

      if (!action.product) {
        action.step = "PRODUCT";
        setContext({ pendingAction: action });
        return getMessage("askPurchaseProduct", lang, action.supplierName || "the supplier");
      }
      if (action.quantity === null || action.quantity === undefined) {
        action.step = "QUANTITY";
        setContext({ pendingAction: action });
        return getMessage("askPurchaseQuantity", lang, action.product);
      }
      if (action.price === null || action.price === undefined) {
        action.step = "PRICE";
        setContext({ pendingAction: action });
        return getMessage("askPurchasePrice", lang, action.product);
      }

      setContext({ pendingAction: null });
      return await createPurchaseRecord({
        supplierName:
          action.supplierName ||
          (action.supplierRaw ? titleCaseName(action.supplierRaw) : "Standard Supplier"),
        product: action.product,
        quantity: action.quantity,
        price: action.price,
        lang,
        todayStr,
        dispatchRefresh,
      });
    }

    if (action.type === "GENERATE_PURCHASE_BILL") {
      // Purchase bill details handoff ("Purchase bill for ABC" -> "10 laptops 50000")
      setContext({ pendingAction: null });
      const billProduct =
        parsedIntent.product || action.product || null;
      const billQuantity = parsedIntent.quantity ?? action.quantity ?? null;
      const billPrice = parsedIntent.price ?? action.price ?? null;
      if (!billProduct || !billQuantity) {
        return getMessage("askSaleDetails", lang);
      }
      const prodRes = await api("/api/products");
      const prods = await prodRes.json().catch(() => []);
      const prod = (Array.isArray(prods) ? prods : []).find(
        (p) => p.name.toLowerCase() === String(billProduct).toLowerCase()
      );
      if (!prod) {
        return getMessage("productNotFound", lang, billProduct || "Product");
      }
      const purchasePrice = billPrice !== null && billPrice !== undefined ? Number(billPrice) : Number(prod.price);
      return await addPurchaseAndShowBill(prod, billQuantity, purchasePrice, action.supplierRaw, {
        lang,
        todayStr,
        onShowBill,
        dispatchRefresh,
      });
    }

    if (action.type === "UPDATE_PRODUCT_PRICE") {
      const price = Number(val);
      setContext({ pendingAction: null });
      try {
        const prodRes = await api("/api/products");
        const prods = await prodRes.json();
        const prod = prods.find((p) => p.id === action.productId);
        if (!prod) return getMessage("productNotFound", lang, action.name);

        const res = await api(`/api/products/${action.productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prod.name,
            category: prod.category,
            price: price,
            stock: prod.stock,
            minimum_stock: prod.minimum_stock,
          }),
        });

        if (!res.ok) return "Failed to update product price.";
        dispatchRefresh();
        return getMessage("productPriceUpdated", lang, {
          name: prod.name,
          price: price,
        });
      } catch (err) {
        return `Error updating price: ${err.message}`;
      }
    }

    if (action.type === "UPDATE_PRODUCT_STOCK") {
      const stock = Number(val);
      setContext({ pendingAction: null });
      try {
        const prodRes = await api("/api/products");
        const prods = await prodRes.json();
        const prod = prods.find((p) => p.id === action.productId);
        if (!prod) return getMessage("productNotFound", lang, action.name);

        const res = await api(`/api/products/${action.productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prod.name,
            category: prod.category,
            price: prod.price,
            stock: stock,
            minimum_stock: prod.minimum_stock,
          }),
        });

        if (!res.ok) return "Failed to update product stock.";
        dispatchRefresh();
        return getMessage("productQuantityUpdated", lang, {
          name: prod.name,
          quantity: stock,
        });
      } catch (err) {
        return `Error updating stock: ${err.message}`;
      }
    }

    return getMessage("unsupported", lang);
  }

  // 2. Dangerous Confirmation Replies (Yes / No)
  if (parsedIntent.intent === "CONFIRM_ACTION") {
    const action = parsedIntent.pendingAction;
    setContext({ pendingAction: null });

    // Safety: if action is missing, return gracefully instead of crashing.
    if (!action) {
      return getMessage("unsupported", lang);
    }

    // Voice add-product confirmation: "yes" after confirmAddProduct.
    // Reuses the SAME POST /api/products payload + JWT helper as Products.jsx.
    if (action.type === "ADD_PRODUCT") {
      try {
        const name = (action.name || "").trim();
        const category = (action.category || "").trim();
        const quantity = Number(action.quantity);
        const price = Number(action.price);
        if (!name) return getMessage("askProductName", lang);
        if (!category) return getMessage("askProductCategory", lang, { name });
        if (!Number.isFinite(quantity)) return getMessage("askProductQuantity", lang, name);
        if (!Number.isFinite(price)) return getMessage("askProductPrice", lang, name);
        const res = await api("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category: titleCaseName(category),
            price,
            stock: quantity,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return data.message || "Failed to add product.";
        dispatchRefresh();
        return getMessage("productAdded", lang, {
          name,
          quantity,
          price,
        });
      } catch (err) {
        return `Error adding product: ${err.message}`;
      }
    }

    if (action.target === "product") {
      try {
        const res = await api(`/api/products/${action.id}`, { method: "DELETE" });
        if (!res.ok) return "Failed to delete product.";
        dispatchRefresh();
        return getMessage("productDeleted", lang, action.name);
      } catch (err) {
        return `Error deleting product: ${err.message}`;
      }
    }

    if (action.target === "supplier") {
      try {
        const res = await api(`/api/suppliers/${action.id}`, { method: "DELETE" });
        if (!res.ok) return "Failed to delete supplier.";
        dispatchRefresh();
        return getMessage("supplierDeleted", lang, action.name);
      } catch (err) {
        return `Error deleting supplier: ${err.message}`;
      }
    }

    if (action && action.target === "customer") {
      try {
        const res = await api(`/api/customers/${action.id}`, { method: "DELETE" });
        if (!res.ok) return "Failed to delete customer.";
        return getMessage("customerDeleted", lang, action.name);
      } catch (err) {
        return `Error deleting customer: ${err.message}`;
      }
    }
  }


  if (parsedIntent.intent === "CANCEL_ACTION") {
    setContext({ pendingAction: null });
    return getMessage("deleteCancelled", lang);
  }

  if (parsedIntent.intent === "ASK_CONFIRMATION") {
    // Restore the pending action so the user can still confirm or cancel.
    setContext({ pendingAction: parsedIntent.pendingAction });
    const itemName = parsedIntent.pendingAction && parsedIntent.pendingAction.name
      ? parsedIntent.pendingAction.name
      : "this item";
    return `Please say "yes" to confirm deleting ${itemName}, or "no" to cancel.`;
  }


  // 3. Navigation
  if (parsedIntent.intent === "NAVIGATE") {
    if (navigate) navigate(parsedIntent.path);
    return getMessage("navigating", lang, parsedIntent.pageName);
  }

  if (parsedIntent.intent === "NAVIGATE_BACK") {
    if (navigate) navigate(-1);
    return getMessage("goingBack", lang);
  }

  if (parsedIntent.intent === "LOGOUT") {
    logout();
    if (navigate) navigate("/");
    return getMessage("loggedOut", lang);
  }

  // 4. Product Operations
  if (parsedIntent.intent === "ADD_PRODUCT") {
    let { product, quantity, price, category } = parsedIntent;

    // Comma fallback: "Add laptop, electronics, 10 quantity, price 50000"
    // may merge the category into the extracted name ("Laptop electronics").
    // Split it back so name/category stay correct without touching other flows.
    if (product && !category) {
      const parts = String(product).split(/\s+/).filter(Boolean);
      if (parts.length === 2) {
        product = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        category = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      }
    }

    const hasQty = quantity !== null && quantity !== undefined;
    const hasPrice = price !== null && price !== undefined;

    // Missing name: ask for it first (existing voice interaction).
    if (!product) {
      setContext({
        pendingAction: {
          type: "ADD_PRODUCT",
          step: "NAME",
          name: null,
          category: category || null,
          quantity: hasQty ? quantity : null,
          price: hasPrice ? price : null,
        },
      });
      return getMessage("askProductName", lang);
    }

    // Missing category / quantity / price: ask for the next missing field,
    // preserving everything already heard (existing multi-turn flow).
    if (!category) {
      setContext({
        pendingAction: {
          type: "ADD_PRODUCT",
          step: "CATEGORY",
          name: product,
          category: null,
          quantity: hasQty ? quantity : null,
          price: hasPrice ? price : null,
        },
      });
      return getMessage("askProductCategory", lang, { name: product });
    }

    if (!hasQty) {
      setContext({
        pendingAction: {
          type: "ADD_PRODUCT",
          step: "QUANTITY",
          name: product,
          category,
          quantity: null,
          price: hasPrice ? price : null,
        },
      });
      return getMessage("askProductQuantity", lang, product);
    }

    if (!hasPrice) {
      setContext({
        pendingAction: {
          type: "ADD_PRODUCT",
          step: "PRICE",
          name: product,
          category,
          quantity,
          price: null,
        },
      });
      return getMessage("askProductPrice", lang, product);
    }

    // Full details provided: ask for confirmation before saving
    // (existing confirm flow — actual POST happens on "yes").
    setContext({
      pendingAction: {
        type: "ADD_PRODUCT",
        step: "CONFIRM_ADD",
        name: product,
        category,
        quantity,
        price,
      },
    });
    return getMessage("confirmAddProduct", lang, {
      name: product,
      category,
      quantity,
      price,
    });
  }

  if (parsedIntent.intent === "UPDATE_PRODUCT_PRICE") {
    const products = await fetchProductsList();
    const prod = products.find(
      (p) => p.name.toLowerCase() === (parsedIntent.product || "").toLowerCase()
    );

    if (!prod) {
      return getMessage("productNotFound", lang, parsedIntent.product || "Product");
    }

    if (parsedIntent.price === null || parsedIntent.price === undefined) {
      setContext({
        pendingAction: {
          type: "UPDATE_PRODUCT_PRICE",
          productId: prod.id,
          name: prod.name,
        },
      });
      return getMessage("askUpdatePrice", lang, prod.name);
    }

    try {
      const res = await api(`/api/products/${prod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prod.name,
          category: prod.category,
          price: Number(parsedIntent.price),
          stock: prod.stock,
          minimum_stock: prod.minimum_stock,
        }),
      });

      if (!res.ok) return "Failed to update product price.";
      dispatchRefresh();
      return getMessage("productPriceUpdated", lang, {
        name: prod.name,
        price: Number(parsedIntent.price),
      });
    } catch (err) {
      return `Error updating product price: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "UPDATE_PRODUCT_STOCK") {
    // Fresh stock-update command supersedes any stale pending add/update answer.
    setContext({ pendingAction: null });
    const products = await fetchProductsList();
    const prod = products.find(
      (p) => p.name.toLowerCase() === (parsedIntent.product || "").toLowerCase()
    );

    if (!prod) {
      return getMessage("productNotFound", lang, parsedIntent.product || "Product");
    }

    if (parsedIntent.quantity === null || parsedIntent.quantity === undefined) {
      setContext({
        pendingAction: {
          type: "UPDATE_PRODUCT_STOCK",
          productId: prod.id,
          name: prod.name,
        },
      });
      return getMessage("askUpdateQuantity", lang, prod.name);
    }

    try {
      const res = await api(`/api/products/${prod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prod.name,
          category: prod.category,
          price: prod.price,
          stock: Number(parsedIntent.quantity),
          minimum_stock: prod.minimum_stock,
        }),
      });

      if (!res.ok) return "Failed to update product stock.";
      dispatchRefresh();
      return getMessage("productQuantityUpdated", lang, {
        name: prod.name,
        quantity: Number(parsedIntent.quantity),
      });
    } catch (err) {
      return `Error updating product stock: ${err.message}`;
    }
  }

  // 4b. Generic product update: quantity / price / category / multi-field.
  // Parser emits UPDATE_PRODUCT for these (nlpParser extractProductUpdate).
  // Previously there was NO executor branch for it, so the command fell
  // through to "unsupported" and MySQL was never touched.
  if (parsedIntent.intent === "UPDATE_PRODUCT") {
    // A fresh update command supersedes ANY stale pending add/update answer —
    // clear it so a later bare reply ("Electronics") can't resume the old flow.
    setContext({ pendingAction: null });
    const products = await fetchProductsList();
    const spoken = String(parsedIntent.product || "").trim().toLowerCase();
    const prod = products.find((p) => String(p.name || "").toLowerCase() === spoken);
    if (!prod) {
      return getMessage("productNotFound", lang, parsedIntent.product || "Product");
    }
    const updates = parsedIntent.updates || {};
    const hasQty = updates.quantity !== undefined && updates.quantity !== null;
    const hasPrice = updates.price !== undefined && updates.price !== null;
    const hasCat =
      updates.category !== undefined && updates.category !== null && String(updates.category).trim() !== "";
    if (!hasQty && !hasPrice && !hasCat) {
      // Bare "Update Laptop" -> conversational follow-up (existing architecture).
      setContext({
        pendingAction: { type: "UPDATE_PRODUCT", step: "FIELD", productId: prod.id, name: prod.name },
      });
      return getMessage("askUpdateField", lang, prod.name);
    }
    const clean = {};
    if (hasQty) clean.quantity = updates.quantity;
    if (hasPrice) clean.price = updates.price;
    if (hasCat) clean.category = updates.category;
    return await applyProductUpdates(prod, clean, lang, dispatchRefresh);
  }

  if (parsedIntent.intent === "ADD_PRODUCT_STOCK_INCREMENT") {
    const products = await fetchProductsList();
    const prod = products.find(
      (p) => p.name.toLowerCase() === (parsedIntent.product || "").toLowerCase()
    );

    if (!prod) {
      return getMessage("productNotFound", lang, parsedIntent.product || "Product");
    }

    const newStock = Number(prod.stock || 0) + Number(parsedIntent.increment || 0);
    try {
      const res = await api(`/api/products/${prod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: prod.name,
          category: prod.category,
          price: prod.price,
          stock: newStock,
          minimum_stock: prod.minimum_stock,
        }),
      });

      if (!res.ok) return "Failed to update product stock.";
      dispatchRefresh();
      return getMessage("productQuantityUpdated", lang, {
        name: prod.name,
        quantity: newStock,
      });
    } catch (err) {
      return `Error incrementing stock: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "DELETE_PRODUCT") {
    const products = await fetchProductsList();
    const prod = products.find(
      (p) => p.name.toLowerCase() === (parsedIntent.product || "").toLowerCase()
    );

    if (!prod) {
      return getMessage("productNotFound", lang, parsedIntent.product || "Product");
    }

    // Dangerous action: ask for confirmation first!
    setContext({
      pendingAction: {
        type: "CONFIRM_DELETE",
        target: "product",
        id: prod.id,
        name: prod.name,
      },
    });

    return getMessage("askConfirmDelete", lang, prod.name);
  }

  // 5. Data & Inventory Queries
  if (parsedIntent.intent === "QUERY_TOTAL_PRODUCTS") {
    const products = await fetchProductsList();
    return getMessage("totalProductsCount", lang, products.length);
  }

  if (parsedIntent.intent === "QUERY_LOWEST_STOCK") {
    const products = await fetchProductsList();
    if (products.length === 0) return "No products found in inventory.";
    const sorted = [...products].sort((a, b) => Number(a.stock) - Number(b.stock));
    const lowest = sorted[0];
    return getMessage("lowestStockProduct", lang, {
      name: lowest.name,
      stock: Number(lowest.stock),
    });
  }

  if (parsedIntent.intent === "QUERY_LOW_STOCK") {
    try {
      const res = await api("/api/low-stock-alerts");
      const alerts = await res.json();
      const listStr = alerts.map((a) => a.name).join(", ");
      return getMessage("lowStockList", lang, {
        count: alerts.length,
        list: listStr,
      });
    } catch (err) {
      return `Error checking low stock: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "QUERY_OUT_OF_STOCK") {
    const products = await fetchProductsList();
    const out = products.filter((p) => Number(p.stock) === 0);
    const listStr = out.map((p) => p.name).join(", ");
    return getMessage("outOfStockList", lang, {
      count: out.length,
      list: listStr,
    });
  }

  if (parsedIntent.intent === "QUERY_PRODUCTS_BELOW_QUANTITY") {
    const threshold = Number(parsedIntent.threshold || 10);
    const products = await fetchProductsList();
    const below = products.filter((p) => Number(p.stock) < threshold);
    const listStr = below.map((p) => `${p.name} (${p.stock})`).join(", ");
    return getMessage("productsBelowQuantity", lang, {
      threshold,
      count: below.length,
      list: listStr,
    });
  }

  if (parsedIntent.intent === "QUERY_PRODUCT_STOCK") {
    const products = await fetchProductsList();
    const prod = products.find(
      (p) => p.name.toLowerCase() === (parsedIntent.product || "").toLowerCase()
    );

    if (!prod) {
      return getMessage("productNotFound", lang, parsedIntent.product || "Product");
    }

    return getMessage("productStockInfo", lang, {
      name: prod.name,
      stock: prod.stock,
      price: prod.price,
    });
  }

  // 6. Sales Operations & Reports
  if (parsedIntent.intent === "QUERY_TODAY_SALES") {
    try {
      // Open the existing Reports & Analytics page filtered on today so the
      // totals are also displayed on screen, not only spoken.
      if (navigate) {
        navigate(`/reports?from_date=${todayStr}&to_date=${todayStr}`);
      }
      const res = await api(`/api/reports/summary?from_date=${todayStr}&to_date=${todayStr}`);
      const summary = await res.json();
      if (!res.ok) {
        return summary.message || "Failed to fetch today's sales";
      }
      return getMessage("todaySalesTotal", lang, {
        total: summary.totalSales,
        items: summary.itemsSold,
        count: summary.salesTransactions,
      });
    } catch (err) {
      return `Error fetching today's sales: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "GENERATE_REPORT") {
    const range = parsedIntent.range || null;
    const reportType = parsedIntent.type || null;
    try {
      // Pass the requested filters through the URL so the existing Reports &
      // Analytics page applies them and displays the actual report (summary
      // cards, tables and charts) - not just a spoken confirmation.
      const pageParams = new URLSearchParams();
      const fetchParams = new URLSearchParams();
      if (range && range.from) {
        pageParams.append("from_date", range.from);
        fetchParams.append("from_date", range.from);
      }
      if (range && range.to) {
        pageParams.append("to_date", range.to);
        fetchParams.append("to_date", range.to);
      }
      if (reportType) {
        pageParams.append("tab", reportType);
      }
      if (navigate) {
        const search = pageParams.toString();
        navigate(search ? `/reports?${search}` : "/reports");
      }

      const suffix = fetchParams.toString() ? `?${fetchParams.toString()}` : "";
      const res = await api(`/api/reports/summary${suffix}`);
      const summary = await res.json();
      if (!res.ok) {
        return summary.message || "Failed to generate the report";
      }
      const rangeLabel = (range && range.label) || "All time";
      if (reportType === "purchases") {
        return getMessage("purchaseReportSummary", lang, {
          label: rangeLabel,
          total: summary.totalPurchases,
          items: summary.itemsPurchased,
          count: summary.purchasesTransactions,
        });
      }
      if (reportType === "sales" || range) {
        return getMessage("salesReportSummary", lang, {
          label: rangeLabel,
          total: summary.totalSales,
          items: summary.itemsSold,
          count: summary.salesTransactions,
        });
      }
      return getMessage("cashFlowSummary", lang, {
        sales: summary.totalSales,
        purchases: summary.totalPurchases,
        net: summary.netCashFlow,
      });
    } catch (err) {
      return `Error generating report: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "QUERY_CASH_FLOW") {
    try {
      // Show the overall report on the existing Reports & Analytics page too.
      if (navigate) {
        navigate("/reports");
      }
      const res = await api("/api/reports/summary");
      const summary = await res.json();
      return getMessage("cashFlowSummary", lang, {
        sales: summary.totalSales,
        purchases: summary.totalPurchases,
        net: summary.netCashFlow,
      });
    } catch (err) {
      return `Error fetching cash flow: ${err.message}`;
    }
  }

  // 7. Bills / Invoices
  if (parsedIntent.intent === "GENERATE_BILL") {
    try {
      // Show a sale bill through the existing /api/sales/<id>/bill endpoint.
      const showSaleBill = async (saleId, customerName, billCount) => {
        const billRes = await api(`/api/sales/${saleId}/bill`);
        const billData = await billRes.json().catch(() => ({}));
        if (!billRes.ok) {
          if (customerName) {
            return getMessage("noBillFound", lang, { name: customerName });
          }
          return billData.message || "Failed to load sale bill";
        }
        if (onShowBill && billData.bill) {
          onShowBill(billData.bill);
        }
        if (customerName) {
          return getMessage("customerBillFound", lang, {
            name: customerName,
            count: billCount || 1,
            number: billData.bill ? billData.bill.billNumber : "",
            total: billData.bill ? billData.bill.grandTotal : 0,
          });
        }
        return getMessage("billGenerated", lang, {
          id: saleId,
          total: billData.bill ? billData.bill.grandTotal : 0,
        });
      };

      // Look up an invoice row by invoice number / id using the existing
      // /api/invoices endpoint.
      const findInvoice = async () => {
        const invRes = await api("/api/invoices");
        const invoices = await invRes.json().catch(() => []);
        if (!Array.isArray(invoices)) return null;
        if (parsedIntent.invoiceNumber) {
          const target = normalizeInvoiceNumber(parsedIntent.invoiceNumber);
          return (
            invoices.find(
              (inv) => normalizeInvoiceNumber(inv.invoice_number) === target
            ) || null
          );
        }
        return (
          invoices.find(
            (inv) => Number(inv.id) === Number(parsedIntent.invoiceId)
          ) || null
        );
      };

      // 1. "Show invoice INV-2026-0005" / "Show invoice number 5".
      if (parsedIntent.invoiceNumber || parsedIntent.invoiceId != null) {
        const invoice = await findInvoice();
        if (!invoice) {
          return getMessage("invoiceNotFound", lang, {
            number:
              parsedIntent.invoiceNumber ||
              (parsedIntent.invoiceId != null
                ? `#${parsedIntent.invoiceId}`
                : ""),
          });
        }
        if (invoice.sale_id) {
          return await showSaleBill(invoice.sale_id);
        }
        // Manually created invoice (not linked to a sale): render it with the
        // existing BillModal, in the exact shape the backend bill builder uses.
        const quantity = Number(invoice.quantity || 0);
        const unitPrice = Number(invoice.price || 0);
        const amount = roundMoney(unitPrice * quantity);
        const grandTotal = roundMoney(invoice.total != null ? invoice.total : amount);
        if (onShowBill) {
          onShowBill({
            type: "sale",
            title: "SALES INVOICE",
            billNumber: invoice.invoice_number || `INV-${invoice.id}`,
            date: formatBillDateDMY(invoice.invoice_date),
            time: null,
            partyLabel: "Customer",
            partyName: invoice.customer,
            items: [
              {
                name: invoice.product,
                quantity,
                unitPrice,
                amount,
              },
            ],
            subtotal: amount,
            tax: null,
            grandTotal,
            paymentMethod: null,
            amountReceived: null,
            change: null,
          });
        }
        return getMessage("customerBillFound", lang, {
          name: invoice.customer || "customer",
          count: 1,
          number: invoice.invoice_number || `INV-${invoice.id}`,
          total: grandTotal,
        });
      }

      // 2. "Show Seetha's bill" / "Show Ram's latest bill" / Telugu & Hindi
      //    equivalents: match the spoken customer name against the existing
      //    sales records (normalized, case-insensitive, word-boundary safe).
      if (parsedIntent.customerRaw) {
        const salesRes = await api("/api/sales");
        const sales = await salesRes.json().catch(() => []);
        const list = Array.isArray(sales) ? sales : [];
        const spoken = parsedIntent.customerRaw;
        const matches = list.filter((sale) => isSameCustomer(sale.customer, spoken));
        if (matches.length === 0) {
          // Never fall back to another person's bill.
          return getMessage("noBillFound", lang, { name: titleCaseName(spoken) });
        }
        // Newest sale first (highest id). Both "latest bill" and the default
        // single-bill display use the most recent matching sale.
        matches.sort((a, b) => Number(b.id) - Number(a.id));
        const chosen = matches[0];
        return await showSaleBill(chosen.id, chosen.customer, matches.length);
      }

      // 3. "Generate bill for sale 12" (explicit sale id, existing behaviour).
      if (parsedIntent.saleId != null) {
        return await showSaleBill(parsedIntent.saleId);
      }

      // 4. No person/invoice mentioned: keep the previous behaviour of showing
      //    the most recent sale's bill.
      const salesRes = await api("/api/sales");
      const sales = await salesRes.json();
      if (!sales || sales.length === 0) {
        return getMessage("noSalesFound", lang);
      }
      return await showSaleBill(sales[sales.length - 1].id);
    } catch (err) {
      return `Error generating bill: ${err.message}`;
    }
  }

  // 8. AI Stock Prediction
  if (parsedIntent.intent === "AI_PREDICT_PRODUCT") {
    const products = await fetchProductsList();
    const prod = products.find(
      (p) => p.name.toLowerCase() === (parsedIntent.product || "").toLowerCase()
    );

    if (!prod) {
      return getMessage("productNotFound", lang, parsedIntent.product || "Product");
    }

    try {
      const res = await api(`/api/ai-stock-prediction/${prod.id}?days=30`);
      const data = await res.json();
      if (!res.ok) return data.message || "Prediction failed";

      return getMessage("aiPredictionResult", lang, {
        name: data.productName,
        daily: data.averageDailySales,
        expected: data.expectedSales,
        remaining: data.remainingStock,
        recommended: data.recommendedQuantity,
        status: data.status || data.recommendation || "Sufficient",
      });
    } catch (err) {
      return `Error generating AI prediction: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "AI_PREDICT_RECOMMENDATIONS") {
    try {
      const res = await api("/api/procurement-recommendations");
      const list = await res.json();
      const listStr = list.map((item) => `${item.productName} (${item.recommendedQuantity})`).join(", ");
      return getMessage("procurementList", lang, {
        count: list.length,
        list: listStr,
      });
    } catch (err) {
      return `Error fetching procurement recommendations: ${err.message}`;
    }
  }

  // 9. Suppliers
  if (parsedIntent.intent === "DELETE_SUPPLIER") {
    try {
      const res = await api("/api/suppliers");
      const suppliers = await res.json();
      const sup = suppliers.find(
        (s) => s.name.toLowerCase().includes((parsedIntent.name || "").toLowerCase())
      );
      if (!sup) return `Supplier ${parsedIntent.name || ""} not found.`;

      setContext({
        pendingAction: {
          type: "CONFIRM_DELETE",
          target: "supplier",
          id: sup.id,
          name: sup.name,
        },
      });
      return getMessage("askConfirmDeleteSupplier", lang, sup.name);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "ADD_SUPPLIER") {
    if (!parsedIntent.name) {
      return "Please provide the supplier name.";
    }
    try {
      const res = await api("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsedIntent.name,
          contact: "",
          email: "",
          address: "",
        }),
      });
      if (!res.ok) return "Failed to add supplier.";
      dispatchRefresh();
      return getMessage("supplierAdded", lang, parsedIntent.name);
    } catch (err) {
      return `Error adding supplier: ${err.message}`;
    }
  }

  // 10. Purchases & Sales quick add
  if (parsedIntent.intent === "ADD_PURCHASE") {
    const { product, quantity, price, supplierRaw } = parsedIntent;
    if (!product || !quantity || !price) {
      return "Please provide product, quantity, and price for the purchase.";
    }
    try {
      const supRes = await api("/api/suppliers");
      const sups = await supRes.json();
      let supplierName = null;
      if (supplierRaw) {
        const matches = (Array.isArray(sups) ? sups : []).filter((s) => isSameCustomer(s.name, supplierRaw));
        if (matches.length === 0) {
          return getMessage("supplierNotFound", lang, { name: titleCaseName(supplierRaw) });
        }
        supplierName = matches[0].name;
      } else {
        // No supplier spoken: keep the previous default (first supplier).
        supplierName = sups.length > 0 ? sups[0].name : "Standard Supplier";
      }

      const res = await api("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: supplierName,
          product: product,
          quantity: Number(quantity),
          price: Number(price),
          purchase_date: todayStr,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.message || "Failed to add purchase.";
      }

      dispatchRefresh();
      return getMessage("purchaseAddedForSupplier", lang, { supplier: supplierName, product, quantity, price });
    } catch (err) {
      return `Error adding purchase: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "ADD_SALE") {
    const { product, quantity, price } = parsedIntent;
    if (!product || !quantity) {
      return "Please provide product, quantity, and price for the sale.";
    }
    try {
      const prodRes = await api("/api/products");
      const prods = await prodRes.json();
      const prod = prods.find((p) => p.name.toLowerCase() === product.toLowerCase());
      if (!prod) return getMessage("productNotFound", lang, product);

      const salePrice = price !== null ? Number(price) : Number(prod.price);

      const res = await api("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: "Voice Customer",
          product: prod.name,
          quantity: Number(quantity),
          price: salePrice,
          sale_date: todayStr,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return err.message || "Failed to add sale.";
      }

      dispatchRefresh();
      return getMessage("saleAdded", lang, { product: prod.name, quantity, price: salePrice });
    } catch (err) {
      return `Error adding sale: ${err.message}`;
    }
  }

  if (parsedIntent.intent === "SHOW_TODAY_PURCHASES") {
    if (navigate) navigate("/purchases");
    return getMessage("navigating", lang, "Purchases");
  }


if (parsedIntent.intent === "GENERATE_PURCHASE_BILL") {
  try {
    const res = await api("/api/purchases");
    const purchases = await res.json().catch(() => []);
    const list = Array.isArray(purchases) ? purchases : [];

    const supplierRaw = parsedIntent.supplierRaw;
    let matches = list;
    if (supplierRaw) {
      matches = list.filter((p) => isSameCustomer(p.supplier, supplierRaw));
      if (matches.length === 0) {
        return getMessage("noPurchasesForSupplier", lang, { name: titleCaseName(supplierRaw) });
      }
      matches.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (list.length > 0) {
      matches = [...list].sort((a, b) => Number(b.id) - Number(a.id));
    }

    if (matches.length === 0) {
      return getMessage("noPurchasesFound", lang);
    }

    const chosen = matches[0];
    const billRes = await api(`/api/purchases/${chosen.id}/bill`);
    const billData = await billRes.json().catch(() => ({}));
    if (!billRes.ok) {
      return billData.message || "Failed to load purchase bill";
    }

    if (onShowBill && billData.bill) onShowBill(billData.bill);

    return getMessage("purchaseBillFound", lang, {
      name: billData.bill ? billData.bill.partyName : chosen.supplier,
      number: billData.bill ? billData.bill.billNumber : "",
      total: billData.bill ? billData.bill.grandTotal : 0,
    });
  } catch (err) {
    return `Error fetching purchase bill: ${err.message}`;
  }
}
  // 11. Unsupported or Unknown Command
  return getMessage("unsupported", lang);
}

// ---------------------------------------------------------------------------
// Product update helper — PUT must send the full product (backend replaces
// the document). Only changed fields are new values; unchanged fields are
// re-sent from the existing record.
// ---------------------------------------------------------------------------
async function applyProductUpdates(prod, updates, lang = "en", dispatchRefresh = null) {
  const body = {
    name: prod.name,
    category: updates.category !== undefined ? titleCaseName(updates.category) : prod.category,
    price: updates.price !== undefined ? Number(updates.price) : prod.price,
    stock: updates.quantity !== undefined ? Number(updates.quantity) : prod.stock,
    minimum_stock: prod.minimum_stock,
  };

  try {
    const res = await api(`/api/products/${prod.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.message || "Failed to update product.";
    }
    if (typeof dispatchRefresh === "function") dispatchRefresh();
    else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("inventory-updated"));
    }

    const details = [];
    if (updates.category !== undefined) details.push(`category ${body.category}`);
    if (updates.price !== undefined) details.push(`price ₹${Number(updates.price).toLocaleString("en-IN")}`);
    if (updates.quantity !== undefined) details.push(`quantity ${Number(updates.quantity)}`);
    return getMessage("productUpdated", lang, { name: prod.name, details: details.join(", ") });
  } catch (err) {
    return `Error updating product: ${err.message}`;
  }
}

// Add a sale and show the generated bill via the existing BillModal.
async function createSaleAndShowBill(prod, quantity, price, customerName) {
  const salePrice = price !== null && price !== undefined ? Number(price) : Number(prod.price);
  const customer = customerName ? titleCaseName(customerName) : "Voice Customer";
  try {
    const res = await api("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer,
        product: prod.name,
        quantity: Number(quantity),
        price: salePrice,
        sale_date: todayStr,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return err.message || "Failed to add sale.";
    }

    const data = await res.json();
    if (onShowBill && data.bill) onShowBill(data.bill);
    dispatchRefresh();
    return getMessage(customerName ? "saleAddedForCustomer" : "saleAdded", lang, {
      customer,
      product: prod.name,
      quantity: Number(quantity),
      price: salePrice,
    });
  } catch (err) {
    return `Error adding sale: ${err.message}`;
  }
}

// Add a purchase and show the generated purchase bill via the existing BillModal.
async function addPurchaseAndShowBill(prod, quantity, price, supplierRaw) {
  const supplier = supplierRaw ? titleCaseName(supplierRaw) : "Standard Supplier";
  try {
    const res = await api("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplier,
        product: prod.name,
        quantity: Number(quantity),
        price: Number(price),
        purchase_date: todayStr,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return err.message || "Failed to add purchase.";
    }

    const data = await res.json();
    if (onShowBill && data.bill) onShowBill(data.bill);
    dispatchRefresh();
    return getMessage("purchaseAddedForSupplier", lang, { supplier, product: prod.name, quantity, price });
  } catch (err) {
    return `Error adding purchase: ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// Purchase bill by supplier — opens the existing report page filtered by
// that supplier so the whole purchase bill (single or list) is visible.
// ---------------------------------------------------------------------------
