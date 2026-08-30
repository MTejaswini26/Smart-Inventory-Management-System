// This Node/Express server is no longer used.
// Run the Flask backend instead: python app.py
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Tej@$wini_4726",
  database: "smart_inventory",
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err.message);
    return;
  }

  console.log("MySQL connected successfully!");
});

app.get("/", (req, res) => {
  res.json({
    message: "Smart Inventory Backend is running!"
  });
});

app.get("/api/products", (req, res) => {
  const sql = "SELECT * FROM products ORDER BY id ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching products:", err);
      return res.status(500).json({
        message: "Error fetching products"
      });
    }

    res.json(results);
  });
});

app.post("/api/products", (req, res) => {
  const {
    name,
    category,
    price,
    stock,
    minimum_stock
  } = req.body;

  if (!name || !category || price === undefined || stock === undefined) {
    return res.status(400).json({
      message: "Name, category, price and stock are required"
    });
  }

  const sql = `
    INSERT INTO products
    (name, category, price, stock, minimum_stock)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      name.trim(),
      category,
      Number(price),
      Number(stock),
      minimum_stock === undefined ? 10 : Number(minimum_stock)
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding product:", err);
        return res.status(500).json({
          message: "Error adding product"
        });
      }

      res.status(201).json({
        message: "Product added successfully",
        productId: result.insertId
      });
    }
  );
});

app.put("/api/products/:id", (req, res) => {
  const id = req.params.id;

  const {
    name,
    category,
    price,
    stock,
    minimum_stock
  } = req.body;

  const sql = `
    UPDATE products
    SET name = ?,
        category = ?,
        price = ?,
        stock = ?,
        minimum_stock = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      name,
      category,
      Number(price),
      Number(stock),
      minimum_stock === undefined ? 10 : Number(minimum_stock),
      id
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating product:", err);
        return res.status(500).json({
          message: "Error updating product"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Product not found"
        });
      }

      res.json({
        message: "Product updated successfully"
      });
    }
  );
});

app.delete("/api/products/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM products WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting product:", err);
      return res.status(500).json({
        message: "Error deleting product"
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    res.json({
      message: "Product deleted successfully"
    });
  });
});

app.get("/api/inventory", (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      category,
      stock AS quantity,
      minimum_stock,
      price,
      CASE
        WHEN stock <= 0 THEN 'Out of Stock'
        WHEN stock <= minimum_stock THEN 'Low Stock'
        ELSE 'In Stock'
      END AS status
    FROM products
    ORDER BY id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching inventory:", err);
      return res.status(500).json({
        message: "Error fetching inventory"
      });
    }

    res.json(results);
  });
});

app.get("/api/suppliers", (req, res) => {
  const sql = "SELECT * FROM suppliers ORDER BY id ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching suppliers:", err);
      return res.status(500).json({
        message: "Error fetching suppliers"
      });
    }

    res.json(results);
  });
});

app.post("/api/suppliers", (req, res) => {
  const {
    name,
    contact,
    email,
    address
  } = req.body;

  const sql = `
    INSERT INTO suppliers
    (name, contact, email, address)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, contact, email, address],
    (err, result) => {
      if (err) {
        console.error("Error adding supplier:", err);
        return res.status(500).json({
          message: "Error adding supplier"
        });
      }

      res.status(201).json({
        message: "Supplier added successfully",
        id: result.insertId
      });
    }
  );
});

app.put("/api/suppliers/:id", (req, res) => {
  const id = req.params.id;

  const {
    name,
    contact,
    email,
    address
  } = req.body;

  const sql = `
    UPDATE suppliers
    SET name = ?,
        contact = ?,
        email = ?,
        address = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name, contact, email, address, id],
    (err, result) => {
      if (err) {
        console.error("Error updating supplier:", err);
        return res.status(500).json({
          message: "Error updating supplier"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Supplier not found"
        });
      }

      res.json({
        message: "Supplier updated successfully"
      });
    }
  );
});

app.delete("/api/suppliers/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM suppliers WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting supplier:", err);
      return res.status(500).json({
        message: "Error deleting supplier"
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Supplier not found"
      });
    }

    res.json({
      message: "Supplier deleted successfully"
    });
  });
});

app.get("/api/purchases", (req, res) => {
  const sql = "SELECT * FROM purchases ORDER BY id ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching purchases:", err);
      return res.status(500).json({
        message: "Error fetching purchases"
      });
    }

    res.json(results);
  });
});

app.post("/api/purchases", (req, res) => {
  const {
    supplier,
    product,
    quantity,
    price,
    purchase_date
  } = req.body;

  const purchaseQuantity = Number(quantity);

  if (!supplier || !product || purchaseQuantity <= 0) {
    return res.status(400).json({
      message: "Supplier, product and valid quantity are required"
    });
  }

  const findProductSql = `
    SELECT id, name, stock
    FROM products
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    LIMIT 1
  `;

  db.query(
    findProductSql,
    [product],
    (findErr, productResults) => {
      if (findErr) {
        console.error("Error finding product:", findErr);
        return res.status(500).json({
          message: "Error finding product"
        });
      }

      if (productResults.length === 0) {
        return res.status(404).json({
          message: "Product not found. Add the product first."
        });
      }

      const productId = productResults[0].id;
      const productName = productResults[0].name;

      const insertPurchaseSql = `
        INSERT INTO purchases
        (supplier, product, quantity, price, purchase_date)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(
        insertPurchaseSql,
        [
          supplier,
          productName,
          purchaseQuantity,
          Number(price),
          purchase_date
        ],
        (purchaseErr, result) => {
          if (purchaseErr) {
            console.error("Error adding purchase:", purchaseErr);
            return res.status(500).json({
              message: "Error adding purchase"
            });
          }

          const updateStockSql = `
            UPDATE products
            SET stock = stock + ?
            WHERE id = ?
          `;

          db.query(
            updateStockSql,
            [purchaseQuantity, productId],
            (stockErr) => {
              if (stockErr) {
                console.error("Error updating inventory:", stockErr);

                db.query(
                  "DELETE FROM purchases WHERE id = ?",
                  [result.insertId]
                );

                return res.status(500).json({
                  message: "Purchase saved but inventory update failed"
                });
              }

              res.status(201).json({
                message: "Purchase added and stock increased successfully",
                id: result.insertId
              });
            }
          );
        }
      );
    }
  );
});

app.put("/api/purchases/:id", (req, res) => {
  const purchaseId = req.params.id;

  const {
    supplier,
    product,
    quantity,
    price,
    purchase_date
  } = req.body;

  const newQuantity = Number(quantity);

  if (!supplier || !product || newQuantity <= 0) {
    return res.status(400).json({
      message: "Supplier, product and valid quantity are required"
    });
  }

  const getOldPurchaseSql = `
    SELECT id, supplier, product, quantity
    FROM purchases
    WHERE id = ?
  `;

  db.query(
    getOldPurchaseSql,
    [purchaseId],
    (oldErr, oldResults) => {
      if (oldErr) {
        console.error("Error fetching old purchase:", oldErr);
        return res.status(500).json({
          message: "Error fetching purchase"
        });
      }

      if (oldResults.length === 0) {
        return res.status(404).json({
          message: "Purchase not found"
        });
      }

      const oldPurchase = oldResults[0];
      const oldQuantity = Number(oldPurchase.quantity);
      const oldProductName = oldPurchase.product;

      const findNewProductSql = `
        SELECT id, name, stock
        FROM products
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `;

      db.query(
        findNewProductSql,
        [product],
        (productErr, productResults) => {
          if (productErr) {
            console.error("Error finding product:", productErr);
            return res.status(500).json({
              message: "Error finding product"
            });
          }

          if (productResults.length === 0) {
            return res.status(404).json({
              message: "Product not found"
            });
          }

          const newProduct = productResults[0];
          const newProductId = newProduct.id;
          const newProductName = newProduct.name;

          const updatePurchaseSql = `
            UPDATE purchases
            SET supplier = ?,
                product = ?,
                quantity = ?,
                price = ?,
                purchase_date = ?
            WHERE id = ?
          `;

          const updatePurchase = () => {
            db.query(
              updatePurchaseSql,
              [
                supplier,
                newProductName,
                newQuantity,
                Number(price),
                purchase_date,
                purchaseId
              ],
              (updateErr) => {
                if (updateErr) {
                  console.error("Error updating purchase:", updateErr);
                  return res.status(500).json({
                    message: "Error updating purchase"
                  });
                }

                res.json({
                  message: "Purchase and inventory updated successfully"
                });
              }
            );
          };

          const updateNewProductStock = (stockChange) => {
            db.query(
              "UPDATE products SET stock = stock + ? WHERE id = ?",
              [stockChange, newProductId],
              (stockErr) => {
                if (stockErr) {
                  console.error("Error updating inventory:", stockErr);
                  return res.status(500).json({
                    message: "Inventory update failed"
                  });
                }

                updatePurchase();
              }
            );
          };

          const findOldProductSql = `
            SELECT id
            FROM products
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
            LIMIT 1
          `;

          db.query(
            findOldProductSql,
            [oldProductName],
            (oldProductErr, oldProductResults) => {
              if (oldProductErr) {
                console.error("Error finding old product:", oldProductErr);
                return res.status(500).json({
                  message: "Error finding old product"
                });
              }

              if (
                oldProductResults.length > 0 &&
                oldProductResults[0].id !== newProductId
              ) {
                const oldProductId = oldProductResults[0].id;

                db.query(
                  "UPDATE products SET stock = stock - ? WHERE id = ?",
                  [oldQuantity, oldProductId],
                  (oldStockErr) => {
                    if (oldStockErr) {
                      console.error("Error restoring old inventory:", oldStockErr);
                      return res.status(500).json({
                        message: "Old inventory update failed"
                      });
                    }

                    updateNewProductStock(newQuantity);
                  }
                );
              } else {
                const difference = newQuantity - oldQuantity;
                updateNewProductStock(difference);
              }
            }
          );
        }
      );
    }
  );
});

app.delete("/api/purchases/:id", (req, res) => {
  const purchaseId = req.params.id;

  const getPurchaseSql = `
    SELECT product, quantity
    FROM purchases
    WHERE id = ?
  `;

  db.query(
    getPurchaseSql,
    [purchaseId],
    (purchaseErr, purchaseResults) => {
      if (purchaseErr) {
        console.error("Error fetching purchase:", purchaseErr);
        return res.status(500).json({
          message: "Error fetching purchase"
        });
      }

      if (purchaseResults.length === 0) {
        return res.status(404).json({
          message: "Purchase not found"
        });
      }

      const purchase = purchaseResults[0];
      const quantity = Number(purchase.quantity);

      const findProductSql = `
        SELECT id
        FROM products
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `;

      db.query(
        findProductSql,
        [purchase.product],
        (productErr, productResults) => {
          if (productErr) {
            console.error("Error finding product:", productErr);
            return res.status(500).json({
              message: "Error finding product"
            });
          }

          const deletePurchase = () => {
            db.query(
              "DELETE FROM purchases WHERE id = ?",
              [purchaseId],
              (deleteErr) => {
                if (deleteErr) {
                  console.error("Error deleting purchase:", deleteErr);
                  return res.status(500).json({
                    message: "Error deleting purchase"
                  });
                }

                res.json({
                  message: "Purchase deleted and stock decreased successfully"
                });
              }
            );
          };

          if (productResults.length === 0) {
            return deletePurchase();
          }

          const productId = productResults[0].id;

          db.query(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [quantity, productId],
            (stockErr) => {
              if (stockErr) {
                console.error("Error updating inventory:", stockErr);
                return res.status(500).json({
                  message: "Inventory update failed"
                });
              }

              deletePurchase();
            }
          );
        }
      );
    }
  );
});

app.get("/api/sales", (req, res) => {
  const sql = "SELECT * FROM sales ORDER BY id ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching sales:", err);
      return res.status(500).json({
        message: "Error fetching sales"
      });
    }

    res.json(results);
  });
});

app.post("/api/sales", (req, res) => {
  const {
    customer,
    product,
    quantity,
    price,
    sale_date
  } = req.body;

  const saleQuantity = Number(quantity);

  if (!customer || !product || saleQuantity <= 0) {
    return res.status(400).json({
      message: "Customer, product and valid quantity are required"
    });
  }

  const findProductSql = `
    SELECT id, name, stock
    FROM products
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    LIMIT 1
  `;

  db.query(
    findProductSql,
    [product],
    (findErr, productResults) => {
      if (findErr) {
        console.error("Error finding product:", findErr);
        return res.status(500).json({
          message: "Error finding product"
        });
      }

      if (productResults.length === 0) {
        return res.status(404).json({
          message: "Product not found. Add the product first."
        });
      }

      const productId = productResults[0].id;
      const productName = productResults[0].name;
      const currentStock = Number(productResults[0].stock);

      if (saleQuantity > currentStock) {
        return res.status(400).json({
          message: `Insufficient stock. Available stock for ${productName}: ${currentStock}`
        });
      }

      const insertSaleSql = `
        INSERT INTO sales
        (customer, product, quantity, price, sale_date)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(
        insertSaleSql,
        [
          customer,
          productName,
          saleQuantity,
          Number(price),
          sale_date
        ],
        (saleErr, result) => {
          if (saleErr) {
            console.error("Error adding sale:", saleErr);
            return res.status(500).json({
              message: "Error adding sale"
            });
          }

          db.query(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [saleQuantity, productId],
            (stockErr) => {
              if (stockErr) {
                console.error("Error updating inventory:", stockErr);

                db.query(
                  "DELETE FROM sales WHERE id = ?",
                  [result.insertId]
                );

                return res.status(500).json({
                  message: "Sale saved but inventory update failed"
                });
              }

              res.status(201).json({
                message: "Sale added and stock decreased successfully",
                id: result.insertId
              });
            }
          );
        }
      );
    }
  );
});

app.put("/api/sales/:id", (req, res) => {
  const saleId = req.params.id;

  const {
    customer,
    product,
    quantity,
    price,
    sale_date
  } = req.body;

  const newQuantity = Number(quantity);

  if (!customer || !product || newQuantity <= 0) {
    return res.status(400).json({
      message: "Customer, product and valid quantity are required"
    });
  }

  const getOldSaleSql = `
    SELECT id, customer, product, quantity
    FROM sales
    WHERE id = ?
  `;

  db.query(
    getOldSaleSql,
    [saleId],
    (oldErr, oldResults) => {
      if (oldErr) {
        console.error("Error fetching old sale:", oldErr);
        return res.status(500).json({
          message: "Error fetching sale"
        });
      }

      if (oldResults.length === 0) {
        return res.status(404).json({
          message: "Sale not found"
        });
      }

      const oldSale = oldResults[0];
      const oldQuantity = Number(oldSale.quantity);
      const oldProductName = oldSale.product;

      const findNewProductSql = `
        SELECT id, name, stock
        FROM products
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `;

      db.query(
        findNewProductSql,
        [product],
        (productErr, productResults) => {
          if (productErr) {
            console.error("Error finding product:", productErr);
            return res.status(500).json({
              message: "Error finding product"
            });
          }

          if (productResults.length === 0) {
            return res.status(404).json({
              message: "Product not found"
            });
          }

          const newProduct = productResults[0];
          const newProductId = newProduct.id;
          const newProductName = newProduct.name;

          const updateSale = () => {
            const updateSaleSql = `
              UPDATE sales
              SET customer = ?,
                  product = ?,
                  quantity = ?,
                  price = ?,
                  sale_date = ?
              WHERE id = ?
            `;

            db.query(
              updateSaleSql,
              [
                customer,
                newProductName,
                newQuantity,
                Number(price),
                sale_date,
                saleId
              ],
              (updateErr) => {
                if (updateErr) {
                  console.error("Error updating sale:", updateErr);
                  return res.status(500).json({
                    message: "Error updating sale"
                  });
                }

                res.json({
                  message: "Sale and inventory updated successfully"
                });
              }
            );
          };

          const findOldProductSql = `
            SELECT id, stock
            FROM products
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
            LIMIT 1
          `;

          db.query(
            findOldProductSql,
            [oldProductName],
            (oldProductErr, oldProductResults) => {
              if (oldProductErr) {
                console.error("Error finding old product:", oldProductErr);
                return res.status(500).json({
                  message: "Error finding old product"
                });
              }

              if (oldProductResults.length === 0) {
                return res.status(404).json({
                  message: "Old product not found"
                });
              }

              const oldProductId = oldProductResults[0].id;

              if (oldProductId !== newProductId) {
                const restoreOldStockSql = `
                  UPDATE products
                  SET stock = stock + ?
                  WHERE id = ?
                `;

                db.query(
                  restoreOldStockSql,
                  [oldQuantity, oldProductId],
                  (restoreErr) => {
                    if (restoreErr) {
                      console.error("Error restoring old stock:", restoreErr);
                      return res.status(500).json({
                        message: "Failed to restore old stock"
                      });
                    }

                    const newStock = Number(newProduct.stock);

                    if (newQuantity > newStock) {
                      db.query(
                        "UPDATE products SET stock = stock - ? WHERE id = ?",
                        [oldQuantity, oldProductId]
                      );

                      return res.status(400).json({
                        message: `Insufficient stock. Available stock for ${newProductName}: ${newStock}`
                      });
                    }

                    db.query(
                      "UPDATE products SET stock = stock - ? WHERE id = ?",
                      [newQuantity, newProductId],
                      (newStockErr) => {
                        if (newStockErr) {
                          return res.status(500).json({
                            message: "Failed to update new product stock"
                          });
                        }

                        updateSale();
                      }
                    );
                  }
                );
              } else {
                const stockDifference = oldQuantity - newQuantity;

                if (
                  stockDifference < 0 &&
                  Math.abs(stockDifference) > Number(newProduct.stock)
                ) {
                  return res.status(400).json({
                    message: `Insufficient stock. Available stock for ${newProductName}: ${newProduct.stock}`
                  });
                }

                db.query(
                  "UPDATE products SET stock = stock + ? WHERE id = ?",
                  [stockDifference, newProductId],
                  (stockErr) => {
                    if (stockErr) {
                      console.error("Error updating stock:", stockErr);
                      return res.status(500).json({
                        message: "Failed to update stock"
                      });
                    }

                    updateSale();
                  }
                );
              }
            }
          );
        }
      );
    }
  );
});

app.delete("/api/sales/:id", (req, res) => {
  const saleId = req.params.id;

  const getSaleSql = `
    SELECT product, quantity
    FROM sales
    WHERE id = ?
  `;

  db.query(
    getSaleSql,
    [saleId],
    (saleErr, saleResults) => {
      if (saleErr) {
        console.error("Error fetching sale:", saleErr);
        return res.status(500).json({
          message: "Error fetching sale"
        });
      }

      if (saleResults.length === 0) {
        return res.status(404).json({
          message: "Sale not found"
        });
      }

      const sale = saleResults[0];
      const quantity = Number(sale.quantity);

      const findProductSql = `
        SELECT id
        FROM products
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `;

      db.query(
        findProductSql,
        [sale.product],
        (productErr, productResults) => {
          if (productErr) {
            console.error("Error finding product:", productErr);
            return res.status(500).json({
              message: "Error finding product"
            });
          }

          const deleteSale = () => {
            db.query(
              "DELETE FROM sales WHERE id = ?",
              [saleId],
              (deleteErr) => {
                if (deleteErr) {
                  console.error("Error deleting sale:", deleteErr);
                  return res.status(500).json({
                    message: "Error deleting sale"
                  });
                }

                res.json({
                  message: "Sale deleted and stock restored successfully"
                });
              }
            );
          };

          if (productResults.length === 0) {
            return deleteSale();
          }

          const productId = productResults[0].id;

          db.query(
            "UPDATE products SET stock = stock + ? WHERE id = ?",
            [quantity, productId],
            (stockErr) => {
              if (stockErr) {
                console.error("Error updating stock:", stockErr);
                return res.status(500).json({
                  message: "Inventory update failed"
                });
              }

              deleteSale();
            }
          );
        }
      );
    }
  );
});

app.get("/api/low-stock-alerts", (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      category,
      stock,
      minimum_stock,
      price
    FROM products
    WHERE stock <= minimum_stock
    ORDER BY stock ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching low stock alerts:", err);
      return res.status(500).json({
        message: "Error fetching low stock alerts"
      });
    }

    res.json(results);
  });
});

app.get("/api/invoices", (req, res) => {
  const sql = "SELECT * FROM invoices ORDER BY id ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching invoices:", err);
      return res.status(500).json({
        message: "Error fetching invoices"
      });
    }

    res.json(results);
  });
});

app.post("/api/invoices", (req, res) => {
  const {
    customer,
    product,
    quantity,
    price,
    total,
    invoice_date
  } = req.body;

  const sql = `
    INSERT INTO invoices
    (customer, product, quantity, price, total, invoice_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      customer,
      product,
      Number(quantity),
      Number(price),
      Number(total),
      invoice_date
    ],
    (err, result) => {
      if (err) {
        console.error("Error adding invoice:", err);
        return res.status(500).json({
          message: "Error adding invoice"
        });
      }

      res.status(201).json({
        message: "Invoice added successfully",
        id: result.insertId
      });
    }
  );
});

app.put("/api/invoices/:id", (req, res) => {
  const id = req.params.id;

  const {
    customer,
    product,
    quantity,
    price,
    total,
    invoice_date
  } = req.body;

  const sql = `
    UPDATE invoices
    SET customer = ?,
        product = ?,
        quantity = ?,
        price = ?,
        total = ?,
        invoice_date = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      customer,
      product,
      Number(quantity),
      Number(price),
      Number(total),
      invoice_date,
      id
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating invoice:", err);
        return res.status(500).json({
          message: "Error updating invoice"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Invoice not found"
        });
      }

      res.json({
        message: "Invoice updated successfully"
      });
    }
  );
});

app.delete("/api/invoices/:id", (req, res) => {
  const id = req.params.id;

  const sql = "DELETE FROM invoices WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting invoice:", err);
      return res.status(500).json({
        message: "Error deleting invoice"
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Invoice not found"
      });
    }

    res.json({
      message: "Invoice deleted successfully"
    });
  });
});

app.get("/api/ai-stock-prediction/:id", (req, res) => {
  const productId = req.params.id;

  const productSql = `
    SELECT
      id,
      name,
      category,
      stock,
      minimum_stock,
      price
    FROM products
    WHERE id = ?
  `;

  db.query(
    productSql,
    [productId],
    (err, productResults) => {
      if (err) {
        console.error("Error fetching product:", err);
        return res.status(500).json({
          message: "Error fetching product"
        });
      }

      if (productResults.length === 0) {
        return res.status(404).json({
          message: "Product not found"
        });
      }

      const product = productResults[0];

      const salesSql = `
        SELECT quantity, sale_date
        FROM sales
        WHERE LOWER(TRIM(product)) = LOWER(TRIM(?))
        ORDER BY sale_date DESC
      `;

      db.query(
        salesSql,
        [product.name],
        (salesErr, salesResults) => {
          if (salesErr) {
            console.error("Error fetching sales:", salesErr);
            return res.status(500).json({
              message: "Error fetching sales data"
            });
          }

          let totalSales = 0;

          salesResults.forEach((sale) => {
            totalSales += Number(sale.quantity);
          });

          const predictionPeriod = 30;

          const averageDailySales =
            totalSales > 0
              ? totalSales / predictionPeriod
              : 0;

          const expectedSales = Math.ceil(
            averageDailySales * predictionPeriod
          );

          const remainingStock =
            Number(product.stock) - expectedSales;

          let status;
          let recommendation;

          if (remainingStock <= 0) {
            status = "Critical";
            recommendation =
              "Immediate restocking is required.";
          } else if (
            remainingStock <= Number(product.minimum_stock)
          ) {
            status = "Low Stock";
            recommendation =
              "Consider ordering additional stock soon.";
          } else {
            status = "Sufficient";
            recommendation =
              "Current stock is sufficient for the predicted period.";
          }

          res.json({
            productId: product.id,
            productName: product.name,
            category: product.category,
            currentStock: Number(product.stock),
            minimumStock: Number(product.minimum_stock),
            totalSales,
            averageDailySales:
              Number(averageDailySales.toFixed(2)),
            predictionDays: predictionPeriod,
            expectedSales,
            remainingStock,
            status,
            recommendation
          });
        }
      );
    }
  );
});

app.get("/api/reports/summary", (req, res) => {
  const salesSql = `
    SELECT
      COALESCE(SUM(quantity * price), 0) AS totalSales,
      COALESCE(SUM(quantity), 0) AS itemsSold
    FROM sales
  `;

  const purchasesSql = `
    SELECT
      COALESCE(SUM(quantity * price), 0) AS totalPurchases,
      COALESCE(SUM(quantity), 0) AS itemsPurchased
    FROM purchases
  `;

  db.query(
    salesSql,
    (salesErr, salesResults) => {
      if (salesErr) {
        console.error("Error calculating sales report:", salesErr);
        return res.status(500).json({
          message: "Error calculating sales report"
        });
      }

      db.query(
        purchasesSql,
        (purchaseErr, purchaseResults) => {
          if (purchaseErr) {
            console.error(
              "Error calculating purchase report:",
              purchaseErr
            );

            return res.status(500).json({
              message: "Error calculating purchase report"
            });
          }

          res.json({
            totalSales:
              Number(salesResults[0].totalSales),
            totalPurchases:
              Number(purchaseResults[0].totalPurchases),
            itemsSold:
              Number(salesResults[0].itemsSold),
            itemsPurchased:
              Number(purchaseResults[0].itemsPurchased)
          });
        }
      );
    }
  );
});

app.get("/api/reports/sales", (req, res) => {
  const sql = `
    SELECT
      id,
      customer,
      product,
      quantity,
      price,
      (quantity * price) AS amount,
      sale_date
    FROM sales
    ORDER BY id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching sales report:", err);
      return res.status(500).json({
        message: "Error fetching sales report"
      });
    }

    res.json(results);
  });
});

app.get("/api/reports/purchases", (req, res) => {
  const sql = `
    SELECT
      id,
      supplier,
      product,
      quantity,
      price,
      (quantity * price) AS amount,
      purchase_date
    FROM purchases
    ORDER BY id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching purchase report:", err);
      return res.status(500).json({
        message: "Error fetching purchase report"
      });
    }

    res.json(results);
  });
});

app.get("/api/dashboard", (req, res) => {
  const queries = {
    totalProducts:
      "SELECT COUNT(*) AS total FROM products",

    totalStock:
      "SELECT COALESCE(SUM(stock), 0) AS total FROM products",

    lowStockItems:
      "SELECT COUNT(*) AS total FROM products WHERE stock <= minimum_stock",

    totalSales:
      "SELECT COALESCE(SUM(quantity * price), 0) AS total FROM sales",

    totalPurchases:
      "SELECT COALESCE(SUM(quantity * price), 0) AS total FROM purchases",

    itemsSold:
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM sales",

    itemsPurchased:
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM purchases"
  };

  db.query(
    queries.totalProducts,
    (err, productResult) => {
      if (err) {
        return res.status(500).json({
          message: "Error fetching total products"
        });
      }

      db.query(
        queries.totalStock,
        (err, stockResult) => {
          if (err) {
            return res.status(500).json({
              message: "Error fetching total stock"
            });
          }

          db.query(
            queries.lowStockItems,
            (err, lowStockResult) => {
              if (err) {
                return res.status(500).json({
                  message: "Error fetching low stock items"
                });
              }

              db.query(
                queries.totalSales,
                (err, salesResult) => {
                  if (err) {
                    return res.status(500).json({
                      message: "Error fetching total sales"
                    });
                  }

                  db.query(
                    queries.totalPurchases,
                    (err, purchaseResult) => {
                      if (err) {
                        return res.status(500).json({
                          message: "Error fetching total purchases"
                        });
                      }

                      db.query(
                        queries.itemsSold,
                        (err, soldResult) => {
                          if (err) {
                            return res.status(500).json({
                              message: "Error fetching items sold"
                            });
                          }

                          db.query(
                            queries.itemsPurchased,
                            (err, purchasedResult) => {
                              if (err) {
                                return res.status(500).json({
                                  message: "Error fetching items purchased"
                                });
                              }

                              res.json({
                                totalProducts:
                                  Number(productResult[0].total),

                                totalStock:
                                  Number(stockResult[0].total),

                                lowStockItems:
                                  Number(lowStockResult[0].total),

                                totalSales:
                                  Number(salesResult[0].total),

                                totalPurchases:
                                  Number(purchaseResult[0].total),

                                itemsSold:
                                  Number(soldResult[0].total),

                                itemsPurchased:
                                  Number(purchasedResult[0].total)
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

app.listen(PORT, () => {
  console.log("======================================");
  console.log("Smart Inventory Backend Started");
  console.log("Server running on http://localhost:5000");
  console.log("======================================");
});