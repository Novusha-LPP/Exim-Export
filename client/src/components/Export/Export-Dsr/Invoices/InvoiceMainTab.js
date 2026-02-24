// InvoiceMainTab.jsx
import React, { useRef, useCallback, useEffect, useState } from "react";
import DateInput from "../../../common/DateInput.js";
import { currencyList } from "../../../../utils/masterList";
import "../../../../styles/InvoiceMainTab.scss";
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
    overflowY: "auto", // no horizontal scroll
    maxHeight: 400,
  },
  table: {
    width: "100%",
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
  inputNumber: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "right",
    fontWeight: 700,
  },
  inputDate: {
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
  select: {
    width: "100%",
    fontSize: 12,
    padding: "2px 4px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
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

const termsOptions = ["FOB", "CIF", "C&F", "C&I"];
const priceIncludesOptions = ["Both", "Freight", "Insurance", "None"];
const taxableBaseOptions = ["Product Value", "Product FOB"];

function toUpper(v) {
  return (typeof v === "string" ? v : "").toUpperCase();
}

const getJobDateFormatted = (jobDate) => {
  if (!jobDate) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  const parts = jobDate.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return jobDate;
};

const InvoiceMainTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);
  const [rateMap, setRateMap] = useState({});

  // fetch currency rates for job_date
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const dateStr = getJobDateFormatted(formik.values.job_date);
        const res = await fetch(
          `${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${dateStr}`,
        );
        const json = await res.json();

        if (!json?.success || !json?.data) {
          return;
        }

        const map = {};
        (json.data.exchange_rates || []).forEach((r) => {
          if (r.currency_code && typeof r.export_rate === "number") {
            map[r.currency_code.toUpperCase()] = r.export_rate;
          }
        });
        setRateMap(map);
      } catch (e) {
        console.error("Failed to load currency rates", e);
      }
    };
    fetchRates();
  }, [formik.values.job_date]);

  // AUTO-SYNC: Update values when rateMap changes (e.g. after job_date change)
  useEffect(() => {
    if (Object.keys(rateMap).length === 0) return;

    let anyChanges = false;
    const invList = formik.values.invoices || [];

    // 1. Update top-level exchange_rate based on first invoice currency
    const firstCurrency = (invList[0]?.currency || "").toUpperCase();
    if (firstCurrency && rateMap[firstCurrency]) {
      const newGlobalRate = rateMap[firstCurrency];
      if (formik.values.exchange_rate !== newGlobalRate) {
        formik.setFieldValue("exchange_rate", newGlobalRate);
        anyChanges = true;
      }
    }

    // 2. Update nested freightInsuranceCharges exchangeRate for all invoices
    const nextInvoices = invList.map((inv) => {
      const charges = inv.freightInsuranceCharges || {};
      let chargesChanged = false;
      const nextCharges = { ...charges };

      const rowKeys = [
        "freight",
        "insurance",
        "discount",
        "otherDeduction",
        "commission",
        "fobValue",
      ];

      rowKeys.forEach((k) => {
        const row = charges[k] || {};
        const code = (row.currency || "").toUpperCase();
        if (code && rateMap[code]) {
          const newRate = rateMap[code];
          if (row.exchangeRate !== newRate) {
            nextCharges[k] = { ...row, exchangeRate: newRate };
            chargesChanged = true;
          }
        }
      });

      if (chargesChanged) {
        anyChanges = true;
        return { ...inv, freightInsuranceCharges: nextCharges };
      }
      return inv;
    });

    if (anyChanges) {
      formik.setFieldValue("invoices", nextInvoices);
    }
  }, [rateMap, formik.setFieldValue]);

  const mapTOIToPriceIncludes = (toi) => {
    switch (toi?.toUpperCase()) {
      case "C&I":
        return "Insurance";
      case "C&F":
        return "Freight";
      case "CIF":
        return "Both";
      case "FOB":
      default:
        return "None";
    }
  };

  const autoSave = useCallback((values) => {
    // debounce-save logic here if needed
  }, []);

  const invoices = formik.values.invoices || [];

  useEffect(() => {
    if (invoices.length === 0) {
      formik.setFieldValue("invoices", [{}]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productsSignature = JSON.stringify(
    invoices.map((inv) => (inv.products || []).map((p) => p.amount)),
  );

  const prevSumsRef = useRef(null);

  useEffect(() => {
    const currentSums = invoices.map((inv) =>
      (inv.products || []).reduce(
        (acc, p) => acc + (parseFloat(p.amount) || 0),
        0,
      ),
    );

    if (prevSumsRef.current === null) {
      const isPopulated = invoices.some((inv) => inv._id || inv.invoiceNumber);
      if (isPopulated) {
        prevSumsRef.current = currentSums;
      }
      return;
    }

    let changed = false;
    const nextInvoices = invoices.map((inv, idx) => {
      const oldSum = prevSumsRef.current[idx] ?? 0;
      const newSum = currentSums[idx] || 0;

      if (Math.abs(oldSum - newSum) > 0.01) {
        if (Math.abs((parseFloat(inv.productValue) || 0) - newSum) > 0.01) {
          changed = true;
          return { ...inv, productValue: newSum };
        }
      }
      return inv;
    });

    if (changed) {
      formik.setFieldValue("invoices", nextInvoices);
    }
    prevSumsRef.current = currentSums;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsSignature]);

  const handleInvChange = (index, field, value) => {
    const updatedInvoices = [...invoices];
    const invoice = updatedInvoices[index] || {};
    const updatedInvoice = { ...invoice, [field]: value };

    if (field === "termsOfInvoice") {
      const priceIncludesValue = mapTOIToPriceIncludes(value);
      updatedInvoice.priceIncludes = priceIncludesValue;

      if (value === "CIF") {
        updatedInvoice.productValuePill = "CIF";
      } else if (["FOB", "C&F", "C&I"].includes(value)) {
        updatedInvoice.productValuePill = "FOB";
      }
    }

    if (field === "currency") {
      const code = (value || "").toUpperCase();
      const exportRate = rateMap[code];

      if (typeof exportRate === "number") {
        formik.setFieldValue("exchange_rate", exportRate);
      }

      const currentCharges = updatedInvoice.freightInsuranceCharges || {};
      const rowKeys = [
        "freight",
        "insurance",
        "discount",
        "otherDeduction",
        "commission",
        "fobValue",
      ];
      const nextCharges = { ...currentCharges };

      rowKeys.forEach((k) => {
        const row = currentCharges[k] || {};
        nextCharges[k] = {
          ...row,
          currency: code,
          exchangeRate:
            typeof exportRate === "number" ? exportRate : row.exchangeRate || 0,
        };
      });

      updatedInvoice.freightInsuranceCharges = nextCharges;
    }

    updatedInvoices[index] = updatedInvoice;
    formik.setFieldValue("invoices", updatedInvoices);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 800);
  };

  const handleFieldChange = (field, value) => {
    formik.setFieldValue(field, value);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 800);
  };

  const addInvoice = () => {
    const newInvoice = {
      invoiceNumber: "",
      invoiceDate: "",
      termsOfInvoice: "FOB",
      toiPlace: "",
      currency: "",
      invoiceValue: "",
      productValue: "",
      priceIncludes: "None",
      products: [],
    };
    formik.setFieldValue("invoices", [...invoices, newInvoice]);
  };

  const removeInvoice = (index) => {
    if (invoices.length <= 1) {
      alert("At least one invoice is required");
      return;
    }
    const updatedInvoices = invoices.filter((_, i) => i !== index);
    formik.setFieldValue("invoices", updatedInvoices);
  };

  const copyInvoice = (index) => {
    const shouldCopyProducts = window.confirm(
      "Do you want to copy the products as well?",
    );

    const sourceInvoice = invoices[index];
    const newInvoice = { ...sourceInvoice };

    // If user said NO, we clear the products (but keep other main details)
    if (!shouldCopyProducts) {
      newInvoice.products = [];
      newInvoice.productValue = "";
      newInvoice.invoiceValue = ""; // Potentially reset values driven by products
    } else {
      // Deep copy products to avoid reference issues
      if (Array.isArray(newInvoice.products)) {
        newInvoice.products = newInvoice.products.map((p) => ({ ...p }));
      }
    }

    // Reset unique identifier fields if they exist (usually _id)
    delete newInvoice._id;

    const updatedInvoices = [...invoices];
    updatedInvoices.splice(index + 1, 0, newInvoice);
    formik.setFieldValue("invoices", updatedInvoices);
  };

  const currencyCodes = (currencyList || []).map((c) => c.code || c);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>Invoice Items</div>

        <div className="invoice-table-wrapper" style={styles.tableWrapper}>
          <table className="invoice-table" style={styles.table}>
            <thead className="invoice-table-head">
              <tr>
                <th style={{ ...styles.th, width: 50 }}>Sr No</th>
                <th style={{ ...styles.th, width: 140 }}>Invoice No</th>
                <th style={{ ...styles.th, width: 120 }}>Invoice Date</th>
                <th style={{ ...styles.th, width: 100 }}>TOI</th>
                <th style={{ ...styles.th, width: 100 }}>Currency</th>
                <th style={{ ...styles.th, width: 50 }}>Exchange Rate</th>
                <th style={{ ...styles.th, width: 130 }}>Price Includes</th>
                <th style={{ ...styles.th, width: 140 }}>
                  Taxable Base (IGST)
                </th>
                <th style={{ ...styles.th, width: 120 }}>Invoice Value</th>
                <th style={{ ...styles.th, width: 140 }}>Product Value</th>
                <th style={{ ...styles.th, width: 120 }}>Packing Charges</th>
                <th style={{ ...styles.th, width: 140 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <tr key={index} className="invoice-row">
                  <td style={styles.td} data-label="Sr No">
                    {index + 1}
                  </td>

                  <td style={styles.td} data-label="Invoice No">
                    <input
                      style={styles.input}
                      value={toUpper(invoice.invoiceNumber || "")}
                      onChange={(e) =>
                        handleInvChange(
                          index,
                          "invoiceNumber",
                          e.target.value.toUpperCase().replace(/[^A-Z0-9\-\/]/g, ''),
                        )
                      }
                      placeholder="INVOICE NO"
                    />
                  </td>

                  <td style={styles.td} data-label="Invoice Date">
                    <DateInput
                      style={styles.inputDate}
                      value={invoice.invoiceDate || ""}
                      onChange={(e) =>
                        handleInvChange(index, "invoiceDate", e.target.value)
                      }
                    />
                  </td>

                  <td style={styles.td} data-label="TOI">
                    <select
                      style={styles.select}
                      value={invoice.termsOfInvoice || ""}
                      onChange={(e) =>
                        handleInvChange(index, "termsOfInvoice", e.target.value)
                      }
                    >
                      <option value="">SELECT</option>
                      {termsOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={styles.td} data-label="Currency">
                    <select
                      style={styles.select}
                      value={invoice.currency || ""}
                      onChange={(e) =>
                        handleInvChange(index, "currency", e.target.value)
                      }
                    >
                      <option value="">SELECT</option>
                      {currencyCodes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={styles.td} data-label="Exchange Rate">
                    <input
                      type="number"
                      style={styles.inputNumber}
                      value={
                        formik.values.exchange_rate === 0
                          ? ""
                          : formik.values.exchange_rate
                      }
                      onChange={(e) =>
                        handleFieldChange(
                          "exchange_rate",
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={styles.td} data-label="Price Includes">
                    <select
                      style={styles.select}
                      value={invoice.priceIncludes || "Neither"}
                      onChange={(e) =>
                        handleInvChange(index, "priceIncludes", e.target.value)
                      }
                    >
                      {priceIncludesOptions.map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={styles.td} data-label="Taxable Base (IGST)">
                    <select
                      style={styles.select}
                      value={formik.values.taxableBase || "Product Value"}
                      onChange={(e) =>
                        handleFieldChange("taxableBase", e.target.value)
                      }
                    >
                      {taxableBaseOptions.map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={styles.td} data-label="Invoice Value">
                    <input
                      type="number"
                      style={styles.inputNumber}
                      value={
                        invoice.invoiceValue === 0 ||
                          invoice.invoiceValue === ""
                          ? ""
                          : invoice.invoiceValue
                      }
                      onChange={(e) =>
                        handleInvChange(
                          index,
                          "invoiceValue",
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={styles.td} data-label="Product Value">
                    <input
                      type="number"
                      style={styles.inputNumber}
                      value={
                        invoice.productValue === 0 ||
                          invoice.productValue === ""
                          ? ""
                          : invoice.productValue
                      }
                      onChange={(e) =>
                        handleInvChange(
                          index,
                          "productValue",
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>
                  <td style={styles.td} data-label="Packing Charges">
                    <input
                      type="number"
                      style={styles.inputNumber}
                      value={
                        invoice.packing_charges === 0 ||
                          invoice.packing_charges === ""
                          ? ""
                          : invoice.packing_charges
                      }
                      onChange={(e) =>
                        handleInvChange(
                          index,
                          "packing_charges",
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={styles.td} data-label="Action">
                    <button
                      type="button"
                      style={styles.smallButton}
                      onClick={() => copyInvoice(index)}
                    >
                      Copy
                    </button>
                    {invoices.length > 1 && (
                      <button
                        type="button"
                        style={styles.linkButton}
                        onClick={() => removeInvoice(index)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="button" style={styles.smallButton} onClick={addInvoice}>
            + Add New Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceMainTab;
