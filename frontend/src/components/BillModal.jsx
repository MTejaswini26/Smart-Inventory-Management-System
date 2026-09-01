import { useEffect } from "react";
import "./BillModal.css";

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function BillModal({ bill, onClose }) {
  // While a bill is open, tag <body> with "bill-print-mode" so the
  // "print only the receipt" rules in BillModal.css apply. CSS imports are
  // global in this app, so without this tag those print rules would hide
  // every element of ANY page being printed (e.g. Reports & Analytics),
  // producing blank paper. The hook is intentionally declared before the
  // early return below to respect the Rules of Hooks.
  useEffect(() => {
    if (!bill) {
      return undefined;
    }

    document.body.classList.add("bill-print-mode");

    return () => {
      document.body.classList.remove("bill-print-mode");
    };
  }, [bill]);

  if (!bill) {
    return null;
  }

  const isSale = bill.type === "sale";
  const items = Array.isArray(bill.items) ? bill.items : [];
  const hasNegativeChange = bill.change != null && bill.change < 0;

  return (
    <div
      className="bill-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={bill.title || "Bill"}
    >
      <div
        className="bill-modal-paper"
        onClick={(event) => event.stopPropagation()}
      >
        {/* STORE HEADER */}
        <div className="bill-store-name">SMART INVENTORY MANAGEMENT</div>
        <div className="bill-subtitle">
          {bill.title || (isSale ? "SALES INVOICE" : "PURCHASE BILL")}
        </div>

        <div className="bill-divider" />

        {/* META */}
        <div className="bill-meta">
          <div className="bill-meta-row">
            <span>{isSale ? "Invoice No" : "Purchase No"}:</span>
            <strong>{bill.billNumber}</strong>
          </div>

          <div className="bill-meta-row">
            <span>Date:</span>
            <strong>{bill.date}</strong>
          </div>

          {bill.time && (
            <div className="bill-meta-row">
              <span>Time:</span>
              <strong>{bill.time}</strong>
            </div>
          )}

          {bill.partyName && (
            <div className="bill-meta-row">
              <span>{bill.partyLabel || "Customer"}:</span>
              <strong>{bill.partyName}</strong>
            </div>
          )}
        </div>

        <div className="bill-divider dashed" />

        {/* ITEMS */}
        <table className="bill-items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.unitPrice)}</td>
                <td>{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-divider dashed" />

        {/* TOTALS */}
        <div className="bill-totals">
          <div className="bill-total-row">
            <span>Subtotal</span>
            <span>{formatMoney(bill.subtotal)}</span>
          </div>

          {bill.tax != null && Number(bill.tax) !== 0 && (
            <div className="bill-total-row">
              <span>Tax / GST</span>
              <span>{formatMoney(bill.tax)}</span>
            </div>
          )}

          <div className="bill-total-row grand">
            <span>Grand Total</span>
            <span>{formatMoney(bill.grandTotal)}</span>
          </div>

          {isSale && bill.paymentMethod && (
            <div className="bill-total-row">
              <span>Payment Method</span>
              <span>{bill.paymentMethod}</span>
            </div>
          )}

          {isSale && bill.amountReceived != null && !hasNegativeChange && (
            <div className="bill-total-row">
              <span>Amount Received</span>
              <span>{formatMoney(bill.amountReceived)}</span>
            </div>
          )}

          {isSale && bill.change != null && !hasNegativeChange && (
            <div className="bill-total-row">
              <span>Change</span>
              <span>{formatMoney(bill.change)}</span>
            </div>
          )}

          {!isSale && bill.amountPaid != null && (
            <div className="bill-total-row">
              <span>Amount Paid</span>
              <span>{formatMoney(bill.amountPaid)}</span>
            </div>
          )}
        </div>

        <div className="bill-divider" />

        {/* FOOTER */}
        <div className="bill-thanks">
          {isSale ? "Thank You! Visit Again" : "Goods received in good condition"}
        </div>

        {hasNegativeChange && (
          <div className="bill-balance-note">
            Balance due: {formatMoney(Math.abs(bill.change))}
          </div>
        )}

        <div className="bill-actions">
          <button
            type="button"
            className="bill-print-btn"
            onClick={() => window.print()}
          >
            🖨️ Print
          </button>

          <button
            type="button"
            className="bill-close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default BillModal;
