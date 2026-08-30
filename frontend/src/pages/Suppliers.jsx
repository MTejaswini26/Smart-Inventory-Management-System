import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Suppliers.css";
function Suppliers() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact: "",
    email: "",
    address: ""
  });

  // LOAD SUPPLIERS FROM MYSQL
  useEffect(() => {
    api("/api/suppliers")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load suppliers");
        }

        return response.json();
      })
      .then((data) => {
        setSuppliers(data);
      })
      .catch((error) => {
        console.error("Error loading suppliers:", error);
        alert("Failed to load suppliers");
      });
  }, []);

  // ADD SUPPLIER
  const addSupplier = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        "/api/suppliers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newSupplier)
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add supplier");
      }

      const data = await response.json();

      const supplier = {
        id: data.id,
        name: newSupplier.name,
        contact: newSupplier.contact,
        email: newSupplier.email,
        address: newSupplier.address
      };

      setSuppliers((currentSuppliers) => [
        ...currentSuppliers,
        supplier
      ]);

      setNewSupplier({
        name: "",
        contact: "",
        email: "",
        address: ""
      });

      setShowForm(false);

      alert("Supplier added successfully!");

    } catch (error) {
      console.error("Error adding supplier:", error);
      alert("Failed to add supplier");
    }
  };

  // START EDIT
  const startEdit = (supplier) => {
    setEditSupplier({
      ...supplier
    });
  };

  // UPDATE SUPPLIER
  const updateSupplier = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        `/api/suppliers/${editSupplier.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: editSupplier.name,
            contact: editSupplier.contact,
            email: editSupplier.email,
            address: editSupplier.address
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update supplier");
      }

      setSuppliers((currentSuppliers) =>
        currentSuppliers.map((supplier) =>
          supplier.id === editSupplier.id
            ? editSupplier
            : supplier
        )
      );

      setEditSupplier(null);

      alert("Supplier updated successfully!");

    } catch (error) {
      console.error("Error updating supplier:", error);
      alert("Failed to update supplier");
    }
  };

  // DELETE SUPPLIER
  const deleteSupplier = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this supplier?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api(
        `/api/suppliers/${id}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete supplier");
      }

      setSuppliers((currentSuppliers) =>
        currentSuppliers.filter(
          (supplier) => supplier.id !== id
        )
      );

      alert("Supplier deleted successfully!");

    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Failed to delete supplier");
    }
  };

  // SEARCH
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    supplier.email
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    supplier.address
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="suppliers-page">

      {/* HEADER */}
      <div className="suppliers-header">

        <div>
          <h1>Supplier Management</h1>

          <p>
            Manage your suppliers and supplier information
          </p>
        </div>

        <div>

          <button
            className="supplier-add-btn"
            onClick={() => setShowForm(true)}
          >
            + Add Supplier
          </button>

          <button
            className="supplier-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>

      </div>

      {/* ADD SUPPLIER FORM */}
      {showForm && (
        <div className="supplier-form">

          <h2>Add New Supplier</h2>

          <form onSubmit={addSupplier}>

            <div className="supplier-form-group">

              <label>Supplier Name</label>

              <input
                type="text"
                placeholder="Enter supplier name"
                value={newSupplier.name}
                onChange={(e) =>
                  setNewSupplier({
                    ...newSupplier,
                    name: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Contact Number</label>

              <input
                type="tel"
                placeholder="Enter contact number"
                value={newSupplier.contact}
                onChange={(e) =>
                  setNewSupplier({
                    ...newSupplier,
                    contact: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter email"
                value={newSupplier.email}
                onChange={(e) =>
                  setNewSupplier({
                    ...newSupplier,
                    email: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Address</label>

              <input
                type="text"
                placeholder="Enter address"
                value={newSupplier.address}
                onChange={(e) =>
                  setNewSupplier({
                    ...newSupplier,
                    address: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-buttons">

              <button
                type="submit"
                className="supplier-save-btn"
              >
                Add Supplier
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

      {/* EDIT SUPPLIER FORM */}
      {editSupplier && (
        <div className="supplier-form">

          <h2>Edit Supplier</h2>

          <form onSubmit={updateSupplier}>

            <div className="supplier-form-group">

              <label>Supplier Name</label>

              <input
                type="text"
                value={editSupplier.name}
                onChange={(e) =>
                  setEditSupplier({
                    ...editSupplier,
                    name: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Contact Number</label>

              <input
                type="tel"
                value={editSupplier.contact}
                onChange={(e) =>
                  setEditSupplier({
                    ...editSupplier,
                    contact: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Email</label>

              <input
                type="email"
                value={editSupplier.email}
                onChange={(e) =>
                  setEditSupplier({
                    ...editSupplier,
                    email: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-group">

              <label>Address</label>

              <input
                type="text"
                value={editSupplier.address}
                onChange={(e) =>
                  setEditSupplier({
                    ...editSupplier,
                    address: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="supplier-form-buttons">

              <button
                type="submit"
                className="supplier-save-btn"
              >
                Update Supplier
              </button>

              <button
                type="button"
                className="supplier-cancel-btn"
                onClick={() => setEditSupplier(null)}
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
          placeholder="🔍 Search supplier"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

      </div>

      {/* SUPPLIER TABLE */}
      <div className="supplier-table-container">

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Supplier Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredSuppliers.length === 0 ? (

              <tr>
                <td colSpan="6">
                  No suppliers found
                </td>
              </tr>

            ) : (

              filteredSuppliers.map((supplier) => (

                <tr key={supplier.id}>

                  <td>{supplier.id}</td>

                  <td>{supplier.name}</td>

                  <td>{supplier.contact}</td>

                  <td>{supplier.email}</td>

                  <td>{supplier.address}</td>

                  <td>

                    <button
                      className="supplier-edit-btn"
                      onClick={() => startEdit(supplier)}
                    >
                      Edit
                    </button>

                    <button
                      className="supplier-delete-btn"
                      onClick={() =>
                        deleteSupplier(supplier.id)
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

export default Suppliers;