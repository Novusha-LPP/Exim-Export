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
  // ROSCTL fields
  slRate: 0,
  slCap: 0,
  ctlRate: 0,
  ctlCap: 0,
  rosctlAmount: 0,
  rosctlCategory: "", // "B" or "D"
  showRosctl: false,
});

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

          // Recalculate ROSCTL if applicable
          if (newItem.showRosctl) {
            calculateRosctlAmount(newItem);
          }

          changedLocal = true;
        }

        if (changedLocal) {
          hasChanges = true;
          return newItem;
        }
        return item;
      });

      if (hasChanges) {
        saveUpdatedProducts(updatedDbk);
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

    // ROSCTL Update Logic
    const tariffItem = item.tariff_item || "";
    const prefix = tariffItem.substring(0, 2);

    if (["61", "62", "63"].includes(prefix)) {
      // Default logic: derive suffix from item or default to B
      // item.tariff_item might be "610101B"
      const match = tariffItem.match(/^(\d+)([A-Z])$/);
      let base = tariffItem;
      let suffix = "B";
      if (match) {
        base = match[1];
        suffix = match[2];
      }

      // If user already had a rosctlCategory, maybe preserve it?
      // But since this is a NEW selection, we should probably reset to the item's suffix
      // OR default to B if item has no suffix.
      // Wait, the item selected from DBK search (DrawbackModel) usually has suffix.
      // If it's a new item, let's use its suffix as category.
      const category = suffix;
      const searchItem = `${base}${category}`;

      try {
        const rosRes = await fetch(
          `${import.meta.env.VITE_API_STRING
          }/getRosctl_R?tariff_item=${encodeURIComponent(searchItem)}`
        );
        const rosJson = await rosRes.json();
        if (rosJson.success && rosJson.data && rosJson.data.length > 0) {
          const slEntry = rosJson.data.find(
            (d) => d.schedule_category === "SL"
          );
          const ctlEntry = rosJson.data.find(
            (d) => d.schedule_category === "CTL"
          );

          currentDbk[rowIndex].showRosctl = true;
          currentDbk[rowIndex].rosctlCategory = category;
          currentDbk[rowIndex].slRate = slEntry ? slEntry.rate : 0;
          currentDbk[rowIndex].slCap = slEntry ? slEntry.cap_per_unit : 0;
          currentDbk[rowIndex].ctlRate = ctlEntry ? ctlEntry.rate : 0;
          currentDbk[rowIndex].ctlCap = ctlEntry ? ctlEntry.cap_per_unit : 0;

          // Calculate ROSCTL Amount inline
          const qty = parseFloat(currentDbk[rowIndex].quantity || 0);

          let finalSl = (currentDbk[rowIndex].slRate * fobInr) / 100;
          const sCap = parseFloat(currentDbk[rowIndex].slCap || 0);
          if (sCap > 0) {
            const sCapTotal = sCap * qty;
            if (finalSl > sCapTotal) finalSl = sCapTotal;
          }

          let finalCtl = (currentDbk[rowIndex].ctlRate * fobInr) / 100;
          const cCap = parseFloat(currentDbk[rowIndex].ctlCap || 0);
          if (cCap > 0) {
            const cCapTotal = cCap * qty;
            if (finalCtl > cCapTotal) finalCtl = cCapTotal;
          }
          currentDbk[rowIndex].rosctlAmount = (finalSl + finalCtl).toFixed(2);
        } else {
          // Reset ROSCTL values but keep show=true so they can toggle if needed?
          // Or better to hide if not found?
          // If prefix matches 61/62/63, we should probably show it even if rates 0
          currentDbk[rowIndex].showRosctl = true;
          currentDbk[rowIndex].rosctlCategory = category;
          currentDbk[rowIndex].slRate = 0;
          currentDbk[rowIndex].slCap = 0;
          currentDbk[rowIndex].ctlRate = 0;
          currentDbk[rowIndex].ctlCap = 0;
          currentDbk[rowIndex].rosctlAmount = 0;
        }
      } catch (err) {
        console.error("Error fetching ROSCTL in populate", err);
      }
    } else {
      // Hide ROSCTL
      currentDbk[rowIndex].showRosctl = false;
      currentDbk[rowIndex].rosctlCategory = "";
      currentDbk[rowIndex].slRate = 0;
      currentDbk[rowIndex].slCap = 0;
      currentDbk[rowIndex].ctlRate = 0;
      currentDbk[rowIndex].ctlCap = 0;
      currentDbk[rowIndex].rosctlAmount = 0;
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
      saveUpdatedProducts(currentDbk);
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
      saveUpdatedProducts(currentDbk);
    }
  };

  const fetchDrawbackDetails = async (rowIndex, dbkSrNo) => {
    if (!dbkSrNo) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_STRING
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

        saveUpdatedProducts(currentDbk);
      }
    } catch (error) {
      console.error("Error fetching drawback details:", error);
    }
  };

  const fetchRosctlDetails = async (
    rowIndex,
    tariffItem,
    overrideCategory = null
  ) => {
    if (!tariffItem) return;
    // Check condition: starts with 61, 62, 63
    const prefix = tariffItem.substring(0, 2);
    if (!["61", "62", "63"].includes(prefix)) {
      // Reset ROSCTL
      updateRosctlState(rowIndex, false);
      return;
    }

    // Determine Base and Suffix
    const match = tariffItem.match(/^(\d+)([A-Z])$/);
    let base = tariffItem;
    let suffix = "B"; // Default

    if (match) {
      base = match[1];
      suffix = match[2];
    }

    // User selected category overrides the item suffix for ROSCTL lookup
    const searchSuffix = overrideCategory || suffix;

    // Check validation: only B or D allowed for ROSCTL
    if (searchSuffix !== "B" && searchSuffix !== "D") {
      // Fallback or keep as is?
      // For now, if user passes A, maybe we map to D?
      // But let's assume UI only gives B or D options.
    }

    const searchItem = `${base}${searchSuffix}`;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_STRING
        }/getRosctl_R?tariff_item=${encodeURIComponent(searchItem)}`
      );
      const json = await res.json();

      if (json.success && json.data && json.data.length > 0) {
        const currentDbk = [...(product.drawbackDetails || [])];
        if (!currentDbk[rowIndex])
          currentDbk[rowIndex] = getDefaultDrawback(rowIndex + 1);

        const slEntry = json.data.find((d) => d.schedule_category === "SL");
        const ctlEntry = json.data.find((d) => d.schedule_category === "CTL");

        currentDbk[rowIndex].showRosctl = true;
        currentDbk[rowIndex].rosctlCategory = searchSuffix;
        currentDbk[rowIndex].dbkSrNo = searchItem; // Correct dbkSrNo suffix

        currentDbk[rowIndex].slRate = slEntry ? slEntry.rate : 0;
        currentDbk[rowIndex].slCap = slEntry ? slEntry.cap_per_unit : 0;
        currentDbk[rowIndex].ctlRate = ctlEntry ? ctlEntry.rate : 0;
        currentDbk[rowIndex].ctlCap = ctlEntry ? ctlEntry.cap_per_unit : 0;

        // Calculate Amount
        calculateRosctlAmount(currentDbk[rowIndex]);

        saveUpdatedProducts(currentDbk);
      } else {
        // Not found, but maintain state to allow toggling back
        const currentDbk = [...(product.drawbackDetails || [])];
        if (currentDbk[rowIndex]) {
          currentDbk[rowIndex].showRosctl = true;
          currentDbk[rowIndex].rosctlCategory = searchSuffix;
          currentDbk[rowIndex].dbkSrNo = searchItem; // Correct dbkSrNo suffix
          currentDbk[rowIndex].slRate = 0;
          currentDbk[rowIndex].slCap = 0;
          currentDbk[rowIndex].ctlRate = 0;
          currentDbk[rowIndex].ctlCap = 0;
          currentDbk[rowIndex].rosctlAmount = 0;
          saveUpdatedProducts(currentDbk);
        }
      }
    } catch (e) {
      console.error("Error fetching ROSCTL:", e);
    }
  };

  const updateRosctlState = (rowIndex, show) => {
    const currentDbk = [...(product.drawbackDetails || [])];
    if (currentDbk[rowIndex]) {
      currentDbk[rowIndex].showRosctl = show;
      if (!show) {
        currentDbk[rowIndex].slRate = 0;
        currentDbk[rowIndex].slCap = 0;
        currentDbk[rowIndex].ctlRate = 0;
        currentDbk[rowIndex].ctlCap = 0;
        currentDbk[rowIndex].rosctlAmount = 0;
      }
      saveUpdatedProducts(currentDbk);
    }
  };

  const calculateRosctlAmount = (item) => {
    const fob = parseFloat(item.fobValue || 0);
    const qty = parseFloat(item.quantity || 0);

    let finalSl = (parseFloat(item.slRate || 0) * fob) / 100;
    const sCap = parseFloat(item.slCap || 0);

    if (sCap > 0) {
      const capTotal = sCap * qty;
      if (finalSl > capTotal) finalSl = capTotal;
    }

    let finalCtl = (parseFloat(item.ctlRate || 0) * fob) / 100;
    const cCap = parseFloat(item.ctlCap || 0);
    if (cCap > 0) {
      const capTotal = cCap * qty;
      if (finalCtl > capTotal) finalCtl = capTotal;
    }

    item.rosctlAmount = (finalSl + finalCtl).toFixed(2);
  };

  const saveUpdatedProducts = (newDbkDetails) => {
    const updatedInvoices = [...invoices];
    if (updatedInvoices[selectedInvoiceIndex]) {
      const updatedProducts = [
        ...(updatedInvoices[selectedInvoiceIndex].products || []),
      ];

      // Calculate aggregated ROSCTL info for the product level
      const totalRosctlAmount = newDbkDetails.reduce(
        (sum, item) => sum + (parseFloat(item.rosctlAmount) || 0),
        0
      );

      const hasRosctl = newDbkDetails.some((item) => item.showRosctl);
      const firstRosctl = newDbkDetails.find((item) => item.showRosctl) || {};

      updatedProducts[selectedProductIndex] = {
        ...updatedProducts[selectedProductIndex],
        drawbackDetails: newDbkDetails,
        rosctlInfo: {
          ...updatedProducts[selectedProductIndex].rosctlInfo,
          claim: hasRosctl ? "Yes" : "No",
          amountINR: totalRosctlAmount.toFixed(2),
          slRate: String(firstRosctl.slRate || "0"),
          slCap: String(firstRosctl.slCap || "0"),
          ctlRate: String(firstRosctl.ctlRate || "0"),
          ctlCap: String(firstRosctl.ctlCap || "0"),
          category: firstRosctl.rosctlCategory || "",
        },
      };

      updatedInvoices[selectedInvoiceIndex] = {
        ...updatedInvoices[selectedInvoiceIndex],
        products: updatedProducts,
      };
      formik.setFieldValue("invoices", updatedInvoices);
    }
  };


  const handleDbkSrNoBlur = (rowIndex, val) => {
    fetchDrawbackDetails(rowIndex, val);
    fetchRosctlDetails(rowIndex, val);
  };

  const handleRosctlCategoryChange = (rowIndex, newCategory) => {
    const currentDbk = product.drawbackDetails || [];
    const item = currentDbk[rowIndex];
    if (item && item.dbkSrNo) {
      fetchRosctlDetails(rowIndex, item.dbkSrNo, newCategory);
    }
  };

  const addDrawbackDetail = () => {
    const currentDbk = [...(product.drawbackDetails || [])];
    currentDbk.push(getDefaultDrawback(currentDbk.length + 1));
    saveUpdatedProducts(currentDbk);
  };

  const deleteDrawbackDetail = (rowIndex) => {
    const currentDbk = [...(product.drawbackDetails || [])];
    if (currentDbk.length > 1) {
      currentDbk.splice(rowIndex, 1);
      saveUpdatedProducts(currentDbk);
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
              <React.Fragment key={idx}>
                <tr>
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
                        title="Type DBK Sr No or Search"
                        onBlur={(e) => handleDbkSrNoBlur(idx, e.target.value)}
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
                        handleDrawbackFieldChange(
                          idx,
                          "fobValue",
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      type="number"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        handleDrawbackFieldChange(
                          idx,
                          "quantity",
                          e.target.value
                        )
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
                        handleDrawbackFieldChange(
                          idx,
                          "dbkUnder",
                          e.target.value
                        )
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
                    <div
                      style={{
                        fontSize: 9,
                        color: "#666",
                        textAlign: "right",
                        marginTop: 2,
                      }}
                    >
                      {(item.dbkDescription || "").length}/120
                    </div>
                  </td>
                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      type="number"
                      value={item.dbkRate ?? ""}
                      onChange={(e) =>
                        handleDrawbackFieldChange(
                          idx,
                          "dbkRate",
                          e.target.value
                        )
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
                          drawbackDetails.length <= 1
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                {item.showRosctl && (
                  <tr key={`${idx}-rosctl`}>
                    <td
                      colSpan={12}
                      style={{ backgroundColor: "#f8fafc", padding: 10 }}
                    >
                      <div
                        style={{
                          border: "1px solid #3b82f6",
                          borderRadius: 4,
                          padding: 10,
                          backgroundColor: "#eff6ff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 20,
                            alignItems: "center",
                            flexWrap: "wrap",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <select
                              style={{
                                padding: 4,
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                                fontSize: 13,
                                fontWeight: "bold",
                              }}
                              value={item.rosctlCategory || "B"}
                              onChange={(e) =>
                                handleRosctlCategoryChange(idx, e.target.value)
                              }
                            >
                              <option value="B">Sch B (Sch 1/2)</option>
                              <option value="D">Sch D (Sch 3/4)</option>
                            </select>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <span>SL Rebate Rate</span>
                            <input
                              disabled
                              value={item.slRate || 0}
                              style={{
                                width: 60,
                                padding: 4,
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                              }}
                            />
                            <span>%</span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <span>Cap</span>
                            <input
                              disabled
                              value={item.slCap || 0}
                              style={{
                                width: 60,
                                padding: 4,
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                              }}
                            />
                            <span>/ {item.unit || "PCS"}</span>
                          </div>

                          <div style={{ flex: 1 }}></div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <span>CTL Rebate Rate</span>
                            <input
                              disabled
                              value={item.ctlRate || 0}
                              style={{
                                width: 60,
                                padding: 4,
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                              }}
                            />
                            <span>%</span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <span>Cap</span>
                            <input
                              disabled
                              value={item.ctlCap || 0}
                              style={{
                                width: 60,
                                padding: 4,
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                              }}
                            />
                            <span>/ {item.unit || "PCS"}</span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              marginLeft: 20,
                            }}
                          >
                            <span>ROSCTL Amount</span>
                            <input
                              disabled
                              value={item.rosctlAmount || 0}
                              style={{
                                width: 120,
                                padding: 4,
                                borderRadius: 4,
                                border: "1px solid #cbd5e1",
                                fontWeight: "bold",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {drawbackDetails.some((item) => item.showRosctl) && (
        <div
          style={{
            marginTop: 20,
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "10px 15px",
              borderBottom: "1px solid #cbd5e1",
              fontWeight: "bold",
              color: "#1e40af",
              fontSize: 14,
            }}
          >
            ROSCTL DETAILS
          </div>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: "#eff6ff" }}>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af", width: 60 }}>Row</th>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af" }}>Tariff Item</th>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af" }}>Category</th>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af" }}>SL Rate (%)</th>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af" }}>SL Cap</th>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af" }}>CTL Rate (%)</th>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af" }}>CTL Cap</th>
                  <th style={{ ...styles.th, backgroundColor: "#eff6ff", color: "#1e40af" }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                {drawbackDetails
                  .filter((item) => item.showRosctl)
                  .map((item, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}>
                        {drawbackDetails.indexOf(item) + 1}
                      </td>
                      <td style={styles.td}>{item.dbkSrNo}</td>
                      <td style={styles.td}>
                        {item.rosctlCategory === "B"
                          ? "Sch B (Sch 1/2)"
                          : "Sch D (Sch 3/4)"}
                      </td>
                      <td style={styles.td}>{item.slRate}</td>
                      <td style={styles.td}>{item.slCap}</td>
                      <td style={styles.td}>{item.ctlRate}</td>
                      <td style={styles.td}>{item.ctlCap}</td>
                      <td style={{ ...styles.td, fontWeight: "bold" }}>
                        {item.rosctlAmount}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


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
