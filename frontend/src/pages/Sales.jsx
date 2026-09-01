import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import BillModal from "../components/BillModal";
import "./Sales.css";
function Sales() {
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saleBill, setSaleBill] = useState(null);

  const [newSale, setNewSale] = useState({
    customer: "",
    product: "",
    quantity: "",
    price: "",
    date: "",
    paymentMethod: "",
    amountReceived: ""
  });

  const [submitting, setSubmitting] = useState(false);

  // =========================
  // GET SALES FROM MYSQL
  // =========================

  useEffect(() => {
    api("/api/sales")
      .then((response) => response.json())
      .then((data) => {
        setSales(data);
      })
      .catch((error) => {
        console.error("Error fetching sales:", error);
      });
  }, []);

  // =========================
  // ADD SALE
  // =========================

  const addSale = async (e) => {
    e.preventDefault();

    // Prevent accidental double submission (which would create a duplicate
    // sale and a second invoice).
    if (submitting) {
      return;
    }

    const sale = {
      customer: newSale.customer,
      product: newSale.product,
      quantity: Number(newSale.quantity),
      price: Number(newSale.price),
      sale_date: newSale.date,
      payment_method: newSale.paymentMethod || null,
      amount_received:
        newSale.amountReceived === "" ? null : Number(newSale.amountReceived)
    };

    try {
      setSubmitting(true);

      const response = await api(
        "/api/sales",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(sale)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      // Reload sales from MySQL
      const salesResponse = await api(
        "/api/sales"
      );

      const salesData = await salesResponse.json();

      setSales(salesData);

      setNewSale({
        customer: "",
        product: "",
        quantity: "",
        price: "",
        date: "",
        paymentMethod: "",
        amountReceived: ""
      });

      setShowForm(false);

      // Supermarket-style bill generated from the saved sale/invoice.
      if (data.bill) {
        setSaleBill(data.bill);
      }

    } catch (error) {
      console.error("Error adding sale:", error);
      alert("Failed to add sale");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // VIEW SALE BILL (from database values)
  // =========================

  const openSaleBill = async (saleId) => {
    try {
      const response = await api(`/api/sales/${saleId}/bill`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load bill");
      }

      setSaleBill(data.bill);
    } catch (error) {
      console.error("Error loading sale bill:", error);
      alert("Failed to load sale bill");
    }
  };

  // =========================
  // START EDIT
  // =========================

  const startEdit = (sale) => {
    setEditSale({
      ...sale,
      date: sale.sale_date
    });
  };

  // =========================
  // UPDATE SALE
  // =========================

  const updateSale = async (e) => {
    e.preventDefault();

    const updatedSale = {
      customer: editSale.customer,
      product: editSale.product,
      quantity: Number(editSale.quantity),
      price: Number(editSale.price),
      sale_date: editSale.date,
      payment_method: editSale.payment_method || null,
      amount_received:
        editSale.amount_received === "" || editSale.amount_received === null
          ? null
          : Number(editSale.amount_received)
    };

    try {
      const response = await api(
        `/api/sales/${editSale.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatedSale)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      // Reload sales from MySQL
      const salesResponse = await api(
        "/api/sales"
      );

      const salesData = await salesResponse.json();

      setSales(salesData);

      setEditSale(null);

    } catch (error) {
      console.error("Error updating sale:", error);
      alert("Failed to update sale");
    }
  };

  // =========================
  // DELETE SALE
  // =========================

  const deleteSale = async (id) => {
    try {
      const response = await api(
        `/api/sales/${id}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      // Reload sales from MySQL
      const salesResponse = await api(
        "/api/sales"
      );

      const salesData = await salesResponse.json();

      setSales(salesData);

    } catch (error) {
      console.error("Error deleting sale:", error);
      alert("Failed to delete sale");
    }
  };

  // =========================
  // SEARCH
  // =========================

  const filteredSales = sales.filter((sale) =>
    sale.customer
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    sale.product
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sales-page">

      {/* HEADER */}

      <div className="sales-header">

        <div>

          <h1>Sales Management</h1>

          <p>
            Manage customer sales and transactions
          </p>

        </div>

        <div>

          <button
            className="sale-add-btn"
            onClick={() => setShowForm(true)}
          >
            + Add Sale
          </button>

          <button
            className="sale-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>

      </div>


      {/* ADD SALE FORM */}

      {showForm && (

        <div className="sale-form">

          <h2>Add New Sale</h2>

          <form onSubmit={addSale}>

            <div className="sale-form-group">

              <label>Customer Name</label>

              <input
                type="text"
                placeholder="Enter customer name"
                value={newSale.customer}
                onChange={(e) =>
                  setNewSale({
                    ...newSale,
                    customer: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Product</label>

              <input
                type="text"
                placeholder="Enter product name"
                value={newSale.product}
                onChange={(e) =>
                  setNewSale({
                    ...newSale,
                    product: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Quantity</label>

              <input
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={newSale.quantity}
                onChange={(e) =>
                  setNewSale({
                    ...newSale,
                    quantity: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Price</label>

              <input
                type="number"
                min="0"
                placeholder="Enter price"
                value={newSale.price}
                onChange={(e) =>
                  setNewSale({
                    ...newSale,
                    price: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Sale Date</label>

              <input
                type="date"
                value={newSale.date}
                onChange={(e) =>
                  setNewSale({
                    ...newSale,
                    date: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Payment Method (optional)</label>

              <select
                value={newSale.paymentMethod}
                onChange={(e) =>
                  setNewSale({
                    ...newSale,
                    paymentMethod: e.target.value
                  })
                }
              >

                <option value="">Not specified</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Other">Other</option>

              </select>

            </div>


            <div className="sale-form-group">

              <label>Amount Received (optional)</label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount received"
                value={newSale.amountReceived}
                onChange={(e) =>
                  setNewSale({
                    ...newSale,
                    amountReceived: e.target.value
                  })
                }
              />

            </div>


            <div className="sale-form-buttons">

              <button
                type="submit"
                className="sale-save-btn"
                disabled={submitting}
              >
                Add Sale
              </button>

              <button
                type="button"
                className="sale-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>

      )}


      {/* EDIT SALE FORM */}

      {editSale && (

        <div className="sale-form">

          <h2>Edit Sale</h2>

          <form onSubmit={updateSale}>

            <div className="sale-form-group">

              <label>Customer Name</label>

              <input
                type="text"
                value={editSale.customer}
                onChange={(e) =>
                  setEditSale({
                    ...editSale,
                    customer: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Product</label>

              <input
                type="text"
                value={editSale.product}
                onChange={(e) =>
                  setEditSale({
                    ...editSale,
                    product: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Quantity</label>

              <input
                type="number"
                min="1"
                value={editSale.quantity}
                onChange={(e) =>
                  setEditSale({
                    ...editSale,
                    quantity: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Price</label>

              <input
                type="number"
                min="0"
                value={editSale.price}
                onChange={(e) =>
                  setEditSale({
                    ...editSale,
                    price: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-group">

              <label>Sale Date</label>

              <input
                type="date"
                value={editSale.date}
                onChange={(e) =>
                  setEditSale({
                    ...editSale,
                    date: e.target.value
                  })
                }
                required
              />

            </div>


            <div className="sale-form-buttons">

              <button
                type="submit"
                className="sale-save-btn"
              >
                Update Sale
              </button>

              <button
                type="button"
                className="sale-cancel-btn"
                onClick={() => setEditSale(null)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>

      )}


      {/* SEARCH */}

      <div className="sale-search">

        <input
          type="text"
          placeholder="🔍 Search by customer or product"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

      </div>


      {/* SALES TABLE */}

      <div className="sale-table-container">

        <table>

          <thead>

            <tr>

              <th>ID</th>

              <th>Customer</th>

              <th>Product</th>

              <th>Quantity</th>

              <th>Price</th>

              <th>Total</th>

              <th>Date</th>

              <th>Actions</th>

            </tr>

          </thead>


          <tbody>

            {filteredSales.map((sale) => (

              <tr key={sale.id}>

                <td>{sale.id}</td>

                <td>{sale.customer}</td>

                <td>{sale.product}</td>

                <td>{sale.quantity}</td>

                <td>
                  ₹{Number(sale.price).toLocaleString()}
                </td>

                <td>
                  ₹{(
                    Number(sale.quantity) *
                    Number(sale.price)
                  ).toLocaleString()}
                </td>

                <td>{sale.sale_date}</td>

                <td>

                  <button
                    className="sale-edit-btn"
                    onClick={() => startEdit(sale)}
                  >
                    Edit
                  </button>

                  <button
                    className="sale-bill-btn"
                    onClick={() => openSaleBill(sale.id)}
                  >
                    Bill
                  </button>

                  <button
                    className="sale-delete-btn"
                    onClick={() => deleteSale(sale.id)}
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* SALES BILL MODAL */}
      <BillModal bill={saleBill} onClose={() => setSaleBill(null)} />

    </div>
  );
}

export default Sales;