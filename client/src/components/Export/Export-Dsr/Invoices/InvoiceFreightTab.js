// InvoiceFreightTab.jsx
import React, { useRef, useCallback, useEffect, useState } from "react";
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
  conversionInfo: {
    fontSize: 10,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 2,
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
  const [rateMap, setRateMap] = useState({});

  // Helper function to get today's date in DD-MM-YYYY format
  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Fetch currency rates for today's date
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const todayDate = getTodayFormatted();
        const res = await fetch(
        `${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${todayDate}`
        );
        const json = await res.json();

        if (!json?.success || !json?.data) {
          console.warn("No currency rates found for today");
          return;
        }

        const map = {};
        (json.data.exchange_rates || []).forEach((r) => {
          if (r.currency_code && typeof r.export_rate === "number") {
            map[r.currency_code.toUpperCase()] = r.export_rate;
          }
        });
        setRateMap(map);
        console.log("Currency rates loaded for", todayDate, map);
      } catch (e) {
        console.error("Failed to load currency rates (freight tab)", e);
      }
    };
    fetchRates();
  }, []);

  const autoSave = useCallback((values) => {
    // debounce-save hook if needed
  }, []);

  const charges = formik.values.freightInsuranceCharges || {};
  const invoice = formik.values.invoices?.[0] || {};
  const invoiceCurrency = (invoice.currency || "USD").toUpperCase();
  const invoiceExchangeRate = Number(formik.values.exchange_rate || 1); // invoiceCur → INR
  const termsOfInvoice =
    invoice.termsOfInvoice || formik.values.termsOfInvoice || "FOB";

  const currencyCodes = (currencyList || [])
    .map((c) => (c.code || c || "").toUpperCase())
    .filter(Boolean);

  const isFreightDisabled =
    termsOfInvoice === "C&I" || termsOfInvoice === "FOB";
  const isInsuranceDisabled =
    termsOfInvoice === "C&F" || termsOfInvoice === "FOB";

  const isRowDisabled = (rowKey) => {
    if (rowKey === "freight") return isFreightDisabled;
    if (rowKey === "insurance") return isInsuranceDisabled;
    return false;
  };

  // Convert value from row currency → invoice currency using INR as pivot
  const rowToInvoiceCurrency = (rowAmount, rowRateInInr) => {
    if (!rowAmount || !rowRateInInr || !invoiceExchangeRate) return 0;
    const amountInINR = rowAmount * rowRateInInr;
    const amountInInvoice = amountInINR / invoiceExchangeRate;
    return amountInInvoice;
  };

  // Base value = product value (invoice currency) converted to row currency via INR
  const getBaseValue = (rowKey, data) => {
    if (rowKey === "fobValue") return 0;

    const inv = formik.values.invoices?.[0] || {};
    const productVal = Number(inv.productValue || inv.invoiceValue || 0);
    if (!productVal) return 0;

    const rowRate = Number(data.exchangeRate || 0); // rowCur → INR
    if (!rowRate || !invoiceExchangeRate) return 0;

    // Step 1: product value to INR
    const valueInINR = productVal * invoiceExchangeRate;
    // Step 2: INR to row currency
    const valueInRowCurrency = valueInINR / rowRate;

    return valueInRowCurrency;
  };

  // amount = baseValue * rate / 100 (for non-FOB)
  const getAmount = (rowKey, data, baseValue) => {
    if (rowKey === "fobValue") {
      return Number(data.amount || 0);
    }
    const rate = Number(data.rate || 0);
    return (Number(baseValue || 0) * rate) / 100;
  };

  // Compute FOB in INR from all other row amounts
  const computeFOBCharges = () => {
    const inv = formik.values.invoices?.[0] || {};
    const invoiceVal = Number(inv.invoiceValue || 0); // in invoice currency
    if (!invoiceVal || !invoiceExchangeRate) return charges;

    let totalNonFOBInInvoice = 0;

    ["freight", "insurance", "discount", "otherDeduction", "commission"].forEach(
      (k) => {
        const row = charges[k] || {};
        const rowAmount = Number(row.amount || 0);
        if (!rowAmount) return;

        const rowRate = Number(row.exchangeRate || 0); // rowCur → INR
        const amountInInvoice = rowToInvoiceCurrency(rowAmount, rowRate);
        totalNonFOBInInvoice += amountInInvoice;
      }
    );

    const fobInInvoice = invoiceVal - totalNonFOBInInvoice;
    const fobInINR = fobInInvoice * invoiceExchangeRate;

    const nextCharges = { ...charges };
    nextCharges.fobValue = {
      ...(nextCharges.fobValue || {}),
      currency: "INR",
      exchangeRate: 1,
      amount: Number.isFinite(fobInINR) ? Number(fobInINR.toFixed(2)) : 0,
    };

    return nextCharges;
  };

  // Compute FOB in USD from FOB (which is in INR)
const computeFOBInUSD = (chargesObj) => {
  const fobRow = chargesObj?.fobValue || {};
  const fobAmountINR = Number(fobRow.amount || 0); // you already store FOB in INR
  if (!fobAmountINR || !invoiceExchangeRate) return 0;

  // invoiceExchangeRate is invoiceCurrency → INR
  // So 1 invoiceCurrency = invoiceExchangeRate INR
  // 1 INR = 1 / invoiceExchangeRate invoiceCurrency
  const fobInInvoiceCurrency = fobAmountINR / invoiceExchangeRate;

  // If invoiceCurrency is already USD, you're done
  if (invoiceCurrency === "USD") return fobInInvoiceCurrency;

  // Otherwise convert invoice currency → USD using rateMap (INR pivot)
  // invoiceCurrency → INR = invoiceExchangeRate
  // USD → INR = rateMap.USD
  const usdRateInINR = Number(rateMap["USD"] || 0);
  if (!usdRateInINR) return 0;

  const fobInUSD = fobAmountINR / usdRateInINR; // INR → USD
  return Number.isFinite(fobInUSD) ? Number(fobInUSD.toFixed(2)) : 0;
};

  const effectiveCharges = computeFOBCharges();

// Derive FOB in USD and store it as a separate field in Formik
const fobValueUSD = computeFOBInUSD(effectiveCharges);
useEffect(() => {
  formik.setFieldValue(
    "freightInsuranceCharges",
    {
      ...effectiveCharges,
      fobValueUSD, // new variable stored in Formik
    },
    false
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fobValueUSD]);

useEffect(() => {
  formik.setFieldValue("fobValueUSD", fobValueUSD, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [fobValueUSD]);


  const getRow = (key) => effectiveCharges[key] || {};

  const handleChange = (sectionKey, field, value) => {
    const next = {
      freight: { ...(effectiveCharges.freight || {}) },
      insurance: { ...(effectiveCharges.insurance || {}) },
      discount: { ...(effectiveCharges.discount || {}) },
      otherDeduction: { ...(effectiveCharges.otherDeduction || {}) },
      commission: { ...(effectiveCharges.commission || {}) },
      fobValue: { ...(effectiveCharges.fobValue || {}) },
      ...effectiveCharges,
    };

    const currentSection = { ...(next[sectionKey] || {}) };
    currentSection[field] = value;

    // if currency changed, auto-set exchangeRate from rateMap
    if (field === "currency") {
      const code = String(value || "").toUpperCase();
      const rate = rateMap[code];
      if (typeof rate === "number") {
        currentSection.exchangeRate = rate;
      }
    }

    next[sectionKey] = currentSection;

    formik.setFieldValue("freightInsuranceCharges", next);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 800);
  };

  return (
    <div style={styles.page}>
      <div style={styles.title}>Freight, Insurance & Other Charges</div>

      {invoiceCurrency && (
        <div style={{ ...styles.conversionInfo, marginBottom: 8 }}>
          Invoice Currency: {invoiceCurrency} (Rate:{" "}
          {invoiceExchangeRate.toFixed(2)} INR). Base values are the product /
          invoice value converted to each row&apos;s currency, and FOB is
          calculated in INR as (Invoice Value − Total Amount in invoice
          currency) × {invoiceExchangeRate.toFixed(2)}.
        </div>
      )}

      <div style={styles.table}>
        <div style={styles.headerRow}>
          <div />
          <div>Currency</div>
          <div>Exchange Rate</div>
          <div>Rate %</div>
          <div>Base Value</div>
          <div>Amount</div>
        </div>

        {rowDefs.map((row) => {
          const data = getRow(row.key);
          const isFOB = row.isFOB;
          const disabled = isRowDisabled(row.key);

          const effectiveCurrency = (
            data.currency || (isFOB ? "INR" : invoiceCurrency)
          ).toUpperCase();

          const exchangeRate = (() => {
            if (isFOB) return 1;
            if (data.exchangeRate != null && data.exchangeRate !== "") {
              return Number(data.exchangeRate || 0);
            }
            const rate = rateMap[effectiveCurrency];
            if (typeof rate === "number") return rate;
            return 0;
          })();

          const baseValue = row.hasBase
            ? getBaseValue(row.key, { ...data, exchangeRate })
            : 0;

          const computedAmount = getAmount(row.key, data, baseValue);

          const showConversion =
            !isFOB &&
            effectiveCurrency !== invoiceCurrency &&
            row.hasBase &&
            baseValue > 0;

          return (
            <div key={row.key}>
              <div style={styles.row}>
                <div style={styles.labelCell}>{row.label}</div>

                <div>
                  <select
                    style={{
                      ...styles.select,
                      ...(disabled ? styles.disabled : {}),
                    }}
                    value={effectiveCurrency}
                    disabled={disabled || isFOB}
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

                <div>
                  <input
                    type="number"
                    style={{
                      ...styles.input,
                      ...(disabled || isFOB ? styles.readonly : {}),
                      ...(disabled ? styles.disabled : {}),
                    }}
                    value={exchangeRate}
                    readOnly={disabled || isFOB}
                    onChange={(e) =>
                      !disabled &&
                      !isFOB &&
                      handleChange(
                        row.key,
                        "exchangeRate",
                        parseFloat(e.target.value || 0)
                      )
                    }
                  />
                </div>

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

                <div>
                  <input
                    type="number"
                    style={{
                      ...styles.input,
                      ...(disabled ? styles.disabled : {}),
                    }}
                    value={
                      isFOB
                        ? data.amount ?? 0
                        : disabled
                        ? 0
                        : Number.isFinite(computedAmount)
                        ? computedAmount.toFixed(2)
                        : 0
                    }
                    disabled={!isFOB}
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

              {showConversion && (
                <div
                  style={{
                    ...styles.conversionInfo,
                    marginLeft: 130,
                    marginBottom: 4,
                  }}
                >
                  Base converted from {invoiceCurrency} ({invoiceExchangeRate.toFixed(
                    2
                  )} INR) → {effectiveCurrency} ({exchangeRate.toFixed(2)} INR).
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InvoiceFreightTab;
