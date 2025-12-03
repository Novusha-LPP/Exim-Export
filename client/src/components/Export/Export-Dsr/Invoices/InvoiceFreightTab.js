// InvoiceFreightTab.jsx
import React, { useRef, useCallback } from "react";
import { currencyList } from "../../../../utils/masterList";

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 12,
    color: "#1e2e38",
  },
  table: {
    border: "1px solid #d0d7e2",
    borderRadius: 4,
    padding: 10,
    background: "#ffffff",
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "120px 90px 110px 90px 120px 120px",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#6b7280",
    marginBottom: 4,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "120px 90px 110px 90px 120px 120px",
    gap: 6,
    alignItems: "center",
    marginBottom: 4,
  },
  labelCell: {
    fontSize: 11,
    fontWeight: 600,
    color: "#111827",
  },
  select: {
    width: "100%",
    fontSize: 12,
    padding: "2px 4px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    height: 22,
    background: "#f9fafb",
    outline: "none",
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "2px 4px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    height: 22,
    background: "#f9fafb",
    outline: "none",
    textAlign: "right",
  },
  readonly: {
    background: "#eef2f7",
  },
  disabled: {
    background: "#f3f4f6",
    color: "#9ca3af",
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#1f2933",
  },
};

const rowDefs = [
  { key: "freight", label: "Freight", hasBase: true },
  { key: "insurance", label: "Insurance", hasBase: true },
  { key: "discount", label: "Discount", hasBase: true },
  { key: "otherDeduction", label: "Other Deduction", hasBase: true },
  { key: "commission", label: "Commission", hasBase: true },
  { key: "fobValue", label: "FOB Value", isFOB: true },
];

const InvoiceFreightTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);

  const autoSave = useCallback(
    (values) => {
      // debounce-save hook if needed
    },
    []
  );

  const charges = formik.values.freightInsuranceCharges || {};
  const termsOfInvoice =
    formik.values.invoices?.[0]?.termsOfInvoice || formik.values.termsOfInvoice || "FOB";

  const handleChange = (sectionKey, field, value) => {
    const next = {
      freight: { ...(charges.freight || {}) },
      insurance: { ...(charges.insurance || {}) },
      discount: { ...(charges.discount || {}) },
      otherDeduction: { ...(charges.otherDeduction || {}) },
      commission: { ...(charges.commission || {}) },
      fobValue: { ...(charges.fobValue || {}) },
      ...charges,
    };

    next[sectionKey] = {
      ...(next[sectionKey] || {}),
      [field]: value,
    };

    formik.setFieldValue("freightInsuranceCharges", next);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 800);
  };

  const currencyCodes = (currencyList || []).map((c) => c.code || c);

  const getRow = (key) => charges[key] || {};

  // helpers for enable/disable logic
  const isFreightDisabled = termsOfInvoice === "C&I" || termsOfInvoice === "FOB";
  const isInsuranceDisabled = termsOfInvoice === "C&F" || termsOfInvoice === "FOB";

  const isRowDisabled = (rowKey) => {
    if (rowKey === "freight") return isFreightDisabled;
    if (rowKey === "insurance") return isInsuranceDisabled;
    return false;
  };

  // base value = invoice_value * row.exchangeRate
// base value = invoiceValue * exchangeRate
const getBaseValue = (rowKey, data) => {
  if (rowKey === "fobValue") return 0;
  const invoice = formik.values.invoices?.[0] || {};
  const invoiceVal = Number(invoice.invoiceValue || 0); // 0 by default
  const exRate = Number(data.exchangeRate || 1);        // 0 by default
  return invoiceVal * exRate;                           // will be 0 if any is 0
};

// amount = baseValue * rate / 100
const getAmount = (rowKey, data, baseValue) => {
  if (rowKey === "fobValue") {
    return Number(data.amount || 1);
  }
  const rate = Number(data.rate || 0);
  return (Number(baseValue || 1) * rate) / 100;
};


  return (
    <div style={styles.page}>
      <div style={styles.title}>Freight, Insurance & Other Charges</div>
      <div style={styles.table}>
        <div style={styles.headerRow}>
          <div />
          <div>Currency</div>
          <div>Exchange Rate</div>
          <div>Rate</div>
          <div>Base Value</div>
          <div>Amount</div>
        </div>

        {rowDefs.map((row) => {
          const data = getRow(row.key);
          const isFOB = row.isFOB;
          const disabled = isRowDisabled(row.key);

          const exchangeRate = isFOB
            ? Number(data.exchangeRate || 1)
            : Number(data.exchangeRate || 0);
            
const baseValue = row.hasBase ? getBaseValue(row.key, { ...data, exchangeRate }) : 0;
const computedAmount = getAmount(row.key, data, baseValue);

          return (
            <div style={styles.row} key={row.key}>
              {/* Row label */}
              <div style={styles.labelCell}>{row.label}</div>

              {/* Currency */}
              <div>
                <select
                  style={{
                    ...styles.select,
                    ...(disabled ? styles.disabled : {}),
                  }}
                  value={data.currency || (isFOB ? "INR" : "USD")}
                  disabled={disabled}
                  onChange={(e) =>
                    handleChange(row.key, "currency", e.target.value)
                  }
                >
                  {currencyCodes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exchange Rate */}
              <div>
                <input
                  type="number"
                  style={{
                    ...styles.input,
                    ...(disabled || isFOB ? styles.readonly : {}),
                    ...(disabled ? styles.disabled : {}),
                  }}
                  value={exchangeRate}
                  readOnly={disabled}
                  onChange={(e) =>
                    !disabled &&
                    handleChange(
                      row.key,
                      "exchangeRate",
                      parseFloat(e.target.value || 0)
                    )
                  }
                />
              </div>

              {/* Rate (percentage) – hidden for FOB */}
              <div>
                {isFOB ? (
                  <input
                    type="number"
                    style={{ ...styles.input, ...styles.readonly }}
                    value={0}
                    readOnly
                  />
                ) : (
                  <input
                    type="number"
                    style={{
                      ...styles.input,
                      ...(disabled ? styles.disabled : {}),
                    }}
                    value={disabled ? 0 : data.rate || 0}
                    disabled={disabled}
                    onChange={(e) =>
                      handleChange(
                        row.key,
                        "rate",
                        parseFloat(e.target.value || 0)
                      )
                    }
                  />
                )}
              </div>

              {/* Base Value – hidden content for FOB, computed for others */}
              <div>
                <input
                  type="number"
                  style={{
                    ...styles.input,
                    ...styles.readonly,
                  }}
                  value={
                    isFOB
                      ? ""
                      : Number.isFinite(baseValue)
                      ? baseValue.toFixed(2)
                      : ""
                  }
                  readOnly
                />
              </div>

              {/* Amount – 0 and disabled when row disabled; otherwise computed (non-FOB) or user entry (FOB) */}
              <div>
                <input
                  type="number"
                  style={{
                    ...styles.input,
                    ...(disabled ? styles.disabled : {}),
                  }}
                  value={
                    disabled
                      ? 0
                      : isFOB
                      ? data.amount ?? 0
                      : Number.isFinite(computedAmount)
                      ? computedAmount.toFixed(2)
                      : 0
                  }
                  disabled={disabled || !isFOB}
                  onChange={(e) =>
                    isFOB &&
                    handleChange(
                      row.key,
                      "amount",
                      parseFloat(e.target.value || 0)
                    )
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InvoiceFreightTab;
