// InvoiceMainTab.jsx
import React, { useRef, useCallback, useEffect, useState } from "react";
import { currencyList } from "../../../../utils/masterList";

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 12,
    color: "#1e2e38",
  },
  row: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  field: { minWidth: 120 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#7b8290",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  inputNumber: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "right",
    fontWeight: 600,
  },
  inputDate: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "none",
    fontWeight: 500,
  },
  select: {
    width: "100%",
    fontSize: 12,
    padding: "2px 4px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  pill: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: 3,
    border: "1px solid #cbd5e1",
    background: "#f9fafb",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    minWidth: 35,
    textAlign: "center",
  },
};

const termsOptions = ["FOB", "CIF", "C&F", "C&I"];
const priceIncludesOptions = ["Both", "Freight", "Insurance", "None"];
const taxableBaseOptions = ["Product Value", "Product FOB"];

function toUpper(v) {
  return (typeof v === "string" ? v : "").toUpperCase();
}

const InvoiceMainTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);

  // currency code -> export_rate map from /api/currency-rates
  const [rateMap, setRateMap] = useState({});

  // fetch latest currency rates once
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("http://localhost:9002/api/currency-rates");
        const json = await res.json();
        if (!json?.success || !Array.isArray(json.data) || !json.data.length)
          return;

        // assume first element is latest active notification
        const latest = json.data[0];
        const map = {};
        (latest.exchange_rates || []).forEach((r) => {
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
  }, []);

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

  const invoice = formik.values.invoices?.[0] || {};

  const setInvoicesArray = (updatedInvoice) => {
    const current = formik.values.invoices || [];
    const next = [...current];
    next[0] = { ...(next[0] || {}), ...updatedInvoice };
    formik.setFieldValue("invoices", next);
  };

  const handleInvChange = (field, value) => {
    const updatedInvoice = { [field]: value };

    // when TOI changes, set priceIncludes + FOB/CIF pill
    if (field === "termsOfInvoice") {
      const priceIncludesValue = mapTOIToPriceIncludes(value);
      updatedInvoice.priceIncludes = priceIncludesValue;

      if (value === "CIF") {
        updatedInvoice.productValuePill = "CIF";
      } else if (["FOB", "C&F", "C&I"].includes(value)) {
        updatedInvoice.productValuePill = "FOB";
      }
    }

    // when currency changes, also set exchange_rate from rateMap
    if (field === "currency") {
      const code = (value || "").toUpperCase();
      const exportRate = rateMap[code]; // e.g. 100.85 for EUR
      if (typeof exportRate === "number") {
        formik.setFieldValue("exchange_rate", exportRate);
      }
    }

    setInvoicesArray(updatedInvoice);

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

  useEffect(() => {
    if (invoice.termsOfInvoice && !invoice.priceIncludes) {
      const priceIncludesValue = mapTOIToPriceIncludes(invoice.termsOfInvoice);
      handleInvChange("priceIncludes", priceIncludesValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currencyCodes = (currencyList || []).map((c) => c.code || c);

  return (
    <div style={styles.page}>
      {/* Row 1: Invoice No, Date, TOI & Place */}
      <div style={styles.row}>
        <div style={{ ...styles.field, minWidth: 160 }}>
          <div style={styles.label}>Invoice No</div>
          <input
            style={styles.input}
            value={toUpper(invoice.invoiceNumber || "")}
            onChange={(e) =>
              handleInvChange("invoiceNumber", e.target.value.toUpperCase())
            }
            placeholder="ENTER INVOICE NO"
          />
        </div>

        <div style={{ ...styles.field, minWidth: 130 }}>
          <div style={styles.label}>Date</div>
          <input
            type="date"
            style={styles.inputDate}
            value={
              invoice.invoiceDate
                ? String(invoice.invoiceDate).substr(0, 10)
                : ""
            }
            onChange={(e) => handleInvChange("invoiceDate", e.target.value)}
          />
        </div>

        <div style={{ ...styles.field, minWidth: 110 }}>
          <div style={styles.label}>TOI</div>
          <select
            style={styles.select}
            value={invoice.termsOfInvoice || ""}
            onChange={(e) => handleInvChange("termsOfInvoice", e.target.value)}
          >
            <option value="">SELECT</option>
            {termsOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ ...styles.field, minWidth: 150 }}>
          <div style={styles.label}>Place</div>
          <input
            style={styles.input}
            value={toUpper(invoice.toiPlace || "")}
            onChange={(e) => handleInvChange("toiPlace", e.target.value)}
            placeholder=" ENTER PLACE"
          />
        </div>
      </div>

      {/* Row 2: Currency + rate + Price Includes + Taxable base */}
      <div style={styles.row}>
        <div style={{ ...styles.field, minWidth: 110 }}>
          <div style={styles.label}>Currency</div>
          <select
            style={styles.select}
            value={invoice.currency || ""}
            onChange={(e) => handleInvChange("currency", e.target.value)}
          >
            <option value="">SELECT</option>
            {currencyCodes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ ...styles.field, minWidth: 90 }}>
          <input
            type="number"
            style={styles.inputNumber}
            value={formik.values.exchange_rate || 1}
            onChange={(e) =>
              handleFieldChange(
                "exchange_rate",
                parseFloat(e.target.value || 0)
              )
            }
          />
        </div>

        <div style={{ ...styles.field, minWidth: 140 }}>
          <div style={styles.label}>Price Includes</div>
          <select
            style={styles.select}
            value={invoice.priceIncludes || "Neither"}
            onChange={(e) => handleInvChange("priceIncludes", e.target.value)}
          >
            {priceIncludesOptions.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div style={{ ...styles.field, minWidth: 170 }}>
          <div style={styles.label}>Taxable value for IGST</div>
          <select
            style={styles.select}
            value={formik.values.taxableBase || "Product Value"}
            onChange={(e) => handleFieldChange("taxableBase", e.target.value)}
          >
            {taxableBaseOptions.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Invoice Value, Product Value, Packing/FOB */}
      <div style={styles.row}>
        <div style={{ ...styles.field, minWidth: 170 }}>
          <div style={styles.label}>Invoice Value</div>
          <input
            type="number"
            style={styles.inputNumber}
            value={invoice.invoiceValue}
            onChange={(e) =>
              handleInvChange(
                "invoiceValue",
                parseFloat(e.target.value || 0)
              )
            }
          />
        </div>

        <div style={{ ...styles.field, minWidth: 200 }}>
          <div style={styles.label}>Product Value</div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="number"
              style={styles.inputNumber}
              value={
                invoice.productValue ??
                invoice.product_value_fob ??
                0
              }
              onChange={(e) =>
                handleInvChange(
                  "productValue",
                  parseFloat(e.target.value || 0)
                )
              }
            />
            <span style={styles.pill}>
              {invoice.termsOfInvoice === "CIF" ? "CIF" : "FOB"}
            </span>
          </div>
        </div>

        <div style={{ ...styles.field, minWidth: 160 }}>
          <div style={styles.label}>Packing / FOB</div>
          <input
            type="number"
            style={styles.inputNumber}
            value={invoice.packing_fob ?? 0}
            onChange={(e) =>
              handleInvChange(
                "packing_fob",
                parseFloat(e.target.value || 0)
              )
            }
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceMainTab;
