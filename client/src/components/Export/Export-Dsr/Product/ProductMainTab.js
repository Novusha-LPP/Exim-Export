import { unitCodes, currencyList } from "../../../../utils/masterList";
import React, { useRef, useState, useCallback, useEffect } from "react";
import SearchableDropdown from "../../../common/SearchableDropdown";

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
    // overflowY: "auto",
    // maxHeight: 400,
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

const HS_LIMIT = 20; // per-page records in dialog

const ProductMainTab = ({ formik, selectedInvoiceIndex }) => {
  const invoices = formik.values.invoices || [];
  const activeInvoice = invoices[selectedInvoiceIndex] || {};
  const products = activeInvoice.products || [];
  const inputRefs = useRef({});

  // HS dialog state
  const [hsDialogOpen, setHsDialogOpen] = useState(false);
  const [hsDialogIndex, setHsDialogIndex] = useState(null);
  const [hsDialogQuery, setHsDialogQuery] = useState("");
  const [hsDialogOptions, setHsDialogOptions] = useState([]);
  const [hsDialogLoading, setHsDialogLoading] = useState(false);
  const [hsDialogActive, setHsDialogActive] = useState(-1);
  const [hsPage, setHsPage] = useState(1);
  const [hsTotalPages, setHsTotalPages] = useState(1);

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
    [formik, invoices, selectedInvoiceIndex]
  );

  const recalcAmount = useCallback((prod) => {
    const qty = Number(prod.quantity);
    const rate = Number(prod.unitPrice);
    const per = Number(prod.per);
    return (qty * rate) / per;
  }, []);

  const handleProductFieldChange = useCallback(
    (idx, field, rawValue, { autoRecalc = false } = {}) => {
      const updated = [...products];
      const current = { ...updated[idx] };

      current[field] = rawValue;

      if (autoRecalc && field !== "amount") {
        const calculated = recalcAmount(current);
        if (!isNaN(calculated)) {
          current.amount = String(calculated);
        }
      }

      // Propagate Unit change
      if (field === "qtyUnit") {
        current.socunit = rawValue;
        current.perUnit = rawValue;
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
      const value = current[field];

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

  // Debounced fetch for HS dialog (also used for immediate Enter search)
  const fetchHsCodes = useCallback(async (search, page) => {
    try {
      setHsDialogLoading(true);
      const params = new URLSearchParams();
      if (search && search.trim()) params.append("search", search.trim());
      params.append("page", page || 1);
      params.append("limit", HS_LIMIT);

      const res = await fetch(
        `${import.meta.env.VITE_API_STRING}/getCthsExport?${params.toString()}`
      );
      const data = await res.json();

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setHsDialogOptions(list);
      if (data?.pagination) {
        setHsTotalPages(data.pagination.totalPages || 1);
      } else {
        setHsTotalPages(1);
      }
    } catch (e) {
      console.error("HS dialog fetch error", e);
      setHsDialogOptions([]);
      setHsTotalPages(1);
    } finally {
      setHsDialogLoading(false);
    }
  }, []);

  // 1) Immediate fetch when page changes (no debounce)
  useEffect(() => {
    if (!hsDialogOpen) return;
    fetchHsCodes(hsDialogQuery, hsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsPage, hsDialogOpen, fetchHsCodes]);

  // 2) Debounced fetch when query changes (2s)
  useEffect(() => {
    if (!hsDialogOpen) return;

    const timer = setTimeout(() => {
      fetchHsCodes(hsDialogQuery, 1); // always reset to page 1 on new query
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsDialogQuery, hsDialogOpen, fetchHsCodes]);

  return (
    <div style={styles.page}>
      {/* Invoice Selector at Top */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Invoice selection is handled by parent ProductTab */}
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
                          toUpper(e.target.value)
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
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <input
                        style={{ ...styles.input, flex: 1 }}
                        value={toUpper(prod.ritc || "")}
                        onChange={(e) =>
                          handleProductFieldChange(
                            idx,
                            "ritc",
                            toUpper(e.target.value)
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setHsDialogIndex(idx);
                          setHsDialogQuery("");
                          setHsDialogOptions([]);
                          setHsDialogActive(-1);
                          setHsPage(1);
                          setHsDialogOpen(true);
                        }}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 4,
                          border: "1px solid #16408f",
                          background: "#f1f5ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title="Search HS Code"
                      >
                        🔍
                      </button>
                    </div>
                  </td>

                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        ref={(el) => {
                          inputRefs.current[`${idx}-quantity`] = el;
                        }}
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
                            e.target.value
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
                        ref={(el) => {
                          inputRefs.current[`${idx}-socQuantity`] = el;
                        }}
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
                            e.target.value
                          )
                        }
                        placeholder="Unit"
                        style={{ width: 70, fontSize: 12, height: 24 }}
                      />
                    </div>
                  </td>

                  <td style={styles.td}>
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
                  </td>

                  <td style={styles.td}>
                    <select
                      style={styles.input}
                      value={activeInvoice?.currency || ""}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "priceUnit",
                          e.target.value
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
                        ref={(el) => {
                          inputRefs.current[`${idx}-per`] = el;
                        }}
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
                            e.target.value
                          )
                        }
                        placeholder="Unit"
                        style={{ width: 70, fontSize: 12, height: 24 }}
                      />
                    </div>
                  </td>
                  <td style={styles.td}>
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
                  </td>

                  <td style={styles.td}>
                    <select
                      style={styles.input}
                      value={activeInvoice?.currency || ""}
                      onChange={(e) =>
                        handleProductFieldChange(
                          idx,
                          "amountUnit",
                          e.target.value
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

      {/* HS search dialog */}
      {hsDialogOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
          onClick={() => {
            setHsDialogOpen(false);
            setHsDialogIndex(null);
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 6,
              padding: 12,
              width: 520,
              maxHeight: 460,
              boxShadow: "0 12px 30px rgba(15,23,42,0.25)",
              fontSize: 12,
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 700, color: "#111827" }}>
                Search HS / RITC
              </div>
              <button
                type="button"
                onClick={() => {
                  setHsDialogOpen(false);
                  setHsDialogIndex(null);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            {/* Search box */}
            <div style={{ marginBottom: 8 }}>
              <input
                style={{ ...styles.input, width: "100%" }}
                placeholder="Type HS code or description"
                value={hsDialogQuery}
                onChange={(e) => {
                  const v = toUpper(e.target.value);
                  setHsDialogQuery(v);
                  setHsDialogActive(-1);
                  setHsPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fetchHsCodes(hsDialogQuery, 1);
                    setHsPage(1);
                  }
                }}
              />
            </div>

            {/* Results list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 4,
              }}
            >
              {hsDialogLoading && (
                <div style={{ padding: 8, color: "#6b7280" }}>Loading...</div>
              )}

              {!hsDialogLoading &&
                hsDialogOptions.length === 0 &&
                hsDialogQuery.trim().length >= 2 && (
                  <div style={{ padding: 8, color: "#9ca3af" }}>No results</div>
                )}

              {!hsDialogLoading &&
                hsDialogOptions.map((opt, idx) => (
                  <div
                    key={`${opt.hs_code}-${idx}`}
                    onClick={() => {
                      if (hsDialogIndex == null) return;
                      const targetIdx = hsDialogIndex;
                      const hs = toUpper(opt.hs_code || "");

                      handleProductFieldChange(targetIdx, "ritc", hs);

                      setHsDialogOpen(false);
                      setHsDialogIndex(null);
                    }}
                    onMouseEnter={() => setHsDialogActive(idx)}
                    style={{
                      padding: 8,
                      cursor: "pointer",
                      backgroundColor:
                        hsDialogActive === idx ? "#eff6ff" : "#ffffff",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {opt.hs_code || "-"}
                      </div>
                      <div style={{ fontSize: 11, color: "#1d4ed8" }}>
                        {opt.basic_duty_sch_tarrif != null
                          ? `Basic Duty: ${opt.basic_duty_sch_tarrif}`
                          : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#4b5563",
                        marginTop: 2,
                      }}
                    >
                      {opt.item_description || "-"}
                    </div>
                  </div>
                ))}
            </div>

            {/* Pagination inside dialog */}
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 11,
              }}
            >
              <div>
                Page {hsPage} of {hsTotalPages || 1}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  style={{
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: "1px solid #d1d5db",
                    backgroundColor: hsPage === 1 ? "#f9fafb" : "#ffffff",
                    cursor: hsPage === 1 ? "not-allowed" : "pointer",
                    fontSize: 11,
                  }}
                  disabled={hsPage === 1}
                  onClick={() => setHsPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </button>
                <button
                  type="button"
                  style={{
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: "1px solid #d1d5db",
                    backgroundColor:
                      hsPage >= hsTotalPages ? "#f9fafb" : "#ffffff",
                    cursor: hsPage >= hsTotalPages ? "not-allowed" : "pointer",
                    fontSize: 11,
                  }}
                  disabled={hsPage >= hsTotalPages}
                  onClick={() => setHsPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMainTab;
