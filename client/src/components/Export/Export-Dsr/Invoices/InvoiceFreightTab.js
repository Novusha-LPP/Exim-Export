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

  // Fetch currency rates for job_date
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const dateStr = getJobDateFormatted(formik.values.job_date);
        const res = await fetch(
          `${import.meta.env.VITE_API_STRING
          }/currency-rates/by-date/${dateStr}`
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
        console.error("Failed to load currency rates (freight tab)", e);
      }
    };
    fetchRates();
  }, [formik.values.job_date]);

  const autoSave = useCallback((values) => {
    // debounce-save hook if needed
  }, []);

  const charges = formik.values.freightInsuranceCharges || {};
  const invoice = formik.values.invoices?.[0] || {};
  const invoiceCurrency = (invoice.currency || "USD").toUpperCase();

  // Helper: get rate for a currency; INR defaults to 1 if missing in API
  const getRateForCurrency = (code) => {
    if (!code) return undefined;
    const upper = code.toUpperCase();
    if (upper === "INR") return 1;
    const r = rateMap[upper];
    return typeof r === "number" && r > 0 ? r : undefined;
  };

  const invoiceExchangeRate = (() => {
    // Prefer explicit exchange_rate, else fallback to rate map (INR defaults to 1), else 1
    if (
      formik.values.exchange_rate !== undefined &&
      formik.values.exchange_rate !== null &&
      formik.values.exchange_rate !== ""
    ) {
      return Number(formik.values.exchange_rate) || 1;
    }
    const rm = getRateForCurrency(invoiceCurrency);
    return rm || 1;
  })(); // invoiceCur → INR
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

  // amount helper
  // - For FOB row: always take explicit amount
  // - For other rows: if user entered amount, use it; otherwise compute = baseValue * rate / 100
  const getAmount = (rowKey, data, baseValue) => {
    if (rowKey === "fobValue") {
      return Number(data.amount || 0);
    }

    if (data.amount !== undefined && data.amount !== null && data.amount !== "") {
      return Number(data.amount || 0);
    }

    const rate = Number(data.rate || 0);
    return (Number(baseValue || 0) * rate) / 100;
  };

  // Compute FOB in INR from all other row amounts
  const computeFOBCharges = () => {
    const inv = formik.values.invoices?.[0] || {};
    // Use productValue, falling back to invoiceValue so FOB works even if only invoiceValue is filled
    const invoiceVal = Number(inv.productValue || inv.invoiceValue || 0); // in invoice currency
    if (!invoiceVal || !invoiceExchangeRate) return charges;

    let totalNonFOBInInvoice = 0;

    [
      "freight",
      "insurance",
      "discount",
      "otherDeduction",
      "commission",
    ].forEach((k) => {
      const row = charges[k] || {};

      // Recompute the non-FOB row amount the same way the UI does,
      // instead of relying on row.amount (which is not stored for non-FOB rows)
      const baseValue = getBaseValue(k, row);
      const rowAmount = getAmount(k, row, baseValue);
      if (!rowAmount) return;

      const rowRate = Number(row.exchangeRate || 0); // rowCur → INR
      const amountInInvoice = rowToInvoiceCurrency(rowAmount, rowRate);
      totalNonFOBInInvoice += amountInInvoice;
    });

    const fobInInvoice = invoiceVal - totalNonFOBInInvoice;
    const fobInINR = fobInInvoice * invoiceExchangeRate;

    const nextCharges = { ...charges };
    const existingFob = nextCharges.fobValue || {};
    const fobCurrency = (existingFob.currency || "INR").toUpperCase();

    // Determine exchange rate for FOB currency → INR
    const fallbackRate =
      fobCurrency === invoiceCurrency
        ? invoiceExchangeRate
        : getRateForCurrency(fobCurrency);

    const fobRate =
      existingFob.exchangeRate !== undefined &&
        existingFob.exchangeRate !== null &&
        existingFob.exchangeRate !== ""
        ? Number(existingFob.exchangeRate)
        : fallbackRate !== undefined && fallbackRate !== null
          ? Number(fallbackRate)
          : fobCurrency === "INR"
            ? 1
            : 0;

    // If no valid rate, default to invoiceExchangeRate as a last resort
    const effectiveFobRate =
      Number.isFinite(fobRate) && fobRate > 0 ? fobRate : invoiceExchangeRate;

    // Convert FOB value from INR into selected currency for UI display
    const fobAmountInSelected =
      effectiveFobRate > 0 ? fobInINR / effectiveFobRate : fobInINR;

    nextCharges.fobValue = {
      ...existingFob,
      currency: fobCurrency,
      exchangeRate: effectiveFobRate,
      amount: Number.isFinite(fobAmountInSelected)
        ? Number(fobAmountInSelected.toFixed(2))
        : 0,
      // keep INR reference for downstream calculations
      amountINR: Number.isFinite(fobInINR) ? Number(fobInINR.toFixed(2)) : 0,
    };

    return nextCharges;
  };

  // Compute FOB in USD from FOB (which is in INR)
  const computeFOBInUSD = (chargesObj) => {
    const fobRow = chargesObj?.fobValue || {};
    // Prefer stored INR reference; fall back to converting displayed amount using exchangeRate
    const fobAmountINR =
      Number(fobRow.amountINR || 0) ||
      (Number(fobRow.amount || 0) *
        Number(fobRow.exchangeRate || invoiceExchangeRate || 0));
    if (!fobAmountINR || !invoiceExchangeRate) return 0;

    // invoiceExchangeRate is invoiceCurrency → INR
    const fobInInvoiceCurrency = fobAmountINR / invoiceExchangeRate;

    // If invoiceCurrency is already USD, you're done
    if (invoiceCurrency === "USD") return fobInInvoiceCurrency;

    // Otherwise convert invoice currency → USD using rateMap (INR pivot)
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
      const rate = getRateForCurrency(code);
      if (typeof rate === "number") {
        currentSection.exchangeRate = rate;
      } else if (code === invoiceCurrency) {
        currentSection.exchangeRate = invoiceExchangeRate;
      } else if (code === "INR") {
        currentSection.exchangeRate = 1;
      } else {
        currentSection.exchangeRate = "";
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
            if (data.exchangeRate != null && data.exchangeRate !== "") {
              return Number(data.exchangeRate || 0);
            }
            const rate = getRateForCurrency(effectiveCurrency);
            if (typeof rate === "number") return rate;
            if (effectiveCurrency === invoiceCurrency) return invoiceExchangeRate;
            if (effectiveCurrency === "INR") return 1;
            return "";
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
                    onChange={(e) => {
                      if (disabled) return;
                      const raw = e.target.value;
                      const nextVal =
                        raw === "" ? "" : parseFloat(raw || "0");
                      handleChange(row.key, "exchangeRate", nextVal);
                    }}
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
                      value={
                        disabled
                          ? ""
                          : data.rate !== undefined &&
                            data.rate !== null &&
                            data.rate !== ""
                            ? data.rate
                            : ""
                      }
                      disabled={disabled}
                      onChange={(e) => {
                        if (disabled) return;
                        const raw = e.target.value;
                        const nextVal =
                          raw === "" ? "" : parseFloat(raw || "0");
                        handleChange(row.key, "rate", nextVal);
                      }}
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
                    value={(() => {
                      if (disabled) return "";
                      if (
                        data.amount !== undefined &&
                        data.amount !== null &&
                        data.amount !== ""
                      ) {
                        // For FOB row, always show 2 decimal places
                        if (isFOB && typeof data.amount === "number") {
                          return data.amount.toFixed(2);
                        }
                        return data.amount;
                      }
                      if (
                        Number.isFinite(computedAmount) &&
                        computedAmount !== 0
                      ) {
                        return computedAmount.toFixed(2);
                      }
                      return "";
                    })()}
                    disabled={disabled}
                    onChange={(e) =>
                      !disabled &&
                      handleChange(
                        row.key,
                        "amount",
                        e.target.value === ""
                          ? ""
                          : parseFloat(e.target.value || "0")
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
                  Base converted from {invoiceCurrency} (
                  {invoiceExchangeRate.toFixed(2)} INR) → {effectiveCurrency} (
                  {exchangeRate.toFixed(2)} INR).
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
