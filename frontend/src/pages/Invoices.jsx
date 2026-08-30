import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Invoices.css";
function Invoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [newInvoice, setNewInvoice] = useState({
    customer: "",
    product: "",
    quantity: "",
    price: "",
    date: ""
  });

  // =============================
  // GET INVOICES FROM MYSQL
  // =============================

  const loadInvoices = async () => {
    try {
      const response = await api(
        "/api/invoices"
      );

      if (!response.ok) {
        throw new Error("Failed to load invoices");
      }

      const data = await response.json();

      setInvoices(data);

    } catch (error) {
      console.error("Error fetching invoices:", error);
      alert("Failed to load invoices");
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);


  // =============================
  // ADD INVOICE
  // =============================

  const addInvoice = async (e) => {
    e.preventDefault();

    const quantity = Number(newInvoice.quantity);
    const price = Number(newInvoice.price);
    const total = quantity * price;

    const invoiceData = {
      customer: newInvoice.customer,
      product: newInvoice.product,
      quantity: quantity,
      price: price,
      total: total,
      invoice_date: newInvoice.date
    };

    try {

      const response = await api(
        "/api/invoices",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(invoiceData)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add invoice");
      }

      await loadInvoices();

      setNewInvoice({
        customer: "",
        product: "",
        quantity: "",
        price: "",
        date: ""
      });

      setShowForm(false);

      alert("Invoice added successfully!");

    } catch (error) {

      console.error("Error adding invoice:", error);

      alert("Failed to add invoice");
    }
  };


  // =============================
  // START EDIT
  // =============================

  const startEdit = (invoice) => {

    setEditInvoice({
      ...invoice,

      date: invoice.invoice_date
        ? String(invoice.invoice_date).substring(0, 10)
        : ""
    });
  };


  // =============================
  // UPDATE INVOICE
  // =============================

  const updateInvoice = async (e) => {

    e.preventDefault();

    const quantity = Number(editInvoice.quantity);
    const price = Number(editInvoice.price);
    const total = quantity * price;

    const invoiceData = {
      customer: editInvoice.customer,
      product: editInvoice.product,
      quantity: quantity,
      price: price,
      total: total,
      invoice_date: editInvoice.date
    };

    try {

      const response = await api(
        `/api/invoices/${editInvoice.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(invoiceData)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update invoice");
      }

      await loadInvoices();

      setEditInvoice(null);

      alert("Invoice updated successfully!");

    } catch (error) {

      console.error("Error updating invoice:", error);

      alert("Failed to update invoice");
    }
  };


  // =============================
  // DELETE INVOICE
  // =============================

  const deleteInvoice = async (id) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this invoice?"
    );

    if (!confirmDelete) {
      return;
    }

    try {

      const response = await api(
        `/api/invoices/${id}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }

      await loadInvoices();

      alert("Invoice deleted successfully!");

    } catch (error) {

      console.error("Error deleting invoice:", error);

      alert("Failed to delete invoice");
    }
  };


  // =============================
  // SEARCH
  // =============================

  const filteredInvoices = invoices.filter((invoice) => {

    const customer = invoice.customer || "";
    const product = invoice.product || "";

    return (
      customer
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||

      product
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });


  // =============================
  // PAGE
  // =============================

  return (
    <div className="invoices-page">

      {/* HEADER */}

      <div className="invoices-header">

        <div>

          <h1>Invoice Management</h1>

          <p>
            Create and manage customer invoices
          </p>

        </div>

        <div>

          <button
            className="invoice-add-btn"
            onClick={() => setShowForm(true)}
          >
            + Create Invoice
          </button>

          <button
            className="invoice-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>

      </div>


      {/* ADD INVOICE FORM */}

      {showForm && (

        <div className="invoice-form">

          <h2>Create New Invoice</h2>

          <form onSubmit={addInvoice}>

            <div className="invoice-form-group">

              <label>
                Customer Name
              </label>

              <input
                type="text"
                placeholder="Enter customer name"
                value={newInvoice.customer}

                onChange={(e) =>
                  setNewInvoice({
                    ...newInvoice,
                    customer: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Product
              </label>

              <input
                type="text"
                placeholder="Enter product name"
                value={newInvoice.product}

                onChange={(e) =>
                  setNewInvoice({
                    ...newInvoice,
                    product: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Quantity
              </label>

              <input
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={newInvoice.quantity}

                onChange={(e) =>
                  setNewInvoice({
                    ...newInvoice,
                    quantity: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Price
              </label>

              <input
                type="number"
                min="0"
                placeholder="Enter price"
                value={newInvoice.price}

                onChange={(e) =>
                  setNewInvoice({
                    ...newInvoice,
                    price: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Invoice Date
              </label>

              <input
                type="date"
                value={newInvoice.date}

                onChange={(e) =>
                  setNewInvoice({
                    ...newInvoice,
                    date: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-buttons">

              <button
                type="submit"
                className="invoice-save-btn"
              >
                Create Invoice
              </button>

              <button
                type="button"
                className="invoice-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}


      {/* EDIT INVOICE FORM */}

      {editInvoice && (

        <div className="invoice-form">

          <h2>Edit Invoice</h2>

          <form onSubmit={updateInvoice}>

            <div className="invoice-form-group">

              <label>
                Customer Name
              </label>

              <input
                type="text"
                value={editInvoice.customer}

                onChange={(e) =>
                  setEditInvoice({
                    ...editInvoice,
                    customer: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Product
              </label>

              <input
                type="text"
                value={editInvoice.product}

                onChange={(e) =>
                  setEditInvoice({
                    ...editInvoice,
                    product: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Quantity
              </label>

              <input
                type="number"
                min="1"
                value={editInvoice.quantity}

                onChange={(e) =>
                  setEditInvoice({
                    ...editInvoice,
                    quantity: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Price
              </label>

              <input
                type="number"
                min="0"
                value={editInvoice.price}

                onChange={(e) =>
                  setEditInvoice({
                    ...editInvoice,
                    price: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-group">

              <label>
                Invoice Date
              </label>

              <input
                type="date"
                value={editInvoice.date}

                onChange={(e) =>
                  setEditInvoice({
                    ...editInvoice,
                    date: e.target.value
                  })
                }

                required
              />

            </div>


            <div className="invoice-form-buttons">

              <button
                type="submit"
                className="invoice-save-btn"
              >
                Update Invoice
              </button>

              <button
                type="button"
                className="invoice-cancel-btn"
                onClick={() => setEditInvoice(null)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}


      {/* SEARCH */}

      <div className="invoice-search">

        <input
          type="text"
          placeholder="🔍 Search by customer or product"
          value={searchTerm}

          onChange={(e) =>
            setSearchTerm(e.target.value)
          }

        />

      </div>


      {/* INVOICE TABLE */}

      <div className="invoice-table-container">

        <table>

          <thead>

            <tr>

              <th>ID</th>
              <th>Invoice Number</th>
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

            {filteredInvoices.map((invoice) => (

              <tr key={invoice.id}>

                <td>
                  {invoice.id}
                </td>

                <td>
                  {invoice.invoice_number || `#${invoice.id}`}
                </td>

                <td>
                  {invoice.customer}
                </td>

                <td>
                  {invoice.product}
                </td>

                <td>
                  {invoice.quantity}
                </td>

                <td>
                  ₹{Number(invoice.price).toLocaleString()}
                </td>

                <td>
                  ₹{Number(invoice.total).toLocaleString()}
                </td>

                <td>
                  {invoice.invoice_date
                    ? String(invoice.invoice_date).substring(0, 10)
                    : ""}
                </td>

                <td>

                  <button
                    className="invoice-edit-btn"
                    onClick={() =>
                      startEdit(invoice)
                    }
                  >
                    Edit
                  </button>


                  <button
                    className="invoice-delete-btn"
                    onClick={() =>
                      deleteInvoice(invoice.id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Invoices;