import { unitCodes, currencyList } from "../../../../utils/masterList";
import React, { useRef, useState, useCallback, useEffect } from "react";
import SearchableDropdown from "../../../common/SearchableDropdown";
import RITCSearchableDropdown from "../../../common/RITCSearchableDropdown";

function toUpper(val) {
  return (typeof val === "string" ? val : "").toUpperCase();
}

// ---- format helpers ----
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
  tableWrapper: {
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    background: "#ffffff",
    marginBottom: 10,
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: 1400,
    borderCollapse: "collapse",
  },
  th: {
    fontSize: 11,
    fontWeight: 700,
    color: "#f9fafb",
    background: "#16408f",
    padding: "8px 6px",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 10,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 6px",
    borderBottom: "1px solid #e0e5f0",
    verticalAlign: "top",
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

const ProductMainTab = ({ formik, selectedInvoiceIndex }) => {
  const invoices = formik.values.invoices || [];
  const activeInvoice = invoices[selectedInvoiceIndex] || {};
  const products = activeInvoice.products || [];
  const inputRefs = useRef({});

  // Export State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [productToExportIndex, setProductToExportIndex] = useState(null);

  const setProducts = useCallback(
    (updatedProducts) => {
      const updatedInvoices = [...invoices];
      if (updatedInvoices[selectedInvoiceIndex]) {
        updatedInvoices[selectedInvoiceIndex] = {
          ...updatedInvoices[selectedInvoiceIndex],
          products: updatedProducts,
        };
        formik.setFieldValue("invoices", updatedInvoices);
      }
    },
    [formik, invoices, selectedInvoiceIndex],
  );

  const recalcAmount = useCallback((prod) => {
    const qty = Number(prod.quantity) || 0;
    const rate = Number(prod.unitPrice) || 0;
    const per = Number(prod.per) || 1;
    return (qty * rate) / per;
  }, []);

  const handleProductFieldChange = useCallback(
    (idx, field, rawValue, { autoRecalc = false } = {}) => {
      const updated = [...products];
      const current = { ...updated[idx] };

      current[field] = rawValue;

      if (autoRecalc && field !== "amount") {
        const calculated = recalcAmount(current);
        if (!isNaN(calculated) && isFinite(calculated)) {
          current.amount = formatAmount(calculated);
        }
      }

      // Propagate Unit change
      if (field === "qtyUnit") {
        // Only update perUnit, do NOT overwrite socunit (user request)
        current.perUnit = rawValue;
      }

      updated[idx] = current;
      setProducts(updated);
    },
    [products, setProducts, recalcAmount],
  );

  const handleRITCChange = useCallback(
    (idx, ritcValue, origin) => {
      const updated = [...products];
      const current = { ...updated[idx] };
      current.ritc = toUpper(ritcValue);

      if (origin && origin.unit) {
        const u = origin.unit.toUpperCase();
        const matched = unitCodes.find((c) => c === u || c.startsWith(u));
        if (matched) {
          current.socunit = matched;
        }
      }

      updated[idx] = current;
      setProducts(updated);
    },
    [products, setProducts],
  );

  const handleBlur = useCallback(
    (idx, field) => {
      const updated = [...products];
      const current = { ...updated[idx] };
      const value = current[field];

      switch (field) {
    case "quantity":
      if (Number(value) <= 0 && value !== "") {
        alert("Quantity must be greater than zero");
        current[field] = "";
      } else {
        current[field] = formatQty(value);
      }
      break;
    case "ritc":
      if (value && !/^\d+$/.test(value)) {
        alert("HSN Code must be numeric");
        current[field] = "";
      }
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
        case "per": {
          const num = Number(value);
          current[field] = isNaN(num) ? value : String(num);
          break;
        }
        default:
          break;
      }

      updated[idx] = current;
      setProducts(updated);
    },
    [products, setProducts],
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
      priceUnit: activeInvoice?.currency || "",
      amountUnit: activeInvoice?.currency || "",
    });
    setProducts(next);
  }, [products, setProducts, activeInvoice]);

  const deleteProduct = useCallback(
    (idx) => {
      const next = products
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, serialNumber: i + 1 }));
      setProducts(next);
    },
    [products, setProducts],
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
    [products, setProducts],
  );

  const openExportModal = (idx) => {
    setProductToExportIndex(idx);
    setExportModalOpen(true);
  };

  const closeExportModal = () => {
    setExportModalOpen(false);
    setProductToExportIndex(null);
  };

  const handleExportToInvoice = (targetInvIndex) => {
    if (productToExportIndex === null) return;
    if (targetInvIndex === selectedInvoiceIndex) return; // same invoice

    const updatedInvoices = [...invoices];
    const targetInvoice = { ...updatedInvoices[targetInvIndex] };
    const sourceProduct = products[productToExportIndex];

    const newProduct = { ...sourceProduct };
    delete newProduct._id;

    // Recalculate serial number for the target
    const targetProducts = targetInvoice.products || [];
    newProduct.serialNumber = targetProducts.length + 1;

    targetInvoice.products = [...targetProducts, newProduct];
    updatedInvoices[targetInvIndex] = targetInvoice;

    formik.setFieldValue("invoices", updatedInvoices);
    closeExportModal();
    alert("Product exported successfully!");
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, padding: "16px", marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={styles.cardTitle}>
            Selected Invoice:{" "}
            {activeInvoice.invoiceNumber || `#${selectedInvoiceIndex + 1}`}
          </div>
        </div>
        {activeInvoice?.currency && (
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginTop: "4px",
              fontStyle: "italic",
            }}
          >
            Active Currency: <strong>{activeInvoice.currency}</strong> (Used for
            unit and total price)
          </div>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Product Items</div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 50 }}>Sr No</th>
                <th style={{ ...styles.th, width: 200 }}>Description</th>
                <th style={{ ...styles.th, width: 140 }}>RITC</th>
                <th style={{ ...styles.th, width: 170 }}>Quantity</th>
                <th style={{ ...styles.th, width: 170 }}>SOC Qty</th>
                <th style={{ ...styles.th, width: 110 }}>Unit Price</th>
                <th style={{ ...styles.th, width: 90 }}>Currency</th>
                <th style={{ ...styles.th, width: 130 }}>Per</th>
                <th style={{ ...styles.th, width: 110 }}>Amount</th>
                <th style={{ ...styles.th, width: 100 }}>Currency</th>
                <th style={{ ...styles.th, width: 180 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod, idx) => (
                <tr key={idx}>
                  <td style={styles.td}>{prod.serialNumber || idx + 1}</td>
                  <td style={styles.td}>
                    <textarea
                      style={styles.textarea}
                      rows={2}
                      maxLength={120}
                      value={prod.description || ""}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "description",
                          toUpper(e.target.value),
                        )
                      }
                    />
                    <div
                      style={{
                        fontSize: 10,
                        color: "#666",
                        textAlign: "right",
                      }}
                    >
                      {(prod.description || "").length}/120
                    </div>
                  </td>
                  <td style={styles.td}>
                    <RITCSearchableDropdown
                      value={toUpper(prod.ritc || "")}
                      onChange={(e) =>
                        handleRITCChange(idx, e.target.value, e.origin)
                      }
                      style={{ fontSize: 12, height: 24 }}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        type="text"
                        style={{ ...styles.input, flex: 1 }}
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
                      <SearchableDropdown
                        options={unitCodes}
                        value={prod.qtyUnit || ""}
                        onChange={(e) =>
                          handleProductFieldChange(
                            idx,
                            "qtyUnit",
                            e.target.value,
                          )
                        }
                        placeholder="Unit"
                        style={{ width: 70, fontSize: 12, height: 24 }}
                      />
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        type="text"
                        style={{ ...styles.input, flex: 1 }}
                        value={prod.socQuantity || ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.-]/g, "");
                          handleProductFieldChange(idx, "socQuantity", value);
                        }}
                        onBlur={() => handleBlur(idx, "socQuantity")}
                        placeholder="0.00000"
                      />
                      <SearchableDropdown
                        options={unitCodes}
                        value={prod.socunit || ""}
                        onChange={(e) =>
                          handleProductFieldChange(
                            idx,
                            "socunit",
                            e.target.value,
                          )
                        }
                        placeholder="Unit"
                        style={{ width: 70, fontSize: 12, height: 24 }}
                      />
                    </div>
                  </td>
                  <td style={styles.td}>
                    <input
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
                  </td>
                  <td style={styles.td}>
                    <select
                      style={styles.input}
                      value={activeInvoice?.currency || ""}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "priceUnit",
                          e.target.value,
                        )
                      }
                      disabled={activeInvoice?.currency}
                    >
                      <option value="">Currency</option>
                      {currencyList &&
                        currencyList.map((cur) => (
                          <option key={cur.code} value={cur.code}>
                            {cur.code}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        type="text"
                        style={{ ...styles.input, flex: 1 }}
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
                      <SearchableDropdown
                        options={unitCodes}
                        value={prod.perUnit || ""}
                        onChange={(e) =>
                          handleProductFieldChange(
                            idx,
                            "perUnit",
                            e.target.value,
                          )
                        }
                        placeholder="Unit"
                        style={{ width: 70, fontSize: 12, height: 24 }}
                      />
                    </div>
                  </td>
                  <td style={styles.td}>
                    <input
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
                  </td>
                  <td style={styles.td}>
                    <select
                      style={styles.input}
                      value={activeInvoice?.currency || ""}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "amountUnit",
                          e.target.value,
                        )
                      }
                      disabled={activeInvoice?.currency}
                    >
                      <option value="">Currency</option>
                      {currencyList &&
                        currencyList.map((cur) => (
                          <option key={cur.code} value={cur.code}>
                            {cur.code}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td style={styles.td}>
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
                    <button
                      type="button"
                      style={{ ...styles.smallButton, marginLeft: 6 }}
                      onClick={() => openExportModal(idx)}
                    >
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {exportModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              minWidth: 300,
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#16408f",
                fontSize: 16,
                marginBottom: 16,
              }}
            >
              Select Invoice to Export
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {invoices.map((inv, idx) => {
                if (idx === selectedInvoiceIndex) return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d2d8e4",
                      background: "#f7fafc",
                      borderRadius: 4,
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 13,
                    }}
                    onClick={() => handleExportToInvoice(idx)}
                  >
                    <strong>#{idx + 1}</strong> -{" "}
                    {inv.invoiceNumber || "(No Invoice No)"}
                  </button>
                );
              })}
              {invoices.length <= 1 && (
                <div style={{ padding: 10, color: "#666", fontSize: 12 }}>
                  No other invoices available.
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                type="button"
                style={{
                  padding: "6px 12px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onClick={closeExportModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMainTab;
