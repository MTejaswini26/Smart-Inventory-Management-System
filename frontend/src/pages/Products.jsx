import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "./Products.css";

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    stock: ""
  });

  // LOAD PRODUCTS FROM MYSQL
  useEffect(() => {
    api("/api/products")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        return response.json();
      })
      .then((data) => {
        setProducts(data);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        alert("Failed to load products");
      });
  }, []);

  // ADD PRODUCT
  const addProduct = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        "/api/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: newProduct.name,
            category: newProduct.category,
            price: Number(newProduct.price),
            stock: Number(newProduct.stock)
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add product");
      }

      // Reload products from MySQL
      const updatedResponse = await api(
        "/api/products"
      );

      const updatedProducts = await updatedResponse.json();

      setProducts(updatedProducts);

      setNewProduct({
        name: "",
        category: "",
        price: "",
        stock: ""
      });

      setShowForm(false);

      alert("Product added successfully!");
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product");
    }
  };

  // START EDIT
  const startEdit = (product) => {
    setEditProduct({
      ...product
    });
  };

  // DELETE PRODUCT
  const deleteProduct = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api(
        `/api/products/${id}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      setProducts(
        products.filter((product) => product.id !== id)
      );

      alert("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  // UPDATE PRODUCT
  const updateProduct = async (e) => {
    e.preventDefault();

    try {
      const response = await api(
        `/api/products/${editProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: editProduct.name,
            category: editProduct.category,
            price: Number(editProduct.price),
            stock: Number(editProduct.stock)
          })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      setProducts(
        products.map((product) =>
          product.id === editProduct.id
            ? editProduct
            : product
        )
      );

      setEditProduct(null);

      alert("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product");
    }
  };

  // SEARCH
  const filteredProducts = products.filter(
    (product) =>
      product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      product.category
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="products-page">

      {/* HEADER */}
      <div className="products-header">

        <div>
          <h1>Product Management</h1>

          <p>
            Manage your products and product information
          </p>
        </div>

        <div>

          <button
            className="add-product-btn"
            onClick={() => setShowForm(true)}
          >
            + Add Product
          </button>

          <button
            className="back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

        </div>

      </div>

      {/* EDIT PRODUCT FORM */}
      {editProduct && (
        <div className="product-form-container">

          <h2>Edit Product</h2>

          <form onSubmit={updateProduct}>

            <div className="form-group">
              <label>Product Name</label>

              <input
                type="text"
                value={editProduct.name}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    name: e.target.value
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>

              <input
                type="text"
                value={editProduct.category}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    category: e.target.value
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Price</label>

              <input
                type="number"
                value={editProduct.price}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    price: Number(e.target.value)
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Stock</label>

              <input
                type="number"
                value={editProduct.stock}
                onChange={(e) =>
                  setEditProduct({
                    ...editProduct,
                    stock: Number(e.target.value)
                  })
                }
                required
              />
            </div>

            <div className="form-buttons">

              <button
                type="submit"
                className="save-product-btn"
              >
                Update Product
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={() => setEditProduct(null)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* ADD PRODUCT FORM */}
      {showForm && (
        <div className="product-form-container">

          <h2>Add New Product</h2>

          <form onSubmit={addProduct}>

            <div className="form-group">

              <label>Product Name</label>

              <input
                type="text"
                placeholder="Enter product name"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    name: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="form-group">

              <label>Category</label>

              <input
                type="text"
                placeholder="Enter category"
                value={newProduct.category}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    category: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="form-group">

              <label>Price</label>

              <input
                type="number"
                placeholder="Enter price"
                value={newProduct.price}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    price: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="form-group">

              <label>Stock</label>

              <input
                type="number"
                placeholder="Enter stock quantity"
                value={newProduct.stock}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    stock: e.target.value
                  })
                }
                required
              />

            </div>

            <div className="form-buttons">

              <button
                type="submit"
                className="save-product-btn"
              >
                Add Product
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* SEARCH */}
      <div className="search-container">

        <input
          type="text"
          placeholder="🔍 Search by product name or category"
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
        />

      </div>

      {/* PRODUCT TABLE */}
      <div className="product-table-container">

        <table>

          <thead>
            <tr>
              <th>ID</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {filteredProducts.length === 0 ? (

              <tr>
                <td colSpan="6">
                  No products found
                </td>
              </tr>

            ) : (

              filteredProducts.map((product) => (

                <tr key={product.id}>

                  <td>{product.product_code ?? product.id}</td>

                  <td>{product.name}</td>

                  <td>{product.category}</td>

                  <td>
                    ₹{Number(product.price).toLocaleString()}
                  </td>

                  <td>{product.stock}</td>

                  <td>

                    <button
                      className="edit-btn"
                      onClick={() =>
                        startEdit(product)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        deleteProduct(product.id)
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

export default Products;