import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
// Reuses the existing Suppliers styling so the Customers page looks exactly
// like the other management pages without changing any existing CSS.
import "./Suppliers.css";

function Customers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  // LOAD CUSTOMERS FROM MYSQL
  useEffect(() => {
    api("/api/customers")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load customers");
        }

        return response.json();
      })
      .then((data) => {
        setCustomers(data);
      })
      .catch((error) => {
        console.error("Error loading customers:", error);
      });
  }, []);

  // ADD CUSTOMER
  const addCustomer = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        "/api/customers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newCustomer)
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to add customer");
      }

      if (data.existing) {
        alert("Customer already exists!");
        setShowForm(false);
        return;
      }

      const customer = {
        id: data.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address
      };

      setCustomers((currentCustomers) => [
        ...currentCustomers,
        customer
      ]);

      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        address: ""
      });

      setShowForm(false);

      alert("Customer added successfully!");

    } catch (error) {
      console.error("Error adding customer:", error);
      alert("Failed to add customer");
    }
  };

  // START EDIT
  const startEdit = (customer) => {
    setEditCustomer({
      ...customer
    });
  };

  // UPDATE CUSTOMER
  const updateCustomer = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        `/api/customers/${editCustomer.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: editCustomer.name,
            phone: editCustomer.phone,
            email: editCustomer.email,
            address: editCustomer.address
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update customer");
      }

      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.id === editCustomer.id
            ? editCustomer
            : customer
        )
      );

      setEditCustomer(null);

      alert("Customer updated successfully!");

    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer");
    }
  };

  // DELETE CUSTOMER
  const deleteCustomer = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this customer?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api(
        `/api/customers/${id}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete customer");
      }

      setCustomers((currentCustomers) =>
        currentCustomers.filter(
          (customer) => customer.id !== id
        )
      );

      alert("Customer deleted successfully!");

    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer");
    }
  };

  // SEARCH
  const filteredCustomers = customers.filter((customer) =>
    customer.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    customer.phone
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    customer.email
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    customer.address
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="suppliers-page">

      {/* HEADER */}
      <div className="suppliers-header">

        <div>
          <h1>Customer Management</h1>

          <p>
            Manage your customers and customer information
          </p>
        </div>

        <div>
          <button
            className="supplier-add-btn"
            onClick={() => setShowForm(true)}
          >
            + Add Customer
          </button>

          <button
            className="supplier-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </div>

      </div>

      {/* ADD CUSTOMER FORM */}
      {showForm && (
        <div className="supplier-form">

          <h2>Add New Customer</h2>

          <form onSubmit={addCustomer}>
            <div className="supplier-form-group">

              <label>Customer Name</label>

              <input
                type="text"
                placeholder="Enter customer name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    name: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Phone</label>

              <input
                type="tel"
                placeholder="Enter phone number"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    phone: e.target.value
                  })
                }
              />

            </div>

            <div className="supplier-form-group">

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter email address"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    email: e.target.value
                  })
                }
              />

            </div>

            <div className="supplier-form-group">

              <label>Address</label>

              <input
                type="text"
                placeholder="Enter address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({
                    ...newCustomer,
                    address: e.target.value
                  })
                }
              />

            </div>

            <div className="supplier-form-buttons">

              <button
                type="submit"
                className="supplier-save-btn"
              >
                Add Customer
              </button>

              <button
                type="button"
                className="supplier-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* EDIT CUSTOMER FORM */}
      {editCustomer && (
        <div className="supplier-form">

          <h2>Edit Customer</h2>

          <form onSubmit={updateCustomer}>
            <div className="supplier-form-group">

              <label>Customer Name</label>

              <input
                type="text"
                value={editCustomer.name}
                onChange={(e) =>
                  setEditCustomer({
                    ...editCustomer,
                    name: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Phone</label>

              <input
                type="tel"
                value={editCustomer.phone}
                onChange={(e) =>
                  setEditCustomer({
                    ...editCustomer,
                    phone: e.target.value
                  })
                }
              />

            </div>

            <div className="supplier-form-group">

              <label>Email</label>

              <input
                type="email"
                value={editCustomer.email}
                onChange={(e) =>
                  setEditCustomer({
                    ...editCustomer,
                    email: e.target.value
                  })
                }
              />

            </div>

            <div className="supplier-form-group">

              <label>Address</label>

              <input
                type="text"
                value={editCustomer.address}
                onChange={(e) =>
                  setEditCustomer({
                    ...editCustomer,
                    address: e.target.value
                  })
                }
              />

            </div>

            <div className="supplier-form-buttons">

              <button
                type="submit"
                className="supplier-save-btn"
              >
                Update Customer
              </button>

              <button
                type="button"
                className="supplier-cancel-btn"
                onClick={() => setEditCustomer(null)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* SEARCH */}
      <div className="supplier-search">

        <input
          type="text"
          placeholder="🔍 Search customer"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

      </div>

      {/* CUSTOMER TABLE */}
      <div className="supplier-table-container">

        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {filteredCustomers.length === 0 ? (

              <tr>
                <td colSpan="6">
                  No customers found
                </td>
              </tr>

            ) : (

              filteredCustomers.map((customer) => (

                <tr key={customer.id}>

                  <td>{customer.id}</td>

                  <td>{customer.name}</td>

                  <td>{customer.phone}</td>

                  <td>{customer.email}</td>

                  <td>{customer.address}</td>

                  <td>

                    <button
                      className="supplier-edit-btn"
                      onClick={() => startEdit(customer)}
                    >
                      Edit
                    </button>

                    <button
                      className="supplier-delete-btn"
                      onClick={() =>
                        deleteCustomer(customer.id)
                      }
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Customers;