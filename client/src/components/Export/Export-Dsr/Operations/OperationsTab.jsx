import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FileUpload from "../../../gallery/FileUpload";
import ImagePreview from "../../../gallery/ImagePreview";
import zIndex from "@mui/material/styles/zIndex";

// Helper
const toUpper = (str) => (str ? str.toUpperCase() : "");

const formatDateForInput = (dateVal, type = "date") => {
  if (!dateVal) return "";

  // If it's a string and doesn't look like a full ISO string from the server,
  // just return it as is to allow manual typing without auto-correction.
  if (
    typeof dateVal === "string" &&
    !dateVal.includes("T") &&
    !dateVal.includes("Z")
  ) {
    return dateVal;
  }

  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    if (type === "datetime-local") {
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    }
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateVal;
  }
};

const formatDateForPicker = (dateVal, type = "date") => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (type === "datetime-local") {
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return `${year}-${month}-${day}`;
  } catch (e) {
    return dateVal;
  }
};

const getDefaultItem = (section) => {
  const defaults = {
    transporterDetails: {
      transporterName: "",
      vehicleNo: "",
      containerNo: "",
      driverName: "",
      contactNo: "",
      noOfPackages: 0,
      netWeightKgs: 0,
      grossWeightKgs: 0,
      images: [],
      cartingDate: "",
      gateInDate: "",
    },
    containerDetails: {
      containerNo: "",
      containerSize: "",
      containerType: "",
      cargoType: "Gen",
      maxGrossWeightKgs: 0,
      tareWeightKgs: 0,
      maxPayloadKgs: 0,
      images: [],
    },
    bookingDetails: {
      shippingLineName: "",
      forwarderName: "",
      bookingNo: "",
      bookingDate: "",
      vesselName: "",
      voyageNo: "",
      portOfLoading: "",
      handoverLocation: "",
      validity: "",
      images: [],
      containerPlacementDate: "",
      shippingLineSealNo: "",
    },
    weighmentDetails: {
      weighBridgeName: "",
      regNo: "",
      address: "",
      dateTime: "",
      vehicleNo: "",
      containerNo: "",
      size: "",
      grossWeight: 0,
      tareWeight: 0,
      netWeight: 0,
      images: [],
    },
    statusDetails: {
      rms: "RMS", // Default
      goodsRegistrationDate: "",
      leoDate: "",
      leoUpload: [],
      containerPlacementDate: "",
      stuffingDate: "",
      stuffingSheetUpload: [],
      stuffingPhotoUpload: [],
      eGatePassCopyDate: "",
      eGatePassUpload: [],
      icdPort: "",
      handoverForwardingNoteDate: "",
      handoverImageUpload: [],
      forwarderName: "",
      handoverConcorTharSanganaRailRoadDate: "",
      billingDocsSentDt: "",
      billingDocsSentUpload: [],
      billingDocsStatus: "Pending",
      railRoad: "",
      concorPrivate: "",
      privateTransporterName: "",
      hoToConsoleDate: "",
      hoToConsoleDate2: "",
      hoToConsoleName: "",
      railOutReachedDate: "",
    },
  };
  return defaults[section] || {};
};

function useShippingOrAirlineDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(
    (formik.values[fieldName.split(".")[0]] &&
      getNestedValue(formik.values, fieldName)) ||
      ""
  );
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();
  const menuRef = useRef(); // New ref for the portal menu
  const keepOpen = useRef(false);
  const apiBase = import.meta.env.VITE_API_STRING;

  const transportMode = toUpper(formik.values.transportMode || "");

  // Helper to get nested value "operations.0.bookingDetails.0.shippingLineName"
  function getNestedValue(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }

  // React to external changes (e.g. from saved data)
  const fieldValue = getNestedValue(formik.values, fieldName);
  useEffect(() => {
    setQuery(fieldValue || "");
  }, [fieldValue]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }
    const searchVal = (query || "").trim();
    const isAir = transportMode === "AIR";

    const url = isAir
      ? `${apiBase}/airlines/?page=1&status=&search=${encodeURIComponent(
          searchVal
        )}`
      : `${apiBase}/shippingLines/?page=1&location=&status=&search=${encodeURIComponent(
          searchVal
        )}`;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : []
        );
      } catch {
        setOpts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, transportMode, apiBase]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    const item = opts[i];
    if (!item) return;

    const isAir = transportMode === "AIR";

    const code = isAir
      ? item.alphanumericCode || item.code || ""
      : item.shippingLineCode || item.code || "";
    const name = isAir
      ? item.airlineName || item.name || ""
      : item.shippingName || item.name || "";

    const value = `${toUpper(code)} - ${toUpper(name)}`.trim();
    setQuery(value);
    formik.setFieldValue(fieldName, value);
    setOpen(false);
    setActive(-1);
  }

  return {
    wrapperRef,
    menuRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      const v = val.toUpperCase();
      setQuery(v);
      formik.setFieldValue(fieldName, v);
      setOpen(true);
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 150);
    },
  };
}

function ShippingLineDropdownField({ fieldName, formik, placeholder = "" }) {
  const d = useShippingOrAirlineDropdown(fieldName, formik);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const transportMode = toUpper(formik.values.transportMode || "");
  const isAir = transportMode === "AIR";

  const updateCoords = () => {
    if (d.wrapperRef.current) {
      const rect = d.wrapperRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (d.open) {
      updateCoords();
      // Listen to scroll events in the entire app to keep dropdown attached
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [d.open]);

  const filteredOpts = d.opts.filter((opt) => {
    const code = isAir
      ? opt.alphanumericCode || opt.code || ""
      : opt.shippingLineCode || opt.code || "";
    const name = isAir
      ? opt.airlineName || opt.name || ""
      : opt.shippingName || opt.name || "";
    const haystack = `${code} ${name}`.toUpperCase();
    const needle = (d.query || "").toUpperCase();
    return !needle || haystack.includes(needle);
  });

  const indexInOpts = (filteredIndex) => {
    const target = filteredOpts[filteredIndex];
    if (!target) return -1;
    return d.opts.findIndex((o) => o === target);
  };

  return (
    <div style={styles.field} ref={d.wrapperRef}>
      <div style={styles.acWrap}>
        <input
          style={styles.input}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filteredOpts.length - 1, a < 0 ? 0 : a + 1)
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              const originalIndex = indexInOpts(d.active);
              if (originalIndex >= 0) d.select(originalIndex);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span style={styles.acIcon}>▼</span>

        {/* Use Portal to show menu outside table/row clipping */}
        {d.open &&
          filteredOpts.length > 0 &&
          createPortal(
            <div
              ref={d.menuRef}
              style={{
                ...styles.acMenu,
                position: "fixed",
                top: coords.top + 4,
                left: coords.left,
                width: coords.width,
              }}
            >
              {filteredOpts.map((opt, i) => {
                const code = isAir
                  ? toUpper(opt.alphanumericCode || opt.code || "")
                  : toUpper(opt.shippingLineCode || opt.code || "");
                const name = isAir
                  ? toUpper(opt.airlineName || opt.name || "")
                  : toUpper(opt.shippingName || opt.name || "");
                const originalIndex = indexInOpts(i);
                return (
                  <div
                    key={opt._id || code || name || i}
                    style={styles.acItem(d.active === i)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur before selection
                      if (originalIndex >= 0) d.select(originalIndex);
                    }}
                    onMouseEnter={() => d.setActive(i)}
                  >
                    {code} - {name}
                    {opt.status && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: "#8ad",
                          fontWeight: 500,
                        }}
                      >
                        ({toUpper(opt.status)})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}

// Hook for Gateway Port Dropdown
function useGatewayPortDropdown(fieldName, formik) {
  const [open, setOpen] = useState(false);

  // Helper to get nested value
  const getNestedValue = (obj, path) =>
    path.split(".").reduce((acc, part) => acc && acc[part], obj);

  const [query, setQuery] = useState(
    getNestedValue(formik.values, fieldName) || ""
  );
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const apiBase = import.meta.env.VITE_API_STRING;
  const keepOpen = useRef(false);

  const fieldValue = getNestedValue(formik.values, fieldName);

  useEffect(() => {
    setQuery(fieldValue || "");
  }, [fieldValue]);

  useEffect(() => {
    if (!open) {
      setOpts([]);
      return;
    }

    // When dropdown opens, fetch all options (empty search)
    // Only use query for search if user is actively typing
    const searchVal = isTyping ? (query || "").trim() : "";
    const url = `${apiBase}/gateway-ports/?page=1&status=&type=&search=${encodeURIComponent(
      searchVal
    )}`;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        setOpts(
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : []
        );
      } catch {
        setOpts([]);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [open, query, apiBase, isTyping]);

  useEffect(() => {
    function close(e) {
      if (
        !keepOpen.current &&
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
        setIsTyping(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function select(i) {
    const item = opts[i];
    if (!item) return;

    const value = `${(item.unece_code || "").toUpperCase()} - ${(
      item.name || ""
    ).toUpperCase()}`.trim();
    setQuery(value);
    formik.setFieldValue(fieldName, value);
    setOpen(false);
    setActive(-1);
    setIsTyping(false);
  }

  return {
    wrapperRef,
    open,
    setOpen,
    query,
    setQuery,
    opts,
    active,
    setActive,
    handle: (val) => {
      const v = val.toUpperCase();
      setQuery(v);
      formik.setFieldValue(fieldName, v);
      setOpen(true);
      setIsTyping(true);
    },
    select,
    onInputFocus: () => {
      setOpen(true);
      setActive(-1);
      keepOpen.current = true;
    },
    onInputBlur: () => {
      setTimeout(() => {
        keepOpen.current = false;
      }, 100);
    },
  };
}

// GatewayPortDropdown with inline styles
function GatewayPortDropdown({
  fieldName,
  formik,
  placeholder = "ENTER GATEWAY PORT",
}) {
  const d = useGatewayPortDropdown(fieldName, formik);

  const filtered = d.opts.filter((p) => {
    const code = p.unece_code || "";
    const name = p.name || "";
    const haystack = `${code} ${name}`.toUpperCase();
    const needle = (d.query || "").toUpperCase();
    return !needle || haystack.includes(needle);
  });

  return (
    <div style={{ position: "relative", width: "100%" }} ref={d.wrapperRef}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <input
          style={{
            width: "100%",
            minHeight: "36px",
            border: "1px solid transparent",
            padding: "6px 10px",
            paddingRight: "28px",
            fontSize: "12px",
            fontWeight: "500",
            color: "#1e293b",
            outline: "none",
            background: "transparent",
            boxSizing: "border-box",
            transition: "all 0.15s ease",
          }}
          placeholder={placeholder}
          autoComplete="off"
          value={toUpper(d.query)}
          onChange={(e) => d.handle(e.target.value)}
          onFocus={d.onInputFocus}
          onBlur={d.onInputBlur}
          onKeyDown={(e) => {
            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1)
              );
            else if (e.key === "ArrowUp")
              d.setActive((a) => Math.max(0, a - 1));
            else if (e.key === "Enter" && d.active >= 0) {
              e.preventDefault();
              d.select(d.active);
            } else if (e.key === "Escape") d.setOpen(false);
          }}
        />
        <span
          style={{
            position: "absolute",
            right: "10px",
            fontSize: "10px",
            pointerEvents: "none",
            color: "#64748b",
          }}
        >
          ▼
        </span>
        {d.open && filtered.length > 0 && (
          <div
            style={{
              position: "fixed",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              marginTop: "4px",
              maxHeight: "200px",
              overflowY: "auto",
              overflowX: "visible",
              zIndex: 100000000,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              width: d.wrapperRef.current
                ? d.wrapperRef.current.getBoundingClientRect().width
                : "auto",
              top: d.wrapperRef.current
                ? d.wrapperRef.current.getBoundingClientRect().bottom + 5
                : 0,
              left: d.wrapperRef.current
                ? d.wrapperRef.current.getBoundingClientRect().left
                : 0,
            }}
          >
            {filtered.map((port, i) => (
              <div
                key={port._id || port.unece_code || port.name || i}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: d.active === i ? "#1e293b" : "#475569",
                  background: d.active === i ? "#f1f5f9" : "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                  transition: "all 0.1s ease",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  d.select(i);
                }}
                onMouseEnter={() => d.setActive(i)}
              >
                {(port.unece_code || "").toUpperCase()} -{" "}
                {(port.name || "").toUpperCase()}
                {port.port_type && (
                  <span
                    style={{ marginLeft: 6, color: "#667", fontWeight: 400 }}
                  >
                    ({port.port_type.toUpperCase()})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const OperationsTab = ({ formik }) => {
  const operations = formik.values.operations || [];
  const [activeOpIndex, setActiveOpIndex] = useState(0);

  // Ensure at least one operation exists - but only once the form is truly ready
  useEffect(() => {
    if (formik.values.job_no && operations.length === 0) {
      const transportMode = toUpper(formik.values.transportMode || "");
      const isAir = transportMode === "AIR";
      const customHouse = formik.values.custom_house || "";

      const statusDefaults = { ...getDefaultItem("statusDetails") };
      if (toUpper(formik.values.consignmentType || "") !== "FCL") {
        statusDefaults.icdPort = toUpper(customHouse);
      }

      const newOp = {
        transporterDetails: [getDefaultItem("transporterDetails")],
        bookingDetails: [getDefaultItem("bookingDetails")],
        statusDetails: [statusDefaults],
      };

      if (!isAir) {
        newOp.containerDetails = [getDefaultItem("containerDetails")];
        newOp.weighmentDetails = [getDefaultItem("weighmentDetails")];
      }

      formik.setFieldValue("operations", [newOp]);
    }
  }, [formik.values.job_no, operations.length]);

  // Sync ICD Port with Custom House if currently empty
  useEffect(() => {
    const customHouse = toUpper(formik.values.custom_house || "");
    const consignmentType = toUpper(formik.values.consignmentType || "");
    if (customHouse && consignmentType !== "FCL") {
      let changed = false;
      const updatedOps = operations.map((op) => {
        const statusDetails = op.statusDetails || [];
        const updatedStatus = statusDetails.map((s) => {
          if (!s.icdPort) {
            changed = true;
            return { ...s, icdPort: customHouse };
          }
          return s;
        });
        if (changed) return { ...op, statusDetails: updatedStatus };
        return op;
      });

      if (changed) {
        formik.setFieldValue("operations", updatedOps);
      }
    }
  }, [formik.values.custom_house, formik.values.consignmentType]);

  // 1. Collect all unique container numbers from ALL sections of ALL operations
  const allOpContainersSet = new Set();
  operations.forEach((op) => {
    ["transporterDetails", "containerDetails", "weighmentDetails"].forEach(
      (sec) => {
        (op[sec] || []).forEach((item) => {
          if (item.containerNo && item.containerNo.trim()) {
            allOpContainersSet.add(item.containerNo.trim().toUpperCase());
          }
        });
      }
    );
  });
  const opContainerNos = Array.from(allOpContainersSet);

  // 2. Get master list container numbers
  const masterContainers = formik.values.containers || [];
  const masterContainerNos = masterContainers.map((c) =>
    (c.containerNo || "").toUpperCase()
  );

  // 3. Check Sync Status
  const isSynced =
    opContainerNos.length === masterContainerNos.length &&
    opContainerNos.every((no) => masterContainerNos.includes(no));

  const syncStatus = isSynced ? "Synced" : "Out of Sync";

  // 4. Auto-sync Effect: Keeps operations consistent and updates the main containers array
  useEffect(() => {
    // SECURITY: Do not run sync logic if the form hasn't loaded its job data yet.
    // This prevents wiping container lists during the initial render "flicker".
    if (!formik.values.job_no || operations.length === 0) return;

    // Phase A: Intra-operation Sync (Ensure Transporter, Container, and Weighment Details stay in lock-step)
    let opsModified = false;
    const nextOperations = operations.map((op) => {
      const transportMode = toUpper(formik.values.transportMode || "");
      const isAir = transportMode === "AIR";

      const stuffedAt = toUpper(formik.values.goods_stuffed_at || "");
      const consignmentType = toUpper(formik.values.consignmentType || "");
      const isDock = stuffedAt === "DOCK" || stuffedAt === "DOCKS";
      const isLCL = consignmentType === "LCL";
      const isDockLCL = isDock && isLCL;

      // If Dock LCL, we DO NOT sync row counts or container numbers between sections.
      // Carting (Transporter) is incoming; Weighment/Status is outgoing/processing.
      // They are independent lists in this mode.
      if (isDockLCL) {
        return op;
      }

      const tArr = op.transporterDetails || [];
      const cArr = !isAir ? op.containerDetails || [] : [];
      const wArr = !isAir ? op.weighmentDetails || [] : [];
      const maxLen = Math.max(
        tArr.length,
        !isAir ? cArr.length : 0,
        !isAir ? wArr.length : 0
      );

      // Check if we need to expand any arrays to match lengths
      // For DOCK jobs (FCL), Transporter (Carting) details are independent inputs (trucks)
      // and do not necessarily match the number of output containers.
      // So we exclude transporterDetails from sync if isDock is true.
      let sectionsToSync = [];
      if (isAir) {
        sectionsToSync = ["transporterDetails"];
      } else if (isDock) {
        sectionsToSync = ["containerDetails", "weighmentDetails"];
      } else {
        sectionsToSync = [
          "transporterDetails",
          "containerDetails",
          "weighmentDetails",
        ];
      }

      let opIsDirty = sectionsToSync.some(
        (s) => (op[s] || []).length !== maxLen
      );

      const syncedOp = { ...op };
      sectionsToSync.forEach((s) => {
        const arr = [...(op[s] || [])];
        while (arr.length < maxLen) {
          arr.push(getDefaultItem(s));
        }
        syncedOp[s] = arr;
      });

      // Check for missing container numbers at the same index
      if (!isAir) {
        for (let i = 0; i < maxLen; i++) {
          // Construct the list of found container numbers
          const sources = [];

          // Only look at Transporter Details if NOT Dock mode (since they are independent for Dock)
          if (
            !isDock &&
            syncedOp.transporterDetails &&
            syncedOp.transporterDetails[i]
          ) {
            sources.push(syncedOp.transporterDetails[i].containerNo);
          }
          if (syncedOp.containerDetails && syncedOp.containerDetails[i]) {
            sources.push(syncedOp.containerDetails[i].containerNo);
          }
          if (syncedOp.weighmentDetails && syncedOp.weighmentDetails[i]) {
            sources.push(syncedOp.weighmentDetails[i].containerNo);
          }

          const nosFound = sources.filter((n) => n && n.trim());

          if (nosFound.length > 0) {
            const bestNo = nosFound[0].trim().toUpperCase();

            // Should we update Transporter Details? Only if NOT Dock and the row exists
            if (
              !isDock &&
              syncedOp.transporterDetails &&
              syncedOp.transporterDetails[i]
            ) {
              if (syncedOp.transporterDetails[i].containerNo !== bestNo) {
                syncedOp.transporterDetails[i] = {
                  ...syncedOp.transporterDetails[i],
                  containerNo: bestNo,
                };
                opIsDirty = true;
              }
            }

            // Should we update Container Details?
            if (syncedOp.containerDetails && syncedOp.containerDetails[i]) {
              if (syncedOp.containerDetails[i].containerNo !== bestNo) {
                syncedOp.containerDetails[i] = {
                  ...syncedOp.containerDetails[i],
                  containerNo: bestNo,
                };
                opIsDirty = true;
              }
            }

            // Should we update Weighment Details?
            if (syncedOp.weighmentDetails && syncedOp.weighmentDetails[i]) {
              if (syncedOp.weighmentDetails[i].containerNo !== bestNo) {
                syncedOp.weighmentDetails[i] = {
                  ...syncedOp.weighmentDetails[i],
                  containerNo: bestNo,
                };
                opIsDirty = true;
              }
            }
          }
        }
      }

      if (opIsDirty) opsModified = true;
      return syncedOp;
    });

    if (opsModified) {
      formik.setFieldValue("operations", nextOperations);
      return; // Exit and wait for next render cycle
    }

    // Phase B: Totals Sync (Sum up all operations)
    let totalPkgs = 0;
    let totalGross = 0;
    let totalNet = 0;

    // Also build a map of container details from transporterDetails to sync to master containers
    const containerDetailsMap = new Map();

    operations.forEach((op) => {
      (op.transporterDetails || []).forEach((item) => {
        totalPkgs += Number(item.noOfPackages || 0);
        totalGross += Number(item.grossWeightKgs || 0);
        totalNet += Number(item.netWeightKgs || 0);

        if (item.containerNo) {
          const cNo = item.containerNo.trim().toUpperCase();
          if (!containerDetailsMap.has(cNo)) {
            containerDetailsMap.set(cNo, {
              grossWeight: Number(item.grossWeightKgs || 0),
              netWeight: Number(item.netWeightKgs || 0),
              noOfPackages: Number(item.noOfPackages || 0),
            });
          } else {
            // If container appears multiple times, we sum its specific weights
            const existing = containerDetailsMap.get(cNo);
            existing.grossWeight += Number(item.grossWeightKgs || 0);
            existing.netWeight += Number(item.netWeightKgs || 0);
            existing.noOfPackages += Number(item.noOfPackages || 0);
          }
        }
      });

      // Also grab tareWeightKgs from containerDetails
      (op.containerDetails || []).forEach((item) => {
        if (item.containerNo && item.tareWeightKgs) {
          const cNo = item.containerNo.trim().toUpperCase();
          if (containerDetailsMap.has(cNo)) {
            // We take the last available tare weight if multiple
            containerDetailsMap.get(cNo).tareWeightKgs = Number(
              item.tareWeightKgs || 0
            );
          } else {
            containerDetailsMap.set(cNo, {
              grossWeight: 0,
              netWeight: 0,
              noOfPackages: 0,
              tareWeightKgs: Number(item.tareWeightKgs || 0),
            });
          }
        }
      });
    });

    if (Number(formik.values.total_no_of_pkgs) !== totalPkgs)
      formik.setFieldValue("total_no_of_pkgs", totalPkgs);
    if (Number(formik.values.gross_weight_kg) !== totalGross)
      formik.setFieldValue("gross_weight_kg", totalGross);
    if (Number(formik.values.net_weight_kg) !== totalNet)
      formik.setFieldValue("net_weight_kg", totalNet);

    // Phase C: Master Containers Sync (Updates formik.values.containers)
    // Only run this if NOT Air mode, as Air doesn't use the master containers list
    if (!isAir) {
      const currentMaster = formik.values.containers || [];

      // 1. Reconcile existing containers (Filter out those removed from operations)
      let nextContainers = currentMaster.filter((c) => {
        const uNo = (c.containerNo || "").trim().toUpperCase();
        return uNo && opContainerNos.includes(uNo);
      });

      let masterChanged = nextContainers.length !== currentMaster.length;

      // 2. Update existing or add new ones to match Operations
      opContainerNos.forEach((no) => {
        let masterItemIdx = nextContainers.findIndex(
          (c) => (c.containerNo || "").trim().toUpperCase() === no
        );
        const opInfo = containerDetailsMap.get(no) || {
          grossWeight: 0,
          netWeight: 0,
          noOfPackages: 0,
          tareWeightKgs: 0,
        };

        if (masterItemIdx === -1) {
          nextContainers.push({
            containerNo: no,
            type: "",
            sealNo: "",
            sealDate: "",
            pkgsStuffed: opInfo.noOfPackages,
            grossWeight: opInfo.grossWeight,
            netWeight: opInfo.netWeight,
            tareWeightKgs: opInfo.tareWeightKgs,
          });
          masterChanged = true;
        } else {
          // Sync weights/packages to master item if they differ
          const m = nextContainers[masterItemIdx];
          if (
            Number(m.grossWeight) !== opInfo.grossWeight ||
            Number(m.netWeight) !== opInfo.netWeight ||
            Number(m.pkgsStuffed) !== opInfo.noOfPackages ||
            Number(m.tareWeightKgs || 0) !== opInfo.tareWeightKgs
          ) {
            nextContainers[masterItemIdx] = {
              ...m,
              grossWeight: opInfo.grossWeight,
              netWeight: opInfo.netWeight,
              pkgsStuffed: opInfo.noOfPackages,
              tareWeightKgs: opInfo.tareWeightKgs,
            };
            masterChanged = true;
          }
        }
      });

      if (masterChanged) {
        formik.setFieldValue("containers", nextContainers);
      }
    }
  }, [operations]); // Watch operations to trigger sync

  // --- Actions ---

  const addOperation = () => {
    const transportMode = toUpper(formik.values.transportMode || "");
    const isAir = transportMode === "AIR";
    const customHouse = formik.values.custom_house || "";

    const statusDefaults = { ...getDefaultItem("statusDetails") };
    if (toUpper(formik.values.consignmentType || "") !== "FCL") {
      statusDefaults.icdPort = toUpper(customHouse);
    }

    const newOp = {
      transporterDetails: [getDefaultItem("transporterDetails")],
      bookingDetails: [getDefaultItem("bookingDetails")],
      statusDetails: [statusDefaults],
    };

    if (!isAir) {
      newOp.containerDetails = [getDefaultItem("containerDetails")];
      newOp.weighmentDetails = [getDefaultItem("weighmentDetails")];
    }

    const newOps = [...operations, newOp];
    formik.setFieldValue("operations", newOps);
    setActiveOpIndex(newOps.length - 1);
  };

  const deleteOperation = (index, e) => {
    e.stopPropagation();
    if (operations.length > 1) {
      const newOps = operations.filter((_, i) => i !== index);
      formik.setFieldValue("operations", newOps);
      if (activeOpIndex >= newOps.length) {
        setActiveOpIndex(newOps.length - 1);
      }
    }
  };

  const updateField = (section, itemIndex, field, value) => {
    const currentOps = formik.values.operations || [];
    const transportMode = toUpper(formik.values.transportMode || "");
    const isAir = transportMode === "AIR";

    const isLinkedContainerField =
      !isAir &&
      field === "containerNo" &&
      ["transporterDetails", "containerDetails", "weighmentDetails"].includes(
        section
      );

    const newOperations = currentOps.map((op, opIdx) => {
      if (opIdx !== activeOpIndex) return op;

      const updatedOp = { ...op };
      const currentSection = op[section] || [];
      const finalValue = field === "containerNo" ? toUpper(value) : value;

      // Update the targeted field (handling virtual rows if the array is empty)
      if (currentSection.length === 0 && itemIndex === 0) {
        updatedOp[section] = [
          { ...getDefaultItem(section), [field]: finalValue },
        ];
      } else {
        updatedOp[section] = currentSection.map((item, itemIdx) => {
          if (itemIdx !== itemIndex) return item;
          return { ...item, [field]: finalValue };
        });
      }

      // SYNC: If it's a linked container field, update other sections at same index
      if (isLinkedContainerField) {
        ["transporterDetails", "containerDetails", "weighmentDetails"].forEach(
          (s) => {
            if (s === section) return;
            if (updatedOp[s] && updatedOp[s][itemIndex]) {
              const row = {
                ...updatedOp[s][itemIndex],
                containerNo: finalValue,
              };
              updatedOp[s] = [...updatedOp[s]];
              updatedOp[s][itemIndex] = row;
            }
          }
        );
      }

      return updatedOp;
    });

    formik.setFieldValue("operations", newOperations);
  };

  const addItem = (section) => {
    const newOperations = [...operations];
    const op = { ...newOperations[activeOpIndex] };
    if (!op) return;

    const transportMode = toUpper(formik.values.transportMode || "");
    const isAir = transportMode === "AIR";

    const isLinkedSection =
      !isAir &&
      ["transporterDetails", "containerDetails", "weighmentDetails"].includes(
        section
      );

    if (isLinkedSection) {
      // Add row to all 3 linked sections to maintain index alignment
      op.transporterDetails = [
        ...(op.transporterDetails || []),
        getDefaultItem("transporterDetails"),
      ];
      op.containerDetails = [
        ...(op.containerDetails || []),
        getDefaultItem("containerDetails"),
      ];
      op.weighmentDetails = [
        ...(op.weighmentDetails || []),
        getDefaultItem("weighmentDetails"),
      ];
    } else {
      op[section] = [...(op[section] || []), getDefaultItem(section)];
    }

    newOperations[activeOpIndex] = op;
    formik.setFieldValue("operations", newOperations);
  };

  const deleteItem = (section, itemIndex) => {
    const newOperations = [...operations];
    const op = { ...newOperations[activeOpIndex] };
    if (!op) return;

    const transportMode = toUpper(formik.values.transportMode || "");
    const isAir = transportMode === "AIR";

    const isLinkedSection =
      !isAir &&
      ["transporterDetails", "containerDetails", "weighmentDetails"].includes(
        section
      );

    if (isLinkedSection) {
      // Delete row from all linked sections to maintain index alignment
      op.transporterDetails = (op.transporterDetails || []).filter(
        (_, i) => i !== itemIndex
      );
      op.containerDetails = (op.containerDetails || []).filter(
        (_, i) => i !== itemIndex
      );
      op.weighmentDetails = (op.weighmentDetails || []).filter(
        (_, i) => i !== itemIndex
      );
    } else {
      op[section] = (op[section] || []).filter((_, i) => i !== itemIndex);
    }

    newOperations[activeOpIndex] = op;
    formik.setFieldValue("operations", newOperations);
  };

  // --- Render Helpers ---

  if (operations.length === 0) {
    return null; // Will be handled by useEffect
  }

  const activeOperation = operations[activeOpIndex];
  // Safety check if activeOpIndex is out of bounds (can happen during deletes)
  if (!activeOperation) {
    if (operations.length > 0) setActiveOpIndex(0);
    return null;
  }

  const transportMode = toUpper(formik.values.transportMode || "");
  const isAir = transportMode === "AIR";

  const stuffedAt = toUpper(formik.values.goods_stuffed_at || "");
  const consignmentType = toUpper(formik.values.consignmentType || "");
  const isDock = stuffedAt === "DOCK" || stuffedAt === "DOCKS";
  const isLCL = consignmentType === "LCL";
  const isFCL = consignmentType === "FCL";

  const transporterSection = (
    <TableSection
      title={isDock ? "Carting Details" : "Transporter Details"}
      data={activeOperation.transporterDetails || []}
      formik={formik}
      activeOpIndex={activeOpIndex}
      columns={[
        {
          field: "transporterName",
          label: "Transporter Name",
          width: "110px",
        },
        { field: "vehicleNo", label: "Vehicle No.", width: "10px" },
        // If Dock (FCL or LCL), we do NOT show Container No in Carting Details
        !isAir &&
          !isDock && {
            field: "containerNo",
            label: "Container No.",
            width: "140px",
          },
        { field: "driverName", label: "Driver Name", width: "150px" },
        { field: "contactNo", label: "Contact No.", width: "120px" },
        {
          field: "noOfPackages",
          label: "Packages",
          type: "number",
          width: "80px",
        },
        {
          field: "grossWeightKgs",
          label: "Gross Wt (KG)",
          type: "number",
          width: "100px",
        },
        {
          field: "netWeightKgs",
          label: "Net Wt (KG)",
          type: "number",
          width: "100px",
        },
        {
          field: "cartingDate",
          label: "Carting",
          type: "date",
          width: "130px",
        },
        {
          field: "gateInDate",
          label: "Gate-In",
          type: "date",
          width: "130px",
        },
        {
          field: "images",
          label: "Images",
          type: "upload",
          width: "180px",
          bucketPath: "transporter_images",
        },
      ].filter(Boolean)}
      section="transporterDetails"
      onUpdate={updateField}
      onAdd={addItem}
      onDelete={deleteItem}
      defaultOpen={true}
    />
  );

  const containerSection = !isAir && (
    <TableSection
      title="Container Details"
      data={activeOperation.containerDetails || []}
      formik={formik}
      activeOpIndex={activeOpIndex}
      columns={[
        { field: "containerNo", label: "Container No.", width: "140px" },
        {
          field: "shippingLineSealNo",
          label: "S/Line Seal No",
          width: "140px",
        },
        { field: "containerSize", label: "Size (FT)", width: "80px" },
        {
          field: "containerType",
          label: "Container Type",
          width: "100px",
        },
        {
          field: "cargoType",
          label: "Cargo Type",
          width: "100px",
          type: "select",
          options: [
            { value: "Gen", label: "Gen" },
            { value: "Haz", label: "Haz" },
          ],
        },
        {
          field: "maxGrossWeightKgs",
          label: "Max Gross (KG)",
          type: "number",
          width: "100px",
        },
        {
          field: "tareWeightKgs",
          label: "Tare Wt (KG)",
          type: "number",
          width: "100px",
        },
        {
          field: "maxPayloadKgs",
          label: "Max Payload (KG)",
          type: "number",
          width: "100px",
        },
        {
          field: "images",
          label: "Images",
          type: "upload",
          width: "180px",
          bucketPath: "container_images",
        },
      ]}
      section="containerDetails"
      onUpdate={updateField}
      onAdd={addItem}
      onDelete={deleteItem}
      defaultOpen={true}
    />
  );

  const bookingSection = (
    <TableSection
      title="Booking Details"
      data={activeOperation.bookingDetails || []}
      formik={formik}
      activeOpIndex={activeOpIndex}
      columns={[
        {
          field: "shippingLineName",
          label: isAir ? "Air Line" : "Shipping Line",
          width: "200px",
          type: "shipping-dropdown",
        },
        { field: "forwarderName", label: "Forwarder", width: "150px" },
        { field: "bookingNo", label: "Booking No.", width: "140px" },
        // removed shippingLineSealNo from here
        {
          field: "bookingDate",
          label: "Booking",
          type: "date",
          width: "130px",
        },
        {
          field: "vesselName",
          label: isAir ? "Flight Name" : "Vessel",
          width: "150px",
        },
        !isAir && { field: "voyageNo", label: "Voyage", width: "100px" },
        !isAir && {
          field: "portOfLoading",
          label: "POL",
          width: "120px",
          type: "gatewaydropdown",
        },
        !isAir && {
          field: "handoverLocation",
          label: "Empty Pickup / Drop Location",
          width: "140px",
        },
        !isAir && {
          field: "validity",
          label: "Booking Valid Till",
          type: "date",
          width: "130px",
        },
        {
          field: "images",
          label: "Images",
          type: "upload",
          width: "180px",
          bucketPath: "booking_images",
        },
      ].filter(Boolean)}
      section="bookingDetails"
      onUpdate={updateField}
      onAdd={addItem}
      onDelete={deleteItem}
      defaultOpen={true}
    />
  );

  const weighmentSection = !isAir && (
    <TableSection
      title="Weighment Details"
      data={activeOperation.weighmentDetails || []}
      formik={formik}
      activeOpIndex={activeOpIndex}
      columns={[
        {
          field: "weighBridgeName",
          label: "Weighbridge Name",
          width: "180px",
        },
        { field: "regNo", label: "Reg No.", width: "120px" },
        {
          field: "address",
          label: "Weighbridge Address",
          width: "180px",
        },
        {
          field: "dateTime",
          label: "Weighment Date & Time",
          type: "datetime-local",
          width: "160px",
        },
        { field: "vehicleNo", label: "Vehicle No.", width: "120px" },
        { field: "containerNo", label: "Container No.", width: "140px" },
        { field: "size", label: "Cntr Size", width: "80px" },
        {
          field: "grossWeight",
          label: "Gross Wt (KG)",
          type: "number",
          width: "90px",
        },
        {
          field: "tareWeight",
          label: "Tare Wt (KG)",
          type: "number",
          width: "90px",
        },
        {
          field: "netWeight",
          label: "Net Wt (KG)",
          type: "number",
          width: "90px",
        },
        {
          field: "images",
          label: "Images",
          type: "upload",
          width: "180px",
          bucketPath: "weighment_images",
        },
      ]}
      section="weighmentDetails"
      onUpdate={updateField}
      onAdd={addItem}
      onDelete={deleteItem}
      defaultOpen={true}
    />
  );

  const statusSection = (
    <StatusSection
      title="Status Tracking"
      data={activeOperation.statusDetails || []}
      section="statusDetails"
      onUpdate={updateField}
      onAdd={addItem}
      onDelete={deleteItem}
      formik={formik}
      activeOpIndex={activeOpIndex}
      isAir={isAir}
      consignmentType={toUpper(formik.values.consignmentType || "")}
      customHouse={toUpper(formik.values.custom_house || "")}
      defaultOpen={true}
    />
  );

  let renderedContent;
  if (isDock && isLCL) {
    // Dock + LCL Order: Carting -> Status -> Weighment (ONLY these 3)
    renderedContent = (
      <>
        {transporterSection}
        {statusSection}
        {weighmentSection}
      </>
    );
  } else if (isDock && isFCL) {
    // Dock + FCL Order: Carting -> Status -> Container -> Booking -> Weighment
    renderedContent = (
      <>
        {transporterSection}
        {statusSection}
        {containerSection}
        {bookingSection}
        {weighmentSection}
      </>
    );
  } else {
    // Standard Order: Transporter -> Container -> Booking -> Weighment -> Status
    renderedContent = (
      <>
        {transporterSection}
        {containerSection}
        {bookingSection}
        {weighmentSection}
        {statusSection}
      </>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Bar: Operations Tabs & Global Actions */}
      <div style={styles.topBar}>
        <div style={styles.tabsScroll}>
          {operations.map((op, idx) => (
            <div
              key={idx}
              onClick={() => setActiveOpIndex(idx)}
              style={{
                ...styles.opTab,
                ...(activeOpIndex === idx ? styles.opTabActive : {}),
              }}
            >
              <span style={styles.opTabText}>Operation {idx + 1}</span>
              {operations.length > 1 && (
                <span
                  onClick={(e) => deleteOperation(idx, e)}
                  style={styles.opTabClose}
                  title="Remove Operation"
                >
                  Delete
                </span>
              )}
            </div>
          ))}
          <button onClick={addOperation} style={styles.addOpButton}>
            + New Op
          </button>
        </div>
        <div style={styles.statusBadge}>
          <span
            style={{
              ...styles.statusDot,
              background: syncStatus === "Synced" ? "#10b981" : "#f59e0b",
            }}
          />
          {syncStatus}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={styles.contentArea}>{renderedContent}</div>
    </div>
  );
};

// const JobDetailedStatusSection = ({ formik }) => {
//   const statuses = [
//     "SB Filed",
//     "SB Receipt",
//     "L.E.O",
//     "Container HO to Concor",
//     "Rail Out",
//     "Ready for Billing",
//     "Billing Done",
//   ];

//   const currentStatusArray = formik.values.detailedStatus || [];

//   const handleToggle = (status) => {
//     let nextStatus;
//     if (currentStatusArray.includes(status)) {
//       nextStatus = currentStatusArray.filter((s) => s !== status);
//     } else {
//       nextStatus = [...currentStatusArray, status];
//     }
//     formik.setFieldValue("detailedStatus", nextStatus);
//   };

//   return (
//     <div style={styles.sectionContainer}>
//       <div style={styles.sectionHeader}>
//         <h3 style={styles.sectionTitle}>Job Progress Checklist</h3>
//       </div>
//       <div
//         style={{
//           display: "flex",
//           flexWrap: "wrap",
//           gap: "20px",
//           padding: "20px",
//           backgroundColor: "#fff",
//         }}
//       >
//         {statuses.map((status) => (
//           <label
//             key={status}
//             style={{
//               display: "flex",
//               alignItems: "center",
//               gap: "10px",
//               cursor: "pointer",
//               fontSize: "14px",
//               fontWeight: "500",
//               color: currentStatusArray.includes(status)
//                 ? "#2563eb"
//                 : "#4b5563",
//               padding: "8px 12px",
//               borderRadius: "6px",
//               border: "1px solid",
//               borderColor: currentStatusArray.includes(status)
//                 ? "#bfdbfe"
//                 : "#e5e7eb",
//               backgroundColor: currentStatusArray.includes(status)
//                 ? "#eff6ff"
//                 : "#f9fafb",
//               transition: "all 0.2s",
//             }}
//           >
//             <input
//               type="checkbox"
//               checked={currentStatusArray.includes(status)}
//               onChange={() => handleToggle(status)}
//               style={{
//                 width: "18px",
//                 height: "18px",
//                 cursor: "pointer",
//               }}
//             />
//             {status}
//           </label>
//         ))}
//       </div>
//     </div>
//   );
// };

// --- Sub-Components ---

const TableSection = ({
  title,
  data,
  columns,
  section,
  onUpdate,
  onAdd,
  onDelete,
  formik,
  activeOpIndex,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // Ensure at least one row exists
  const displayData =
    data && data.length > 0 ? data : [getDefaultItem(section)];

  // NOTE: Redundant mount effect that was causing race conditions has been removed.
  // Initialization is now managed by the parent OperationsTab.

  return (
    <div style={styles.sectionContainer}>
      <div
        style={{
          ...styles.sectionHeader,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 style={styles.sectionTitle}>{title}</h3>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </div>
      {isOpen && (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.field}
                      style={{ ...styles.th, width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th
                    style={{ ...styles.th, width: "60px", textAlign: "center" }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((item, rowIdx) => (
                  <tr key={rowIdx} style={styles.tr}>
                    {columns.map((col) => (
                      <td key={col.field} style={styles.td}>
                        {col.type === "upload" ? (
                          <div style={styles.uploadCell}>
                            <FileUpload
                              bucketPath={col.bucketPath || "general_uploads"}
                              multiple={true}
                              acceptedFileTypes={[
                                ".pdf",
                                ".jpg",
                                ".png",
                                ".jpeg",
                              ]}
                              onFilesUploaded={(newUrls) => {
                                const currentImages = item[col.field] || [];
                                const updatedList = [
                                  ...currentImages,
                                  ...newUrls,
                                ];
                                onUpdate(
                                  section,
                                  rowIdx,
                                  col.field,
                                  updatedList
                                );
                              }}
                            />
                            <ImagePreview
                              images={item[col.field] || []}
                              readOnly={false}
                              onDeleteImage={(deleteIndex) => {
                                const currentImages = item[col.field] || [];
                                const updatedList = currentImages.filter(
                                  (_, i) => i !== deleteIndex
                                );
                                onUpdate(
                                  section,
                                  rowIdx,
                                  col.field,
                                  updatedList
                                );
                              }}
                            />
                          </div>
                        ) : col.type === "shipping-dropdown" ? (
                          <ShippingLineDropdownField
                            fieldName={`operations.${activeOpIndex}.${section}.${rowIdx}.${col.field}`}
                            formik={formik}
                            placeholder={col.placeholder || ""}
                          />
                        ) : col.type === "gatewaydropdown" ||
                          col.type === "gateway-dropdown" ? (
                          <GatewayPortDropdown
                            fieldName={`operations.${activeOpIndex}.${section}.${rowIdx}.${col.field}`}
                            formik={formik}
                            placeholder={col.placeholder || ""}
                          />
                        ) : col.type === "select" ? (
                          <select
                            value={
                              item[col.field] === undefined
                                ? ""
                                : item[col.field]
                            }
                            onChange={(e) =>
                              onUpdate(
                                section,
                                rowIdx,
                                col.field,
                                e.target.value
                              )
                            }
                            style={styles.cellInput}
                          >
                            <option value="">Select...</option>
                            {(col.options || []).map((opt) => (
                              <option
                                key={typeof opt === "string" ? opt : opt.value}
                                value={
                                  typeof opt === "string" ? opt : opt.value
                                }
                              >
                                {typeof opt === "string" ? opt : opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={
                              col.type === "date" ||
                              col.type === "datetime-local"
                                ? "text"
                                : col.type || "text"
                            }
                            value={
                              item[col.field] === undefined ||
                              item[col.field] === null
                                ? ""
                                : col.type === "date" ||
                                  col.type === "datetime-local"
                                ? formatDateForInput(item[col.field], col.type)
                                : item[col.field]
                            }
                            onChange={(e) =>
                              onUpdate(
                                section,
                                rowIdx,
                                col.field,
                                col.type === "number"
                                  ? e.target.value
                                  : e.target.value
                              )
                            }
                            onDoubleClick={(e) => {
                              if (
                                col.type === "date" ||
                                col.type === "datetime-local"
                              ) {
                                const pickerVal = formatDateForPicker(
                                  item[col.field],
                                  col.type
                                );
                                if (pickerVal) e.target.value = pickerVal;
                                e.target.type = col.type;
                                e.target.showPicker && e.target.showPicker();
                              }
                            }}
                            onBlur={(e) => {
                              if (
                                col.type === "date" ||
                                col.type === "datetime-local"
                              ) {
                                e.target.type = "text";
                              }
                            }}
                            onFocus={(e) => {
                              if (
                                section === "transporterDetails" &&
                                (col.field === "grossWeightKgs" ||
                                  col.field === "netWeightKgs" ||
                                  col.field === "noOfPackages") &&
                                !e.target.value
                              ) {
                                const shipmentGross =
                                  formik.values.gross_weight_kg || "";
                                const shipmentNet =
                                  formik.values.net_weight_kg || "";
                                const shipmentPkgs =
                                  formik.values.total_no_of_pkgs || "";

                                if (
                                  col.field === "grossWeightKgs" &&
                                  shipmentGross
                                ) {
                                  onUpdate(
                                    section,
                                    rowIdx,
                                    col.field,
                                    shipmentGross
                                  );
                                } else if (
                                  col.field === "netWeightKgs" &&
                                  shipmentNet
                                ) {
                                  onUpdate(
                                    section,
                                    rowIdx,
                                    col.field,
                                    shipmentNet
                                  );
                                } else if (
                                  col.field === "noOfPackages" &&
                                  shipmentPkgs
                                ) {
                                  onUpdate(
                                    section,
                                    rowIdx,
                                    col.field,
                                    shipmentPkgs
                                  );
                                }
                              }
                            }}
                            style={styles.cellInput}
                            placeholder={
                              col.placeholder ||
                              (col.type === "date" ? "dd-mm-yyyy" : "")
                            }
                          />
                        )}
                      </td>
                    ))}
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <button
                        onClick={() => onDelete(section, rowIdx)}
                        style={styles.rowDeleteBtn}
                        title="Delete Row"
                        disabled={displayData.length === 1}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={styles.sectionFooter}>
            <button onClick={() => onAdd(section)} style={styles.addRowBtn}>
              + Add Row
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const StatusSection = ({
  title,
  data,
  section,
  onUpdate,
  onAdd,
  onDelete,
  formik,
  activeOpIndex,
  isAir,
  consignmentType,
  customHouse,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const displayData =
    data && data.length > 0 ? data : [getDefaultItem(section)];

  const row1Fields = [
    {
      field: "rms",
      label: "RMS Status",
      type: "select",
      options: ["RMS", "Assessment"],
      width: 1,
    },
    {
      field: "goodsRegistrationDate",
      label: "Goods Reg./Report",
      type: "date",
      width: 1,
    },
    { field: "leoDate", label: "LEO", type: "date", width: 1 },
    { field: "leoUpload", label: "LEO Copy", type: "upload", width: 1 },
    {
      field: "containerPlacementDate",
      label: "Cnt Placement",
      type: "date",
      width: 1,
      hidden: isAir,
    },
    {
      field: "stuffingDate",
      label: "Stuffing",
      type: "date",
      width: 1,
      hidden: isAir,
    },
    {
      field: "stuffingSheetUpload",
      label: "Stuffing Sheet",
      type: "upload",
      width: 1,
      hidden: isAir,
    },
    {
      field: "stuffingPhotoUpload",
      label: "Stuffing Photo",
      type: "upload",
      width: 1,
      hidden: isAir,
    },
    {
      field: "eGatePassCopyDate",
      label: "Gate Pass",
      type: "date",
      width: 1,
    },
    {
      field: "eGatePassUpload",
      label: "Gate Pass Copy",
      type: "upload",
      width: 1,
    },
  ].filter((f) => !f.hidden);

  const row2Fields = [
    {
      field: "icdPort",
      label: "ICD/Port",
      type: "icd",
      width: 1,
    },
    {
      field: "handoverForwardingNoteDate",
      label: "File HO/DOC",
      type: "date",
      width: 1,
    },
    {
      field: "handoverImageUpload",
      label: "HO/DOC Copy",
      type: "upload",
      width: 1,
      hidden: isAir,
    },
    {
      field: "forwarderName",
      label: "Forwarder",
      type: "text",
      width: 1,
      hidden: isAir,
    },
    {
      field: "dispatchDetails",
      label: "Dispatch Tracking",
      type: "dispatch",
      width: 1,
      hidden: isAir,
    },
    {
      field: "railOutReachedDate",
      label: "Reached",
      type: "date",
      width: 1,
      hidden: isAir,
    },
    {
      field: "billingDocsSentDt",
      label: "Billing",
      type: "date",
      width: 1,
    },
    {
      field: "billingDocsSentUpload",
      label: "Bill Doc Copy",
      type: "upload",
      width: 1,
    },
    {
      field: "billingDocsStatus",
      label: "Bill Status",
      type: "select",
      options: ["Pending", "Completed"],
      width: 1,
    },
  ].filter((f) => !f.hidden);

  // Calculate grid columns for each row based on visible fields
  const r1Cols = row1Fields.reduce((sum, f) => sum + (f.width || 1), 0);
  const r2Cols = row2Fields.reduce((sum, f) => sum + (f.width || 1), 0);

  const renderCell = (f, item, rowIdx) => {
    return f.type === "upload" ? (
      <div style={styles.uploadCell}>
        <FileUpload
          bucketPath={
            f.field === "leoUpload"
              ? "leo_uploads"
              : f.field === "eGatePassUpload"
              ? "egate_uploads"
              : f.field === "stuffingSheetUpload"
              ? "stuffing_sheet_uploads"
              : f.field === "stuffingPhotoUpload"
              ? "stuffing_photo_uploads"
              : f.field === "billingDocsSentUpload"
              ? "billing_uploads"
              : f.field === "handoverImageUpload"
              ? "job_handover_images"
              : "general_uploads"
          }
          multiple={true}
          acceptedFileTypes={[".pdf", ".jpg", ".png", ".jpeg"]}
          onFilesUploaded={(newUrls) => {
            const currentImages = item[f.field] || [];
            const updatedList = [...currentImages, ...newUrls];
            onUpdate(section, rowIdx, f.field, updatedList);
          }}
        />
        <ImagePreview
          images={item[f.field] || []}
          onDeleteImage={(deleteIndex) => {
            const currentImages = item[f.field] || [];
            const updatedList = currentImages.filter(
              (_, i) => i !== deleteIndex
            );
            onUpdate(section, rowIdx, f.field, updatedList);
          }}
        />
      </div>
    ) : f.type === "select" ? (
      <select
        value={item[f.field] || ""}
        onChange={(e) => onUpdate(section, rowIdx, f.field, e.target.value)}
        style={styles.cellInput}
      >
        <option value="">Select...</option>
        {f.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : f.type === "icd" ? (
      <div style={{ padding: "0 4px" }}>
        <IcdPortAutocomplete
          value={item.icdPort || ""}
          onChange={(val) => onUpdate(section, rowIdx, "icdPort", val)}
        />
      </div>
    ) : f.type === "gateway-dropdown" ? (
      <div style={{ padding: "0 4px", width: "100%", height: "100%" }}>
        <GatewayPortDropdown
          fieldName={`operations.${activeOpIndex}.${section}.${rowIdx}.${f.field}`}
          formik={formik}
          placeholder={f.placeholder || ""}
        />
      </div>
    ) : f.type === "dispatch" ? (
      <div
        style={{
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          fontSize: "11px",
        }}
      >
        {/* Transport Mode */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name={`railRoad-${rowIdx}`}
              value="rail"
              checked={item.railRoad === "rail"}
              onChange={() => onUpdate(section, rowIdx, "railRoad", "rail")}
            />
            Rail
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name={`railRoad-${rowIdx}`}
              value="road"
              checked={item.railRoad === "road"}
              onChange={() => onUpdate(section, rowIdx, "railRoad", "road")}
            />
            Road
          </label>
        </div>

        {/* Road Type & Details Inline */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {item.railRoad === "road" && (
            <>
              <div style={{ display: "flex", gap: "8px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.concorPrivate === "private"}
                    onChange={(e) =>
                      onUpdate(
                        section,
                        rowIdx,
                        "concorPrivate",
                        e.target.checked ? "private" : "concor"
                      )
                    }
                  />
                  Private
                </label>
              </div>

              {item.concorPrivate === "private" && (
                <input
                  type="text"
                  value={toUpper(item.privateTransporterName || "")}
                  onChange={(e) =>
                    onUpdate(
                      section,
                      rowIdx,
                      "privateTransporterName",
                      e.target.value.toUpperCase()
                    )
                  }
                  style={{
                    ...styles.cellInput,
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    height: "28px",
                    minHeight: "28px",
                    width: "130px",
                  }}
                  placeholder="Transporter"
                />
              )}
            </>
          )}

          <input
            type="text"
            value={formatDateForInput(
              item.handoverConcorTharSanganaRailRoadDate || "",
              "date"
            )}
            onDoubleClick={(e) => {
              const pickerVal = formatDateForPicker(
                item.handoverConcorTharSanganaRailRoadDate,
                "date"
              );
              if (pickerVal) e.target.value = pickerVal;
              e.target.type = "date";
              e.target.showPicker && e.target.showPicker();
            }}
            onBlur={(e) => (e.target.type = "text")}
            onChange={(e) =>
              onUpdate(
                section,
                rowIdx,
                "handoverConcorTharSanganaRailRoadDate",
                e.target.value
              )
            }
            style={{
              ...styles.cellInput,
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              height: "28px",
              minHeight: "28px",
              width: "100px",
            }}
            placeholder="Date"
          />
        </div>
      </div>
    ) : (
      <input
        type={
          f.type === "date" || f.type === "datetime-local"
            ? "text"
            : f.type || "text"
        }
        value={
          f.type === "date" || f.type === "datetime-local"
            ? formatDateForInput(item[f.field] || "", f.type)
            : item[f.field] || ""
        }
        onChange={(e) => onUpdate(section, rowIdx, f.field, e.target.value)}
        onDoubleClick={(e) => {
          if (f.type === "date" || f.type === "datetime-local") {
            const pickerVal = formatDateForPicker(item[f.field], f.type);
            if (pickerVal) e.target.value = pickerVal;
            e.target.type = f.type;
            e.target.showPicker && e.target.showPicker();
          }
        }}
        onBlur={(e) => {
          if (f.type === "date" || f.type === "datetime-local") {
            e.target.type = "text";
          }
        }}
        style={styles.cellInput}
        placeholder={f.type === "date" ? "dd-mm-yyyy" : ""}
      />
    );
  };

  return (
    <div style={{ ...styles.sectionContainer, marginBottom: "16px" }}>
      <div
        style={{
          ...styles.sectionHeader,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 style={styles.sectionTitle}>{title}</h3>
        <span style={{ fontSize: "12px", color: "#64748b" }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {isOpen && (
        <>
          {displayData.map((item, rowIdx) => (
            <div
              key={rowIdx}
              style={{ borderBottom: "2px solid #e2e8f0", padding: "10px 0" }}
            >
              {/* Row 1 Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${r1Cols}, 1fr)`,
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px 4px 0 0",
                  overflow: "hidden",
                }}
              >
                {/* Headers 1 */}
                {row1Fields.map((f) => (
                  <div
                    key={`h1-${f.field}`}
                    style={{
                      ...styles.th,
                      borderBottom: "1px solid #cbd5e1",
                      borderRight: "1px solid #e2e8f0",
                    }}
                  >
                    {f.label}
                  </div>
                ))}
                {/* Data 1 */}
                {row1Fields.map((f) => (
                  <div
                    key={`d1-${f.field}`}
                    style={{ ...styles.td, borderRight: "1px solid #e2e8f0" }}
                  >
                    {renderCell(f, item, rowIdx)}
                  </div>
                ))}
              </div>

              {/* Row 2 Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${r2Cols}, 1fr)`,
                  border: "1px solid #e2e8f0",
                  borderTop: "none",
                  borderRadius: "0 0 4px 4px",
                  overflow: "hidden",
                }}
              >
                {/* Headers 2 */}
                {row2Fields.map((f) => (
                  <div
                    key={`h2-${f.field}`}
                    style={{
                      ...styles.th,
                      gridColumn: `span ${f.width || 1}`,
                      borderBottom: "1px solid #cbd5e1",
                      borderRight: "1px solid #e2e8f0",
                    }}
                  >
                    {f.label}
                  </div>
                ))}
                {/* Data 2 */}
                {row2Fields.map((f) => (
                  <div
                    key={`d2-${f.field}`}
                    style={{
                      ...styles.td,
                      gridColumn: `span ${f.width || 1}`,
                      borderRight: "1px solid #e2e8f0",
                    }}
                  >
                    {renderCell(f, item, rowIdx)}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "6px 0",
                }}
              >
                <button
                  onClick={() => onDelete(section, rowIdx)}
                  style={{ ...styles.rowDeleteBtn, color: "#ef4444" }}
                  disabled={displayData.length === 1}
                >
                  Remove Tracking Row
                </button>
              </div>
            </div>
          ))}

          <div style={styles.sectionFooter}>
            <button onClick={() => onAdd(section)} style={styles.addRowBtn}>
              + Add Tracking Entry
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const HoNameAutocomplete = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef();
  const apiBase = import.meta.env.VITE_API_STRING;

  useEffect(() => {
    const fetchNames = async () => {
      try {
        const res = await fetch(`${apiBase}/dsr/ho-to-console-names`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setOpts(data.data);
        }
      } catch (err) {
        console.error("Error fetching HO names", err);
      }
    };
    fetchNames();
  }, [apiBase]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const v = (value || "").toUpperCase();
    setFiltered(opts.filter((o) => o.toUpperCase().includes(v)));
  }, [value, opts]);

  return (
    <div style={{ position: "relative" }} ref={wrapperRef}>
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={styles.statusInput}
        placeholder="SEARCH OR ENTER NAME"
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            zIndex: 10,
            maxHeight: "150px",
            overflowY: "auto",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            marginTop: "4px",
          }}
        >
          {filtered.map((name, i) => (
            <div
              key={i}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "12px",
                borderBottom: "1px solid #f1f5f9",
              }}
              onMouseDown={() => {
                onChange(name.toUpperCase());
                setOpen(false);
              }}
              onMouseEnter={(e) => (e.target.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.target.style.background = "#fff")}
            >
              {name.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const IcdPortAutocomplete = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef();
  const apiBase = import.meta.env.VITE_API_STRING;

  useEffect(() => {
    if (!open) return;
    const fetchPorts = async () => {
      try {
        const res = await fetch(
          `${apiBase}/gateway-ports/?page=1&status=&type=&search=`
        );
        const data = await res.json();
        const ports = Array.isArray(data?.data) ? data.data : [];
        setOpts(ports);
      } catch (err) {
        console.error("Error fetching gateway ports", err);
      }
    };
    fetchPorts();
  }, [open, apiBase]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const v = (value || "").toUpperCase();
    const results = opts.filter((p) => {
      const code = p.unece_code || "";
      const name = p.name || "";
      const haystack = `${code} ${name}`.toUpperCase();
      return !v || haystack.includes(v);
    });
    setFiltered(results);
  }, [value, opts]);

  const select = (port) => {
    const val = `${(port.unece_code || "").toUpperCase()} - ${(
      port.name || ""
    ).toUpperCase()}`.trim();
    onChange(val);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div style={{ position: "relative" }} ref={wrapperRef}>
      <input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(filtered.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            select(filtered[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        style={styles.statusInput}
        placeholder="SELECT PORT"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={styles.acMenu}>
          {filtered.map((port, i) => (
            <div
              key={port._id || i}
              style={styles.acItem(active === i)}
              onMouseDown={() => select(port)}
              onMouseEnter={() => setActive(i)}
            >
              {(port.unece_code || "").toUpperCase()} -{" "}
              {(port.name || "").toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ onAdd }) => (
  <div style={styles.emptyContainer}>
    <div style={styles.emptyContent}>
      <div style={{ fontSize: "40px", marginBottom: "20px" }}>🚛</div>
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#2d3748",
          margin: "0 0 10px 0",
        }}
      >
        No Operations Configured
      </h3>
      <p style={{ color: "#718096", fontSize: "14px", marginBottom: "24px" }}>
        Add your first operation to start tracking bookings, containers, and
        transporters.
      </p>
      <button onClick={onAdd} style={styles.primaryBtn}>
        Initialize Operation
      </button>
    </div>
  </div>
);

// --- Data Helpers ---

// --- Styles ---

const styles = {
  container: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: "#f8fafc",
    padding: "16px",
    minHeight: "100%",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    background: "linear-gradient(to bottom, #ffffff, #f8fafc)",
    padding: "12px 16px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  tabsScroll: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    paddingBottom: "2px",
    alignItems: "center",
    flex: 1,
  },
  opTab: {
    padding: "8px 16px",
    borderRadius: "6px",
    background: "#ffffff",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s ease",
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  opTabActive: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#ffffff",
    borderColor: "#2563eb",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
  },
  opTabText: {
    whiteSpace: "nowrap",
    fontSize: "13px",
    fontWeight: "600",
  },
  opTabClose: {
    fontSize: "11px",
    lineHeight: 1,
    padding: "3px 6px",
    borderRadius: "4px",
    marginLeft: "4px",
    background: "rgba(255, 255, 255, 0.25)",
    color: "#fff",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  addOpButton: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px dashed #cbd5e1",
    background: "#ffffff",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
    background: "#ffffff",
    padding: "8px 14px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
  },
  contentArea: {
    display: "flex",
    flexDirection: "column",
  },
  sectionContainer: {
    background: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  sectionHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sectionFooter: {
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  tableWrapper: {
    overflowX: "auto",
    overflowY: "visible",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    tableLayout: "auto", // Changed from fixed to auto for dynamic column widths
  },
  th: {
    background: "linear-gradient(to bottom, #f1f5f9, #e2e8f0)",
    color: "#0f172a",
    fontWeight: "700",
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #cbd5e1",
    borderRight: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  tr: {
    transition: "background 0.1s ease",
  },
  td: {
    padding: "0",
    overflow: "visible",

    borderBottom: "1px solid #e2e8f0",
    borderRight: "1px solid #e2e8f0",
    height: "auto",
    verticalAlign: "middle",
    background: "#ffffff",
  },
  cellInput: {
    width: "100%",
    minHeight: "36px",
    border: "1px solid transparent",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#1e293b",
    outline: "none",
    background: "transparent",
    boxSizing: "border-box",
    transition: "all 0.15s ease",
  },
  uploadCell: {
    padding: "8px",
    minWidth: "140px",
  },
  rowDeleteBtn: {
    background: "transparent",
    color: "#ef4444",
    border: "none",
    fontSize: "11px",
    cursor: "pointer",
    padding: "6px 10px",
    fontWeight: "600",
    opacity: 0.7,
    transition: "all 0.2s",
  },
  addRowBtn: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#ffffff",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "8px 16px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.2)",
    transition: "all 0.2s ease",
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
    padding: "16px",
  },
  statusField: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  statusLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  statusInput: {
    padding: "8px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#1e293b",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "all 0.15s ease",
    background: "#ffffff",
  },
  checkboxWrapper: {
    padding: "8px 10px",
    border: "1px solid",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
    textAlign: "center",
    userSelect: "none",
    fontWeight: "600",
    transition: "all 0.15s ease",
  },
  emptyContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "300px",
    padding: "16px",
  },
  emptyContent: {
    textAlign: "center",
    background: "#ffffff",
    padding: "32px",
    borderRadius: "12px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#ffffff",
    border: "none",
    padding: "10px 24px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
    transition: "all 0.2s ease",
  },
  // --- New Styles for Dropdown ---
  field: {
    marginBottom: "0",
    position: "relative",
    width: "100%",
    height: "100%",
  },
  acWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  input: {
    width: "100%",
    minHeight: "36px",
    border: "1px solid transparent",
    padding: "6px 10px",
    paddingRight: "28px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#1e293b",
    outline: "none",
    background: "transparent",
    boxSizing: "border-box",
    transition: "all 0.15s ease",
  },
  acIcon: {
    position: "absolute",
    right: "10px",
    fontSize: "10px",
    pointerEvents: "none",
    color: "#64748b",
  },
  acMenu: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    marginTop: "4px",
    maxHeight: "200px",
    overflowY: "auto",
    overflowX: "visible",
    zIndex: 100000000,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  },
  acItem: (isActive) => ({
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    color: isActive ? "#1e293b" : "#475569",
    background: isActive ? "#f1f5f9" : "#ffffff",
    borderBottom: "1px solid #f1f5f9",
    transition: "all 0.1s ease",
  }),
};

export default OperationsTab;
