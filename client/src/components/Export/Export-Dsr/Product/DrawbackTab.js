import React, { useRef, useCallback, useState, useEffect } from "react";
import { styles, toUpperVal } from "./commonStyles";
import { calculateProductFobINR } from "../../../../utils/fobCalculations";

// Default drawback detail object
const getDefaultDrawback = (idx = 1) => ({
  serialNumber: String(idx),
  dbkitem: false,
  dbkSrNo: "",
  fobValue: "",
  quantity: 0,
  unit: "", // Added unit field
  dbkUnder: "Actual",
  dbkDescription: "",
  dbkRate: 1.5,
  dbkCap: 0,
  dbkCapunit: "",
  dbkAmount: 0,
  percentageOfFobValue: "1.5% of FOB Value",
});

function toUpper(val) {
  return (typeof val === "string" ? val : "").toUpperCase();
}

const DBK_LIMIT = 20;

const DrawbackTab = ({
  formik,
  selectedInvoiceIndex,
  selectedProductIndex,
}) => {
  const invoices = formik.values.invoices || [];
  const activeInvoice = invoices[selectedInvoiceIndex] || {};
  const products = activeInvoice.products || [];
  const product = products[selectedProductIndex] || {};
  const saveTimeoutRef = useRef(null);

  // DBK Search Dialog State
  const [dbkDialogOpen, setDbkDialogOpen] = useState(false);
  const [dbkDialogIndex, setDbkDialogIndex] = useState(null);
  const [dbkDialogQuery, setDbkDialogQuery] = useState("");
  const [dbkDialogOptions, setDbkDialogOptions] = useState([]);
  const [dbkDialogLoading, setDbkDialogLoading] = useState(false);
  const [dbkDialogActive, setDbkDialogActive] = useState(-1);
  const [dbkPage, setDbkPage] = useState(1);
  const [dbkTotalPages, setDbkTotalPages] = useState(1);

  // Ensure array exists
  const drawbackDetails = product.drawbackDetails || [getDefaultDrawback(1)];

  const autoSave = useCallback(() => formik.submitForm(), [formik]);

  const scheduleSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(autoSave, 1200);
  };

  const fetchDbkCodes = useCallback(async (search, page) => {
    try {
      setDbkDialogLoading(true);
      const params = new URLSearchParams();
      if (search && search.trim()) params.append("search", search.trim());
      params.append("page", page || 1);
      params.append("limit", DBK_LIMIT);

      const res = await fetch(
        `${import.meta.env.VITE_API_STRING}/getDrawback?${params.toString()}`
      );
      const data = await res.json();

      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      setDbkDialogOptions(list);
      if (data?.pagination) {
        setDbkTotalPages(data.pagination.totalPages || 1);
      } else {
        setDbkTotalPages(1);
      }
    } catch (e) {
      console.error("DBK dialog fetch error", e);
      setDbkDialogOptions([]);
      setDbkTotalPages(1);
    } finally {
      setDbkDialogLoading(false);
    }
  }, []);

  // Immediate fetch when page changes
  useEffect(() => {
    if (!dbkDialogOpen) return;
    fetchDbkCodes(dbkDialogQuery, dbkPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbkPage, dbkDialogOpen, fetchDbkCodes]);

  // Debounced fetch when query changes
  useEffect(() => {
    if (!dbkDialogOpen) return;
    const timer = setTimeout(() => {
      fetchDbkCodes(dbkDialogQuery, 1);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbkDialogQuery, dbkDialogOpen, fetchDbkCodes]);

  // Sync Quantity/Unit from Products & FOB Value from FreightInsuranceCharges
  useEffect(() => {
    const syncFobValues = () => {
      const invoiceExchangeRate = Number(formik.values.exchange_rate) || 1;

      if (!product || !activeInvoice) return;

      const fobAmountInr = calculateProductFobINR(
        product,
        activeInvoice,
        invoiceExchangeRate
      );

      let hasChanges = false;
      const currentDbk = product.drawbackDetails || [];
      const updatedDbk = currentDbk.map((item) => {
        const pQty = product.quantity || 0;
        const pUnit = product.qtyUnit || "";

        const currentFob = parseFloat(item.fobValue) || 0;
        const rate = parseFloat(item.dbkRate) || 0;

        let newItem = { ...item };
        let changedLocal = false;

        if (
          String(item.quantity) !== String(pQty) ||
          String(item.unit) !== String(pUnit) ||
          String(item.dbkCapunit) !== String(pUnit)
        ) {
          newItem.quantity = pQty;
          newItem.unit = pUnit;
          newItem.dbkCapunit = pUnit;
          changedLocal = true;
        }

        if (Math.abs(currentFob - fobAmountInr) > 0.01) {
          newItem.fobValue = fobAmountInr.toFixed(2);
          newItem.dbkAmount = ((rate * fobAmountInr) / 100).toFixed(2);
          newItem.percentageOfFobValue = `${rate}% of FOB Value`;
          changedLocal = true;
        }

        if (changedLocal) {
          hasChanges = true;
          return newItem;
        }
        return item;
      });

      if (hasChanges) {
        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
          const updatedProducts = [
            ...(updatedInvoices[selectedInvoiceIndex].products || []),
          ];
          updatedProducts[selectedProductIndex] = {
            ...updatedProducts[selectedProductIndex],
            drawbackDetails: updatedDbk,
          };
          updatedInvoices[selectedInvoiceIndex] = {
            ...updatedInvoices[selectedInvoiceIndex],
            products: updatedProducts,
          };
          formik.setFieldValue("invoices", updatedInvoices);
        }
      }
    };

    syncFobValues();
  }, [
    product?.quantity,
    product?.qtyUnit,
    product?.amount,
    activeInvoice?.productValue,
    activeInvoice?.invoiceValue,
    activeInvoice?.currency,
    activeInvoice?.freightInsuranceCharges,
    formik.values.job_date,
    formik.values.exchange_rate,
    selectedInvoiceIndex,
    selectedProductIndex,
  ]);

  const populateDbkRow = async (rowIndex, item) => {
    const currentDbk = [...(product.drawbackDetails || [])];
    if (!currentDbk[rowIndex])
      currentDbk[rowIndex] = getDefaultDrawback(rowIndex + 1);

    currentDbk[rowIndex].dbkSrNo = item.tariff_item || "";
    currentDbk[rowIndex].dbkDescription = item.description_of_goods || "";

    let rateVal = 0;
    if (item.drawback_rate) {
      const match = item.drawback_rate.match(/([\d.]+)%/);
      rateVal = match ? parseFloat(match[1]) : parseFloat(item.drawback_rate);
    }
    currentDbk[rowIndex].dbkRate = isNaN(rateVal) ? 0 : rateVal;
    currentDbk[rowIndex].dbkCap = item.drawback_cap || 0;

    currentDbk[rowIndex].quantity = product.quantity || 0;
    currentDbk[rowIndex].unit = product.qtyUnit || "";
    currentDbk[rowIndex].dbkCapunit = product.qtyUnit || "";

    const invoiceCurrency = activeInvoice?.currency;
    let productAmount = parseFloat(product.amount || 0);
    let fobInr = 0;

    if (
      productAmount > 0 &&
      invoiceCurrency &&
      invoiceCurrency.toUpperCase() !== "INR"
    ) {
      try {
        const dateStr = getJobDateFormatted(formik.values.job_date);
        const res = await fetch(
          `${import.meta.env.VITE_API_STRING}/currency-rates/by-date/${dateStr}`
        );
        const json = await res.json();

        if (json?.success && json?.data?.exchange_rates) {
          const currencyRate = json.data.exchange_rates.find(
            (r) =>
              r.currency_code?.toUpperCase() === invoiceCurrency.toUpperCase()
          );
          if (currencyRate && typeof currencyRate.export_rate === "number") {
            fobInr = productAmount * currencyRate.export_rate;
          } else {
            fobInr = productAmount;
          }
        } else {
          fobInr = productAmount;
        }
      } catch (error) {
        console.error("Error fetching currency rates:", error);
        fobInr = productAmount;
      }
    } else {
      fobInr = productAmount;
    }

    currentDbk[rowIndex].fobValue = fobInr;

    // Calculate Amount
    currentDbk[rowIndex].dbkAmount = (
      (currentDbk[rowIndex].dbkRate * fobInr) /
      100
    ).toFixed(2);
    currentDbk[
      rowIndex
    ].percentageOfFobValue = `${currentDbk[rowIndex].dbkRate}% of FOB Value`;

    const updatedInvoices = [...invoices];
    if (updatedInvoices[selectedInvoiceIndex]) {
      const updatedProducts = [
        ...(updatedInvoices[selectedInvoiceIndex].products || []),
      ];
      updatedProducts[selectedProductIndex] = {
        ...updatedProducts[selectedProductIndex],
        drawbackDetails: currentDbk,
      };
      updatedInvoices[selectedInvoiceIndex] = {
        ...updatedInvoices[selectedInvoiceIndex],
        products: updatedProducts,
      };
      formik.setFieldValue("invoices", updatedInvoices);
      scheduleSave();
    }
  };

  const handleDrawbackFieldChange = (rowIndex, field, value) => {
    const currentDbk = [...(product.drawbackDetails || [])];
    if (!currentDbk[rowIndex])
      currentDbk[rowIndex] = getDefaultDrawback(rowIndex + 1);
    currentDbk[rowIndex][field] = value;

    if (field === "dbkRate" || field === "fobValue") {
      const rate =
        parseFloat(
          field === "dbkRate" ? value : currentDbk[rowIndex].dbkRate
        ) || 0;
      const fob =
        parseFloat(
          field === "fobValue" ? value : currentDbk[rowIndex].fobValue
        ) || 0;
      currentDbk[rowIndex].dbkAmount = ((rate * fob) / 100).toFixed(2);
      currentDbk[rowIndex].percentageOfFobValue = `${rate}% of FOB Value`;
    }

    const updatedInvoices = [...invoices];
    if (updatedInvoices[selectedInvoiceIndex]) {
      const updatedProducts = [
        ...(updatedInvoices[selectedInvoiceIndex].products || []),
      ];
      updatedProducts[selectedProductIndex] = {
        ...updatedProducts[selectedProductIndex],
        drawbackDetails: currentDbk,
      };
      updatedInvoices[selectedInvoiceIndex] = {
        ...updatedInvoices[selectedInvoiceIndex],
        products: updatedProducts,
      };
      formik.setFieldValue("invoices", updatedInvoices);
      scheduleSave();
    }
  };

  const fetchDrawbackDetails = async (rowIndex, dbkSrNo) => {
    if (!dbkSrNo) return;
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_API_STRING
        }/getDrawback?tariff_item=${encodeURIComponent(dbkSrNo)}`
      );
      const data = await res.json();

      if (data && data.success && data.data && data.data.length > 0) {
        const item = data.data[0];
        const currentDbk = [...(product.drawbackDetails || [])];
        if (!currentDbk[rowIndex])
          currentDbk[rowIndex] = getDefaultDrawback(rowIndex + 1);

        // Map API response to fields
        currentDbk[rowIndex].dbkDescription = item.description_of_goods || "";

        // Parse Rate (remove %)
        let rateVal = 0;
        if (item.drawback_rate) {
          const match = item.drawback_rate.match(/([\d.]+)%/);
          rateVal = match
            ? parseFloat(match[1])
            : parseFloat(item.drawback_rate);
        }
        currentDbk[rowIndex].dbkRate = isNaN(rateVal) ? 0 : rateVal;

        currentDbk[rowIndex].dbkCap = item.drawback_cap || 0;

        // Pull Quantity & Unit from ProductMainTab (corresponding index)
        currentDbk[rowIndex].quantity = product.quantity || 0;
        currentDbk[rowIndex].unit = product.qtyUnit || "";
        currentDbk[rowIndex].dbkCapunit = product.qtyUnit || "";

        // Pull FOB Value (INR) using standardized calculation
        const invoiceExchangeRate = Number(formik.values.exchange_rate) || 1;
        const fobInr = calculateProductFobINR(
          product,
          activeInvoice,
          invoiceExchangeRate
        );

        currentDbk[rowIndex].fobValue = fobInr.toFixed(2);

        // Calculate Amount
        currentDbk[rowIndex].dbkAmount = (
          (currentDbk[rowIndex].dbkRate * fobInr) /
          100
        ).toFixed(2);
        currentDbk[
          rowIndex
        ].percentageOfFobValue = `${currentDbk[rowIndex].dbkRate}% of FOB Value`;

        const updatedInvoices = [...invoices];
        if (updatedInvoices[selectedInvoiceIndex]) {
          const updatedProducts = [
            ...(updatedInvoices[selectedInvoiceIndex].products || []),
          ];
          updatedProducts[selectedProductIndex] = {
            ...updatedProducts[selectedProductIndex],
            drawbackDetails: currentDbk,
          };
          updatedInvoices[selectedInvoiceIndex] = {
            ...updatedInvoices[selectedInvoiceIndex],
            products: updatedProducts,
          };
          formik.setFieldValue("invoices", updatedInvoices);
          scheduleSave();
        }
      }
    } catch (error) {
      console.error("Error fetching drawback details:", error);
    }
  };

  const addDrawbackDetail = () => {
    const currentDbk = [...(product.drawbackDetails || [])];
    currentDbk.push(getDefaultDrawback(currentDbk.length + 1));
    const updatedInvoices = [...invoices];
    if (updatedInvoices[selectedInvoiceIndex]) {
      const updatedProducts = [
        ...(updatedInvoices[selectedInvoiceIndex].products || []),
      ];
      updatedProducts[selectedProductIndex].drawbackDetails = currentDbk;
      updatedInvoices[selectedInvoiceIndex].products = updatedProducts;
      formik.setFieldValue("invoices", updatedInvoices);
    }
  };

  const deleteDrawbackDetail = (rowIndex) => {
    const currentDbk = [...(product.drawbackDetails || [])];
    if (currentDbk.length > 1) {
      currentDbk.splice(rowIndex, 1);
      const updatedInvoices = [...invoices];
      if (updatedInvoices[selectedInvoiceIndex]) {
        const updatedProducts = [
          ...(updatedInvoices[selectedInvoiceIndex].products || []),
        ];
        updatedProducts[selectedProductIndex].drawbackDetails = currentDbk;
        updatedInvoices[selectedInvoiceIndex].products = updatedProducts;
        formik.setFieldValue("invoices", updatedInvoices);
      }
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        DRAWBACK (DBK) DETAILS
        <span style={styles.chip}>DBK SCHEME</span>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>#</th>
              <th style={styles.th}>DBK Sr. No</th>
              <th style={styles.th}>FOB Value (INR)</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Unit</th>
              <th style={styles.th}>DBK Under</th>
              <th style={{ ...styles.th, minWidth: 200 }}>Description</th>
              <th style={styles.th}>Rate (%)</th>
              <th style={styles.th}>Cap</th>
              <th style={styles.th}>Cap Unit</th>
              <th style={styles.th}>Amount</th>
              <th style={{ ...styles.th, width: 50, textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {drawbackDetails.map((item, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{idx + 1}</td>

                <td style={styles.td}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      value={item.dbkSrNo || ""}
                      onChange={(e) =>
                        handleDrawbackFieldChange(
                          idx,
                          "dbkSrNo",
                          e.target.value
                        )
                      }
                      onBlur={(e) => fetchDrawbackDetails(idx, e.target.value)}
                      placeholder="SR NO"
                      title="Type DBK Sr No or Search"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDbkDialogIndex(idx);
                        setDbkDialogQuery("");
                        setDbkDialogOptions([]);
                        setDbkDialogActive(-1);
                        setDbkPage(1);
                        setDbkDialogOpen(true);
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
                      title="Search Drawback Code"
                    >
                      🔍
                    </button>
                  </div>
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="number"
                    value={item.fobValue || ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(idx, "fobValue", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="number"
                    value={item.quantity ?? ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(idx, "quantity", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={{
                      ...styles.input,
                      backgroundColor: "#e9ecef",
                      color: "#495057",
                    }}
                    value={item.unit || ""}
                    disabled
                  />
                </td>
                <td style={styles.td}>
                  <select
                    style={styles.select}
                    value={item.dbkUnder || "Actual"}
                    onChange={(e) =>
                      handleDrawbackFieldChange(idx, "dbkUnder", e.target.value)
                    }
                  >
                    <option value="Actual">ACTUAL</option>
                    <option value="Provisional">PROVISIONAL</option>
                  </select>
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    value={item.dbkDescription || ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(
                        idx,
                        "dbkDescription",
                        e.target.value
                      )
                    }
                    placeholder="DESCRIPTION"
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="number"
                    value={item.dbkRate ?? ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(idx, "dbkRate", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    value={item.dbkCap ?? ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(idx, "dbkCap", e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={{
                      ...styles.input,
                      backgroundColor: "#e9ecef",
                      color: "#495057",
                    }}
                    value={item.dbkCapunit ?? ""}
                    disabled
                    onChange={(e) =>
                      handleDrawbackFieldChange(
                        idx,
                        "dbkCapunit",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    type="number"
                    value={item.dbkAmount ?? ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(
                        idx,
                        "dbkAmount",
                        e.target.value
                      )
                    }
                  />
                </td>

                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => deleteDrawbackDetail(idx)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#e53e3e",
                      cursor:
                        drawbackDetails.length <= 1 ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" style={styles.addBtn} onClick={addDrawbackDetail}>
        <span>＋</span>
        <span>Add Drawback Entry</span>
      </button>

      {/* DBK Search Dialog */}
      {dbkDialogOpen && (
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
            setDbkDialogOpen(false);
            setDbkDialogIndex(null);
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 6,
              padding: 12,
              width: 600,
              maxHeight: 500,
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
                Search Drawback Item
              </div>
              <button
                type="button"
                onClick={() => {
                  setDbkDialogOpen(false);
                  setDbkDialogIndex(null);
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
                placeholder="Type DBK Sr No or Description"
                value={dbkDialogQuery}
                onChange={(e) => {
                  const v = toUpper(e.target.value);
                  setDbkDialogQuery(v);
                  setDbkDialogActive(-1);
                  setDbkPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    fetchDbkCodes(dbkDialogQuery, 1);
                    setDbkPage(1);
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
              {dbkDialogLoading && (
                <div style={{ padding: 8, color: "#6b7280" }}>Loading...</div>
              )}

              {!dbkDialogLoading &&
                dbkDialogOptions.length === 0 &&
                dbkDialogQuery.trim().length >= 2 && (
                  <div style={{ padding: 8, color: "#9ca3af" }}>No results</div>
                )}

              {!dbkDialogLoading &&
                dbkDialogOptions.map((opt, idx) => (
                  <div
                    key={`${opt.tariff_item}-${idx}`}
                    onClick={() => {
                      if (dbkDialogIndex == null) return;
                      populateDbkRow(dbkDialogIndex, opt);
                      setDbkDialogOpen(false);
                      setDbkDialogIndex(null);
                    }}
                    onMouseEnter={() => setDbkDialogActive(idx)}
                    style={{
                      padding: 8,
                      cursor: "pointer",
                      backgroundColor:
                        dbkDialogActive === idx ? "#eff6ff" : "#ffffff",
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
                        {opt.tariff_item || "-"}
                      </div>
                      <div style={{ fontSize: 11, color: "#1d4ed8" }}>
                        Rate: {opt.drawback_rate || "-"} | Cap:{" "}
                        {opt.drawback_cap || "-"}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#4b5563",
                        marginTop: 2,
                      }}
                    >
                      {opt.description_of_goods || "-"}
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
                Page {dbkPage} of {dbkTotalPages || 1}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  style={{
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: "1px solid #d1d5db",
                    backgroundColor: dbkPage === 1 ? "#f9fafb" : "#ffffff",
                    cursor: dbkPage === 1 ? "not-allowed" : "pointer",
                    fontSize: 11,
                  }}
                  disabled={dbkPage === 1}
                  onClick={() => setDbkPage((p) => Math.max(1, p - 1))}
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
                      dbkPage >= dbkTotalPages ? "#f9fafb" : "#ffffff",
                    cursor:
                      dbkPage >= dbkTotalPages ? "not-allowed" : "pointer",
                    fontSize: 11,
                  }}
                  disabled={dbkPage >= dbkTotalPages}
                  onClick={() => setDbkPage((p) => p + 1)}
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

export default DrawbackTab;
