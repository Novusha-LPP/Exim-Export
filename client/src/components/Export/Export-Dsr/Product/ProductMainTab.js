// ProductMainTab.jsx
import React, { useRef } from "react";

function toUpper(val) {
  return (typeof val === "string" ? val : "").toUpperCase();
}

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 12,
    color: "#1f2933",
    padding: 12,
    background: "#f5f7fb",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.02)",
  },
  cardTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 13,
    marginBottom: 8,
  },
  tableContainer: {
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    background: "#ffffff",
    marginBottom: 10,
    maxHeight: 300,
    overflow: "auto",
  },
  tableHeaderRow: {
    display: "grid",
    gridTemplateColumns:
      "0.5fr 2fr 1.1fr 0.9fr 0.9fr 1fr 0.8fr 1.1fr 0.7fr",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#f9fafb",
    background: "#16408f",
    padding: "5px 8px",
    marginTop: 4,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns:
      "0.5fr 2fr 1.1fr 0.9fr 0.9fr 1fr 0.8fr 1.1fr 0.7fr",
    gap: 6,
    padding: "5px 8px",
    alignItems: "center",
    borderBottom: "1px solid #e0e5f0",
  },
  headerCell: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 700
  },
  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    minHeight: 30,
    background: "#f7fafc",
    resize: "vertical",
    boxSizing: "border-box",
        fontWeight: 700

  },
  smallButton: {
    padding: "3px 9px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #16408f",
    background: "#16408f",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
  },
  linkButton: {
    padding: "2px 7px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #e53e3e",
    background: "#fff5f5",
    color: "#c53030",
    cursor: "pointer",
    fontWeight: 600,
  },
};

const ProductMainTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);
  const products = formik.values.products || [];

  const handleProductFieldChange = (idx, field, value) => {
    const updated = [...products];
    updated[idx] = { ...updated[idx], [field]: value };
    formik.setFieldValue("products", updated);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  };

  const addNewProduct = () => {
    const next = [...products];
    next.push({
      serialNumber: next.length + 1,
      description: "",
      ritc: "",
      quantity: 0,
      socQuantity: 0,
      unitPrice: 0,
      per: "",
      amount: 0,
    });
    formik.setFieldValue("products", next);
  };

  const deleteProduct = (idx) => {
    const next = products
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, serialNumber: i + 1 }));
    formik.setFieldValue("products", next);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>Product Items</div>

        <div style={styles.tableContainer}>
          <div style={styles.tableHeaderRow}>
            <div style={styles.headerCell}>Sr No</div>
            <div style={styles.headerCell}>Description</div>
            <div style={styles.headerCell}>RITC</div>
            <div style={styles.headerCell}>Quantity</div>
            <div style={styles.headerCell}>SOC Qty</div>
            <div style={styles.headerCell}>Unit Price</div>
            <div style={styles.headerCell}>Per</div>
            <div style={styles.headerCell}>Amount</div>
            <div style={styles.headerCell}>Action</div>
          </div>

          {products.map((prod, idx) => (
            <div key={idx} style={styles.tableRow}>
              <div>{prod.serialNumber || idx + 1}</div>

              <div>
                <textarea
                  style={styles.textarea}
                  rows={2}
                  value={prod.description || ""}
                  onChange={(e) =>
                    handleProductFieldChange(idx, "description", e.target.value)
                  }
                />
              </div>

              <div>
                <input
                  style={styles.input}
                  value={toUpper(prod.ritc || "")}
                  onChange={(e) =>
                    handleProductFieldChange(
                      idx,
                      "ritc",
                      toUpper(e.target.value)
                    )
                  }
                />
              </div>

              <div>
                <input
                  type="number"
                  style={styles.input}
                  value={prod.quantity || 0}
                  onChange={(e) =>
                    handleProductFieldChange(
                      idx,
                      "quantity",
                      Number(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div>
                <input
                  type="number"
                  style={styles.input}
                  value={prod.socQuantity || 0}
                  onChange={(e) =>
                    handleProductFieldChange(
                      idx,
                      "socQuantity",
                      Number(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div>
                <input
                  type="number"
                  style={styles.input}
                  value={prod.unitPrice || 0}
                  onChange={(e) =>
                    handleProductFieldChange(
                      idx,
                      "unitPrice",
                      Number(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div>
                <input
                  style={styles.input}
                  value={toUpper(prod.per || "")}
                  onChange={(e) =>
                    handleProductFieldChange(
                      idx,
                      "per",
                      toUpper(e.target.value)
                    )
                  }
                />
              </div>

              <div>
                <input
                  type="number"
                  style={styles.input}
                  value={prod.amount || 0}
                  onChange={(e) =>
                    handleProductFieldChange(
                      idx,
                      "amount",
                      Number(e.target.value) || 0
                    )
                  }
                />
              </div>

              <div>
                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => deleteProduct(idx)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            style={styles.smallButton}
            onClick={addNewProduct}
          >
            + Add New Product
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductMainTab;
