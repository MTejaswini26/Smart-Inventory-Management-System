import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Purchases.css";
function Purchases() {
  const navigate = useNavigate();

  const [purchases, setPurchases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editPurchase, setEditPurchase] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [newPurchase, setNewPurchase] = useState({
    supplier: "",
    product: "",
    quantity: "",
    price: "",
    date: ""
  });

  // LOAD PURCHASES FROM MYSQL
  useEffect(() => {
    api("/api/purchases")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load purchases");
        }

        return response.json();
      })
      .then((data) => {
        setPurchases(data);
      })
      .catch((error) => {
        console.error("Error loading purchases:", error);
        alert("Failed to load purchases");
      });
  }, []);

  // ADD PURCHASE
  const addPurchase = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        "/api/purchases",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            supplier: newPurchase.supplier,
            product: newPurchase.product,
            quantity: Number(newPurchase.quantity),
            price: Number(newPurchase.price),
            purchase_date: newPurchase.date
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add purchase");
      }

      const data = await response.json();

      const purchase = {
        id: data.id,
        supplier: newPurchase.supplier,
        product: newPurchase.product,
        quantity: Number(newPurchase.quantity),
        price: Number(newPurchase.price),
        purchase_date: newPurchase.date
      };

      setPurchases((currentPurchases) => [
        ...currentPurchases,
        purchase
      ]);

      setNewPurchase({
        supplier: "",
        product: "",
        quantity: "",
        price: "",
        date: ""
      });

      setShowForm(false);

      alert("Purchase added successfully!");

    } catch (error) {
      console.error("Error adding purchase:", error);
      alert("Failed to add purchase");
    }
  };

  // START EDIT
  const startEdit = (purchase) => {
    setEditPurchase({
      ...purchase,
      date: purchase.purchase_date
        ? purchase.purchase_date.substring(0, 10)
        : ""
    });
  };

  // UPDATE PURCHASE
  const updatePurchase = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        `/api/purchases/${editPurchase.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            supplier: editPurchase.supplier,
            product: editPurchase.product,
            quantity: Number(editPurchase.quantity),
            price: Number(editPurchase.price),
            purchase_date: editPurchase.date
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update purchase");
      }

      setPurchases((currentPurchases) =>
        currentPurchases.map((purchase) =>
          purchase.id === editPurchase.id
            ? {
                ...purchase,
                supplier: editPurchase.supplier,
                product: editPurchase.product,
                quantity: Number(editPurchase.quantity),
                price: Number(editPurchase.price),
                purchase_date: editPurchase.date
              }
            : purchase
        )
      );

      setEditPurchase(null);

      alert("Purchase updated successfully!");

    } catch (error) {
      console.error("Error updating purchase:", error);
      alert("Failed to update purchase");
    }
  };

  // DELETE PURCHASE
  const deletePurchase = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this purchase?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api(
        `/api/purchases/${id}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete purchase");
      }

      setPurchases((currentPurchases) =>
        currentPurchases.filter(
          (purchase) => purchase.id !== id
        )
      );

      alert("Purchase deleted successfully!");

    } catch (error) {
      console.error("Error deleting purchase:", error);
      alert("Failed to delete purchase");
    }
  };

  // SEARCH
  const filteredPurchases = purchases.filter((purchase) =>
    purchase.supplier
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    purchase.product
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="purchases-page">

      {/* HEADER */}
      <div className="purchases-header">

        <div>
          <h1>Purchase Management</h1>

          <p>
            Manage product purchases and supplier orders
          </p>
        </div>

        <div>

          <button
            className="purchase-add-btn"
            onClick={() => setShowForm(true)}
          >
            + Add Purchase
          </button>

          <button
            className="purchase-back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>

      </div>

      {/* ADD PURCHASE FORM */}
      {showForm && (
        <div className="purchase-form">

          <h2>Add New Purchase</h2>

          <form onSubmit={addPurchase}>

            <div className="purchase-form-group">

              <label>Supplier</label>

              <input
                type="text"
                placeholder="Enter supplier name"
                value={newPurchase.supplier}
                onChange={(e) =>
                  setNewPurchase({
                    ...newPurchase,
                    supplier: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Product</label>

              <input
                type="text"
                placeholder="Enter product name"
                value={newPurchase.product}
                onChange={(e) =>
                  setNewPurchase({
                    ...newPurchase,
                    product: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Quantity</label>

              <input
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={newPurchase.quantity}
                onChange={(e) =>
                  setNewPurchase({
                    ...newPurchase,
                    quantity: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Price</label>

              <input
                type="number"
                min="0"
                placeholder="Enter price"
                value={newPurchase.price}
                onChange={(e) =>
                  setNewPurchase({
                    ...newPurchase,
                    price: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Purchase Date</label>

              <input
                type="date"
                value={newPurchase.date}
                onChange={(e) =>
                  setNewPurchase({
                    ...newPurchase,
                    date: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-buttons">

              <button
                type="submit"
                className="purchase-save-btn"
              >
                Add Purchase
              </button>

              <button
                type="button"
                className="purchase-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* EDIT PURCHASE FORM */}
      {editPurchase && (
        <div className="purchase-form">

          <h2>Edit Purchase</h2>

          <form onSubmit={updatePurchase}>

            <div className="purchase-form-group">

              <label>Supplier</label>

              <input
                type="text"
                value={editPurchase.supplier}
                onChange={(e) =>
                  setEditPurchase({
                    ...editPurchase,
                    supplier: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Product</label>

              <input
                type="text"
                value={editPurchase.product}
                onChange={(e) =>
                  setEditPurchase({
                    ...editPurchase,
                    product: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Quantity</label>

              <input
                type="number"
                min="1"
                value={editPurchase.quantity}
                onChange={(e) =>
                  setEditPurchase({
                    ...editPurchase,
                    quantity: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Price</label>

              <input
                type="number"
                min="0"
                value={editPurchase.price}
                onChange={(e) =>
                  setEditPurchase({
                    ...editPurchase,
                    price: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-group">

              <label>Purchase Date</label>

              <input
                type="date"
                value={editPurchase.date}
                onChange={(e) =>
                  setEditPurchase({
                    ...editPurchase,
                    date: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="purchase-form-buttons">

              <button
                type="submit"
                className="purchase-save-btn"
              >
                Update Purchase
              </button>

              <button
                type="button"
                className="purchase-cancel-btn"
                onClick={() => setEditPurchase(null)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* SEARCH */}
      <div className="purchase-search">

        <input
          type="text"
          placeholder="🔍 Search by supplier or product"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

      </div>

      {/* PURCHASE TABLE */}
      <div className="purchase-table-container">

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Supplier</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredPurchases.length === 0 ? (

              <tr>
                <td colSpan="8">
                  No purchases found
                </td>
              </tr>

            ) : (

              filteredPurchases.map((purchase) => (

                <tr key={purchase.id}>

                  <td>{purchase.id}</td>

                  <td>{purchase.supplier}</td>

                  <td>{purchase.product}</td>

                  <td>{purchase.quantity}</td>

                  <td>
                    ₹{Number(purchase.price).toLocaleString()}
                  </td>

                  <td>
                    ₹{(
                      Number(purchase.quantity) *
                      Number(purchase.price)
                    ).toLocaleString()}
                  </td>

                  <td>
                    {purchase.purchase_date
                      ? purchase.purchase_date.substring(0, 10)
                      : ""}
                  </td>

                  <td>

                    <button
                      className="purchase-edit-btn"
                      onClick={() =>
                        startEdit(purchase)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="purchase-delete-btn"
                      onClick={() =>
                        deletePurchase(purchase.id)
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

export default Purchases;