// ProductMainTab.jsx - COMPLETE PRODUCTION-READY VERSION
import React, { useRef, useState, useCallback } from "react";
import { unitCodes } from "../../../../utils/masterList";

function toUpper(val) {
  return (typeof val === "string" ? val : "").toUpperCase();
}

// Format helpers - ONLY format on blur, store raw strings during typing
const formatQty = (v) => {
  if (v === "" || v == null || v === 0) return "";
  const num = Number(v);
  return isNaN(num) ? "" : num.toFixed(3);
};

const formatSocQty = (v) => {
  if (v === "" || v == null || v === 0) return "";
  const num = Number(v);
  return isNaN(num) ? "" : num.toFixed(5);
};

const formatUnitPrice = (v) => {
  if (v === "" || v == null || v === 0) return "";
  const num = Number(v);
  return isNaN(num) ? "" : num.toFixed(4);
};

const formatAmount = (v) => {
  if (v === "" || v == null || v === 0) return "";
  const num = Number(v);
  return isNaN(num) ? "" : num.toFixed(2);
};

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
      "0.5fr 2fr 1.1fr 0.9fr 0.8fr 0.9fr 0.9fr 0.8fr 1.1fr 0.9fr",
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
      "0.5fr 2fr 1.1fr 0.9fr 0.8fr 0.9fr 0.9fr 0.8fr 1.1fr 0.9fr",
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
    fontWeight: 700,
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
    fontWeight: 700,
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
    marginRight: 6,
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
  const products = formik.values.products || [];
  const inputRefs = useRef({});

  const setProducts = useCallback(
    (updated) => {
      formik.setFieldValue("products", updated);
    },
    [formik]
  );

  const recalcAmount = useCallback((prod) => {
    const qty = Number(prod.quantity);
    const rate = Number(prod.unitPrice);
    const per = Number(prod.per);
    return qty * rate * per;
  }, []);

  const handleProductFieldChange = useCallback(
    (idx, field, rawValue, { autoRecalc = false } = {}) => {
      const updated = [...products];
      const current = { ...updated[idx] };

      // Store RAW STRING - no formatting during typing
      current[field] = rawValue;

      // Auto-calculate amount (skip if editing amount manually)
      if (autoRecalc && field !== "amount") {
        const calculated = recalcAmount(current);
        if (!isNaN(calculated)) {
          current.amount = String(calculated);
        }
      }

      updated[idx] = current;
      setProducts(updated);
    },
    [products, setProducts, recalcAmount]
  );

  const handleBlur = useCallback(
    (idx, field) => {
      const updated = [...products];
      const current = { ...updated[idx] };
      let value = current[field];

      // Format ONLY on blur
      switch (field) {
        case "quantity":
          current[field] = formatQty(value);
          break;
        case "socQuantity":
          current[field] = formatSocQty(value);
          break;
        case "unitPrice":
          current[field] = formatUnitPrice(value);
          break;
        case "amount":
          current[field] = formatAmount(value);
          break;
        case "per":
          const num = Number(value);
          current[field] = isNaN(num) ? value : String(num);
          break;
        default:
          break;
      }

      setProducts(updated);
    },
    [products, setProducts]
  );

  const addNewProduct = useCallback(() => {
    const next = [...products];
    next.push({
      serialNumber: next.length + 1,
      description: "",
      ritc: "",
      quantity: "",
      socQuantity: "",
      unitPrice: "",
      per: "1",
      amount: "",
      qtyUnit: "",
      priceUnit: "",
    });
    setProducts(next);
  }, [products, setProducts]);

  const deleteProduct = useCallback(
    (idx) => {
      const next = products
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, serialNumber: i + 1 }));
      setProducts(next);
    },
    [products, setProducts]
  );

  const copyProduct = useCallback(
    (idx) => {
      const next = [...products];
      const source = next[idx] || {};
      const clone = { ...source };
      next.splice(idx + 1, 0, clone);
      const resequenced = next.map((p, i) => ({
        ...p,
        serialNumber: i + 1,
      }));
      setProducts(resequenced);
    },
    [products, setProducts]
  );

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
            <div style={styles.headerCell}>Qty Unit</div>
            <div style={styles.headerCell}>SOC Qty</div>
            <div style={styles.headerCell}>Unit Price</div>
            <div style={styles.headerCell}>Per</div>
            <div style={styles.headerCell}>Amount</div>
            <div style={styles.headerCell}>Action</div>
          </div>

          {products.map((prod, idx) => (
            <div key={idx} style={styles.tableRow}>
              {/* Sr No */}
              <div>{prod.serialNumber || idx + 1}</div>

              {/* Description */}
              <div>
                <textarea
                  style={styles.textarea}
                  rows={2}
                  value={prod.description || ""}
                  onChange={(e) =>
                    handleProductFieldChange(
                      idx,
                      "description",
                      toUpper(e.target.value)
                    )
                  }
                />
              </div>

              {/* RITC */}
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

              {/* Quantity - RAW STRING DURING TYPING */}
              <div>
                <input
                  ref={(el) => {
                    inputRefs.current[`${idx}-quantity`] = el;
                  }}
                  type="text"
                  style={styles.input}
                  value={prod.quantity || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.-]/g, "");
                    handleProductFieldChange(idx, "quantity", value, {
                      autoRecalc: true,
                    });
                  }}
                  onBlur={() => handleBlur(idx, "quantity")}
                  placeholder="0.000"
                />
              </div>

              {/* Qty Unit */}
              <div>
                <select
                  style={styles.input}
                  value={prod.qtyUnit || ""}
                  onChange={(e) =>
                    handleProductFieldChange(idx, "qtyUnit", e.target.value)
                  }
                >
                  <option value="">Unit</option>
                  {unitCodes &&
                    unitCodes.map((unit) => (
                      <option key={unit.code || unit} value={unit.code || unit}>
                        {unit.code || unit}
                      </option>
                    ))}
                </select>
              </div>

              {/* SOC Qty - RAW STRING DURING TYPING */}
              <div>
                <input
                  ref={(el) => {
                    inputRefs.current[`${idx}-socQuantity`] = el;
                  }}
                  type="text"
                  style={styles.input}
                  value={prod.socQuantity || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.-]/g, "");
                    handleProductFieldChange(idx, "socQuantity", value);
                  }}
                  onBlur={() => handleBlur(idx, "socQuantity")}
                  placeholder="0.00000"
                />
              </div>

              {/* Unit Price - RAW STRING DURING TYPING */}
              <div>
                <input
                  ref={(el) => {
                    inputRefs.current[`${idx}-unitPrice`] = el;
                  }}
                  type="text"
                  style={styles.input}
                  value={prod.unitPrice || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.-]/g, "");
                    handleProductFieldChange(idx, "unitPrice", value, {
                      autoRecalc: true,
                    });
                  }}
                  onBlur={() => handleBlur(idx, "unitPrice")}
                  placeholder="0.0000"
                />
              </div>

              {/* Per - RAW STRING DURING TYPING */}
              <div>
                <input
                  ref={(el) => {
                    inputRefs.current[`${idx}-per`] = el;
                  }}
                  type="text"
                  style={styles.input}
                  value={prod.per || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.-]/g, "");
                    handleProductFieldChange(idx, "per", value, {
                      autoRecalc: true,
                    });
                  }}
                  onBlur={() => handleBlur(idx, "per")}
                  placeholder="1"
                />
              </div>

              {/* Amount - RAW STRING DURING TYPING */}
              <div>
                <input
                  ref={(el) => {
                    inputRefs.current[`${idx}-amount`] = el;
                  }}
                  type="text"
                  style={styles.input}
                  value={prod.amount || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.-]/g, "");
                    handleProductFieldChange(idx, "amount", value);
                  }}
                  onBlur={() => handleBlur(idx, "amount")}
                  placeholder="0.00"
                />
              </div>

              {/* Action: Copy + Delete */}
              <div>
                <button
                  type="button"
                  style={styles.smallButton}
                  onClick={() => copyProduct(idx)}
                >
                  Copy
                </button>
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
