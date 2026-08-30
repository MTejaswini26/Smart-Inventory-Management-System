import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Inventory.css";

function Inventory() {
  const navigate = useNavigate();

  const [inventory, setInventory] = useState([]);
  const [editItem, setEditItem] = useState(null);

  // =============================
  // LOAD INVENTORY FROM MYSQL
  // =============================

  const loadInventory = async () => {
    try {
      const response = await api(
        "/api/products"
      );

      if (!response.ok) {
        throw new Error("Failed to load inventory");
      }

      const data = await response.json();

      const inventoryData = data.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: Number(product.price),
        quantity: Number(product.stock),
        minimumStock: Number(product.minimum_stock)
      }));

      setInventory(inventoryData);

    } catch (error) {
      console.error("Error fetching inventory:", error);
      alert("Failed to load inventory");
    }
  };


  // =============================
  // GET INVENTORY WHEN PAGE LOADS
  // =============================

  useEffect(() => {
    loadInventory();
  }, []);


  // =============================
  // STOCK STATUS
  // =============================

  const getStockStatus = (quantity, minimumStock) => {

    if (quantity === 0) {
      return "Out of Stock";
    }

    if (quantity <= minimumStock) {
      return "Low Stock";
    }

    return "In Stock";
  };


  // =============================
  // START EDIT
  // =============================

  const startEdit = (item) => {

    setEditItem({
      ...item
    });
  };


  // =============================
  // HANDLE EDIT
  // =============================

  const handleChange = (e) => {

    const { name, value } = e.target;

    setEditItem({
      ...editItem,
      [name]: value === "" ? "" : Number(value)
    });
  };


  // =============================
  // UPDATE INVENTORY
  // =============================

  const updateInventory = async (e) => {

    e.preventDefault();

    try {

      const response = await api(
        `/api/products/${editItem.id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            name: editItem.name,
            category: editItem.category,
            price: editItem.price,
            stock: Number(editItem.quantity),
            minimum_stock: Number(editItem.minimumStock)
          })
        }
      );


      if (!response.ok) {
        throw new Error("Failed to update inventory");
      }


      alert("Inventory updated successfully!");


      // Reload latest data from MySQL

      await loadInventory();

      setEditItem(null);

    } catch (error) {

      console.error(
        "Error updating inventory:",
        error
      );

      alert("Failed to update inventory");
    }
  };


  // =============================
  // PAGE
  // =============================

  return (
    <div className="inventory-page">

      {/* HEADER */}

      <div className="inventory-header">

        <div>

          <h1>
            Inventory Management
          </h1>

          <p>
            Monitor and manage your inventory stock
          </p>

        </div>


        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>

      </div>


      {/* EDIT FORM */}

      {editItem && (

        <div className="inventory-edit-form">

          <h2>
            Edit Inventory
          </h2>


          <form onSubmit={updateInventory}>

            {/* PRODUCT NAME */}

            <div className="inventory-form-group">

              <label>
                Product Name
              </label>

              <input
                type="text"
                value={editItem.name}
                disabled
              />

            </div>


            {/* CATEGORY */}

            <div className="inventory-form-group">

              <label>
                Category
              </label>

              <input
                type="text"
                value={editItem.category}
                disabled
              />

            </div>


            {/* QUANTITY */}

            <div className="inventory-form-group">

              <label>
                Current Stock
              </label>

              <input
                type="number"
                name="quantity"
                min="0"
                value={editItem.quantity}
                onChange={handleChange}
                required
              />

            </div>


            {/* MINIMUM STOCK */}

            <div className="inventory-form-group">

              <label>
                Minimum Stock
              </label>

              <input
                type="number"
                name="minimumStock"
                min="0"
                value={editItem.minimumStock}
                onChange={handleChange}
                required
              />

            </div>


            {/* BUTTONS */}

            <div className="inventory-form-buttons">

              <button
                type="submit"
                className="inventory-save-btn"
              >
                Save Changes
              </button>


              <button
                type="button"
                className="inventory-cancel-btn"
                onClick={() => setEditItem(null)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}


      {/* INVENTORY TABLE */}

      <div className="inventory-table-container">

        <table>

          <thead>

            <tr>

              <th>ID</th>

              <th>Product Name</th>

              <th>Category</th>

              <th>Quantity</th>

              <th>Minimum Stock</th>

              <th>Status</th>

              <th>Action</th>

            </tr>

          </thead>


          <tbody>

            {inventory.length === 0 ? (

              <tr>

                <td
                  colSpan="7"
                  style={{ textAlign: "center" }}
                >
                  No inventory records found
                </td>

              </tr>

            ) : (

              inventory.map((item) => (

                <tr key={item.id}>

                  <td>
                    {item.product_code ?? item.id}
                  </td>

                  <td>
                    {item.name}
                  </td>

                  <td>
                    {item.category}
                  </td>

                  <td>
                    {item.quantity}
                  </td>

                  <td>
                    {item.minimumStock}
                  </td>

                  <td>

                    <span
                      className={
                        item.quantity === 0
                          ? "stock-status out"
                          : item.quantity <= item.minimumStock
                          ? "stock-status low"
                          : "stock-status available"
                      }
                    >

                      {getStockStatus(
                        item.quantity,
                        item.minimumStock
                      )}

                    </span>

                  </td>


                  <td>

                    <button
                      type="button"
                      className="inventory-edit-btn"
                      onClick={() =>
                        startEdit(item)
                      }
                    >
                      Edit
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

export default Inventory;