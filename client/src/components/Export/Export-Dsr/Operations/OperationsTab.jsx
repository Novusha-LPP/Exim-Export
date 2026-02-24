import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FileUpload from "../../../gallery/FileUpload";
import ImagePreview from "../../../gallery/ImagePreview";
import zIndex from "@mui/material/styles/zIndex";
import { priorityFilter } from "../../../../utils/filterUtils";

// Helper
const toUpper = (str) => (str ? str.toUpperCase() : "");

const formatDateForInput = (dateVal, type = "date") => {
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
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    }
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateVal;
  }
};

const formatDateForPicker = (dateVal, type = "date") => {
  if (!dateVal) return "";

  // Handle already formatted dd-mm-yyyy strings
  if (typeof dateVal === 'string' && /^\d{2}-\d{2}-\d{4}/.test(dateVal)) {
    const parts = dateVal.split(/[-/]/); // support - or /
    if (parts.length === 3) {
      const [d, m, y] = parts;
      // Return yyyy-MM-dd
      return `${y}-${m}-${d}`;
    }
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
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    return `${year}-${month}-${day}`;
  } catch (e) {
    return dateVal;
  }
};

const containerTypes = [
  "20 ft",
  "40 ft",
];

const cargoTypes = [
  { value: "GEN", label: "General (GEN)" },
  { value: "HAZ", label: "Hazardous (HAZ)" },
  { value: "REF", label: "Reefer (REF)" },
  { value: "ONION", label: "Onion (ONION)" },
  { value: "ODC", label: "ODC" },
];

// Static Port of Loading options
const PORT_OF_LOADING_OPTIONS = [
  { value: "INMUN1 - MUNDRA", label: "Mundra (INMUN1)" },
  { value: "INIXY1 - KANDLA", label: "Kandla (INIXY1)" },
  { value: "INPAV1 - PIPAVAV", label: "Pipavav (INPAV1)" },
  { value: "INHZA1 - HAZIRA", label: "Hazira (INHZA1)" },
  { value: "INNSA1 - NHAVA SHEVA", label: "Nhava Sheva (INNSA1)" },
  { value: "INAMD4 - AHMEDABAD AIR PORT", label: "Ahmedabad Air Port" },
];

const getDefaultItem = (section) => {
  const defaults = {
    transporterDetails: {
      transporterName: "",
      vehicleNo: "",
      noOfPackages: 0,
      grossWeightKgs: 0,
      images: [],
      cartingDate: "",
    },
    containerDetails: {
      containerNo: "",
      containerSize: "",
      containerType: "",
      cargoType: "GEN",
      portOfLoading: "",
      customSealNo: "",
      grossWeight: 0,
      maxGrossWeightKgs: 0,
      vgmWtInvoice: 0,
      tareWeightKgs: 0,
      maxPayloadKgs: 0,
      shippingLineSealNo: "",
      noOfPackages: 0,
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
      emptyPickUpLoc: "",
      emptyDropLoc: "",
      images: [],
      containerPlacementDate: "",
      shippingLineSealNo: "",
    },
    weighmentDetails: {
      containerNo: "",
      weighBridgeName: "",
      regNo: "",
      address: "",
      dateTime: "",
      vehicleNo: "",
      tareWeight: 0,
      images: [],
    },
    statusDetails: {
      gateInDate: "",
      rms: "RMS", // Default
      goodsRegistrationDate: "",
      goodsReportDate: "",
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
    "",
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
        searchVal,
      )}`
      : `${apiBase}/shippingLines/?page=1&location=&status=&search=${encodeURIComponent(
        searchVal,
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
              : [],
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

  const filteredOpts = priorityFilter(d.opts, d.query, (opt) => {
    const code = isAir
      ? opt.alphanumericCode || opt.code || ""
      : opt.shippingLineCode || opt.code || "";
    const name = isAir
      ? opt.airlineName || opt.name || ""
      : opt.shippingName || opt.name || "";
    return `${code} ${name}`;
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
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0) {
                  const originalIndex = indexInOpts(d.active);
                  if (originalIndex >= 0) d.select(originalIndex);
                } else if (filteredOpts.length === 1) {
                  const originalIndex = indexInOpts(0);
                  if (originalIndex >= 0) d.select(originalIndex);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filteredOpts.length - 1, a < 0 ? 0 : a + 1),
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
            document.body,
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
    getNestedValue(formik.values, fieldName) || "",
  );
  const [opts, setOpts] = useState([]);
  const [active, setActive] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const wrapperRef = useRef();
  const menuRef = useRef(); // New ref for the portal menu
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
      searchVal,
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
              : [],
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
        !wrapperRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

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
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [d.open]);

  const filtered = priorityFilter(d.opts, d.query, (p) => {
    const code = p.unece_code || "";
    const name = p.name || "";
    return `${code} ${name}`;
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
            if (e.key === "Tab") {
              if (d.open) {
                if (d.active >= 0) {
                  d.select(d.active);
                } else if (filtered.length === 1) {
                  d.select(0);
                } else {
                  d.setOpen(false);
                }
              }
              const trimmed = d.query.trim();
              if (trimmed !== d.query) {
                const upper = toUpper(trimmed);
                d.setQuery(upper);
                formik.setFieldValue(fieldName, upper);
              }
              return;
            }

            if (!d.open) return;
            if (e.key === "ArrowDown")
              d.setActive((a) =>
                Math.min(filtered.length - 1, a < 0 ? 0 : a + 1),
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
        {d.open &&
          filtered.length > 0 &&
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
              {filtered.map((port, i) => (
                <div
                  key={port._id || port.unece_code || port.name || i}
                  style={styles.acItem(d.active === i)}
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
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}

const OperationsTab = ({ formik }) => {
  const operations = formik.values.operations || [];
  const [activeOpIndex, setActiveOpIndex] = useState(0);

  // Guard ref to prevent infinite ping-pong between sync phases
  const syncingRef = useRef(false);

  // Flags for mode detection
  const transportMode = toUpper(formik.values.transportMode || "");
  const isAir = transportMode === "AIR";
  const stuffedAt = toUpper(formik.values.goods_stuffed_at || "");
  const consignmentType = toUpper(formik.values.consignmentType || "");
  const isDock = stuffedAt === "DOCK" || stuffedAt === "DOCKS";
  const isLCL = consignmentType === "LCL";
  const isDockLCL = isDock && isLCL;
  const isFCL = consignmentType === "FCL";

  // Ensure at least one operation exists - but only once the form is truly ready
  useEffect(() => {
    if (formik.values.job_no && operations.length === 0) {
      const customHouse = formik.values.custom_house || "";

      const statusDefaults = { ...getDefaultItem("statusDetails") };
      if (consignmentType !== "FCL") {
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

  // Sync ICD Port with Custom House
  useEffect(() => {
    const customHouse = toUpper(formik.values.custom_house || "");
    if (!customHouse) return;

    let changed = false;
    const updatedOps = operations.map((op) => {
      const statusDetails = op.statusDetails || [];
      const updatedStatus = statusDetails.map((s) => {
        if (toUpper(s.icdPort || "") !== customHouse) {
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
  }, [formik.values.custom_house, operations.length]);

  // Sync Port Of Loading between Header and Operations
  useEffect(() => {
    const headerPol = toUpper(formik.values.port_of_loading || "");
    // Propagate header POL to all containers in all operations
    let polChanged = false;
    const nextOps = operations.map((op) => {
      const containerDetails = op.containerDetails || [];
      let opPolChanged = false;
      const updatedCD = containerDetails.map((cd) => {
        if (toUpper(cd.portOfLoading) !== headerPol) {
          polChanged = true;
          opPolChanged = true;
          return { ...cd, portOfLoading: headerPol };
        }
        return cd;
      });
      if (opPolChanged) return { ...op, containerDetails: updatedCD };
      return op;
    });

    if (polChanged) {
      formik.setFieldValue("operations", nextOps);
    }
  }, [formik.values.port_of_loading]);

  // Auto-select Ahmedabad Air Port when transport mode is AIR
  useEffect(() => {
    if (isAir) {
      const ahmedabadPort = "INAMD4 - AHMEDABAD AIR PORT";
      if (toUpper(formik.values.port_of_loading || "") !== ahmedabadPort) {
        formik.setFieldValue("port_of_loading", ahmedabadPort);
      }
    }
  }, [isAir]);

  // Auto-sync Shipping Line from job header to booking details
  useEffect(() => {
    const jobShippingLine = toUpper(formik.values.shipping_line_airline || "");
    if (!jobShippingLine) return;

    const currentOps = formik.values.operations || [];
    let changed = false;
    const nextOps = currentOps.map((op) => {
      const bookingDetails = op.bookingDetails || [];
      const updatedBooking = bookingDetails.map((b) => {
        if (toUpper(b.shippingLineName || "") !== jobShippingLine) {
          changed = true;
          return { ...b, shippingLineName: jobShippingLine };
        }
        return b;
      });
      if (changed) return { ...op, bookingDetails: updatedBooking };
      return op;
    });
    if (changed) {
      formik.setFieldValue("operations", nextOps);
    }
  }, [formik.values.shipping_line_airline, formik.values.job_no, operations.length]);

  // 1. Collect all unique container numbers from ALL sections of ALL operations
  const allOpContainersSet = new Set();
  operations.forEach((op) => {
    ["transporterDetails", "containerDetails"].forEach(
      (sec) => {
        (op[sec] || []).forEach((item) => {
          if (item.containerNo && item.containerNo.trim()) {
            allOpContainersSet.add(item.containerNo.trim().toUpperCase());
          }
        });
      },
    );
  });
  const opContainerNos = Array.from(allOpContainersSet);

  // 2. Get master list container numbers
  const masterContainers = formik.values.containers || [];
  const masterContainerNos = masterContainers.map((c) =>
    (c.containerNo || "").toUpperCase(),
  );

  // 3. Check Sync Status
  const isSynced =
    opContainerNos.length === masterContainerNos.length &&
    opContainerNos.every((no) => masterContainerNos.includes(no));

  const syncStatus = isSynced ? "Synced" : "Out of Sync";

  // 4. Auto-sync Effect: Keeps operations consistent and updates the main containers array
  // Stable serialized key for container numbers (prevents dependency reference changes)
  const masterContainerKey = JSON.stringify(
    (formik.values.containers || []).map(c => (c.containerNo || "").trim().toUpperCase())
  );
  const opsContainerKey = JSON.stringify(
    operations.map(op => (op.containerDetails || []).map(d => (d.containerNo || "").trim().toUpperCase()))
  );

  useEffect(() => {
    // SECURITY: Do not run sync logic if the form hasn't loaded its job data yet.
    // This prevents wiping container lists during the initial render "flicker".
    if (!formik.values.job_no || operations.length === 0) return;
    if (syncingRef.current) return;

    // Phase A: Intra-operation Sync (Propagate Unique Containers across sections)
    let opsModified = false;
    const nextOperations = operations.map((op) => {
      // If Dock LCL, we DO NOT sync anything between sections.
      if (isDockLCL) {
        return op;
      }

      let opIsDirty = false;
      const syncedOp = { ...op };

      // 1. Sync containerDetails and weighmentDetails by index (Strict Mirror)
      if (!isAir && !isDockLCL) {
        const cDet = [...(syncedOp.containerDetails || [])];
        const wDet = [...(syncedOp.weighmentDetails || [])];
        const maxLen = Math.max(cDet.length, wDet.length);

        // Ensure both arrays have at least one row if they are expected
        const finalLen = maxLen === 0 ? 1 : maxLen;

        while (cDet.length < finalLen) {
          cDet.push(getDefaultItem("containerDetails"));
          opIsDirty = true;
        }
        while (wDet.length < finalLen) {
          wDet.push(getDefaultItem("weighmentDetails"));
          opIsDirty = true;
        }

        // Mirror containerNumber by index
        for (let i = 0; i < finalLen; i++) {
          const cNo = (cDet[i].containerNo || "").trim().toUpperCase();
          const wNo = (wDet[i].containerNo || "").trim().toUpperCase();

          if (cNo !== wNo) {
            // Priority: Take whichever is non-empty. If both non-empty, cNo wins.
            const targetNo = cNo || wNo;
            if (cDet[i].containerNo !== targetNo) cDet[i].containerNo = targetNo;
            if (wDet[i].containerNo !== targetNo) wDet[i].containerNo = targetNo;
            opIsDirty = true;
          }
        }
        syncedOp.containerDetails = cDet;
        syncedOp.weighmentDetails = wDet;
      }

      if (opIsDirty) opsModified = true;
      return syncedOp;
    });

    if (opsModified && JSON.stringify(operations) !== JSON.stringify(nextOperations)) {
      syncingRef.current = true;
      formik.setFieldValue("operations", nextOperations);
      setTimeout(() => { syncingRef.current = false; }, 100);
      return; // Exit and wait for next render cycle
    }

    // Build a map of container details from transporterDetails to sync to master containers
    const containerDetailsMap = new Map();

    operations.forEach((op) => {
      (op.transporterDetails || []).forEach((item) => {
        // Container No removed from Transporter Details, so we don't map packages to containers here
      });

      // Also grab grossWeight, tareWeightKgs and shippingLineSealNo from containerDetails
      (op.containerDetails || []).forEach((item) => {
        if (item.containerNo) {
          const cNo = item.containerNo.trim().toUpperCase();

          // Ensure entry exists (it might not if not in transporterDetails)
          if (!containerDetailsMap.has(cNo)) {
            containerDetailsMap.set(cNo, {
              grossWeight: 0,
              maxGrossWeight: 0,
              netWeight: 0,
              noOfPackages: 0,
              tareWeightKgs: 0,
              vgmWtInvoice: 0,
              shippingLineSealNo: "",
              customSealNo: "",
              maxPayloadKgs: 0,
              containerSize: ""
            });
          }

          const info = containerDetailsMap.get(cNo);

          // Sync Container-specific fields from containerDetails
          // Alignment:
          // Operations.grossWeight -> Master.grossWeight (Cargo)
          // Operations.maxGrossWeightKgs -> Master.maxGrossWeightKgs (Capacity)
          if (item.grossWeight !== undefined)
            info.grossWeight = Number(item.grossWeight || 0);
          if (item.maxGrossWeightKgs !== undefined)
            info.maxGrossWeightKgs = Number(item.maxGrossWeightKgs || 0);
          if (item.vgmWtInvoice !== undefined)
            info.vgmWtInvoice = Number(item.vgmWtInvoice || 0);
          if (item.tareWeightKgs !== undefined)
            info.tareWeightKgs = Number(item.tareWeightKgs || 0);
          if (item.shippingLineSealNo)
            info.shippingLineSealNo = item.shippingLineSealNo;
          if (item.noOfPackages)
            info.noOfPackages = Number(item.noOfPackages || 0);
          if (item.netWeight)
            info.netWeight = Number(item.netWeight || 0);

          // Note: Global Gross Weight AND Packages sync to shipment header removed to prevent overwriting manual entry

          if (item.maxPayloadKgs)
            info.maxPayloadKgs = Number(item.maxPayloadKgs || 0);
          if (item.containerSize)
            info.containerSize = item.containerSize;
          if (item.customSealNo)
            info.customSealNo = item.customSealNo;
        }
      });
    });

    // Phase C: Master Containers Sync (Updates formik.values.containers)
    // IMPORTANT: Master (ContainerTab) is the SOURCE OF TRUTH for which containers exist.
    // Phase C may only UPDATE field values on existing master containers — NEVER add new ones.
    // Adding containers from Operations is handled by the user explicitly in ContainerTab.
    if (!isAir) {
      const currentMaster = formik.values.containers || [];
      let masterChanged = false;

      const nextContainers = currentMaster.map(m => {
        const mNo = (m.containerNo || "").trim().toUpperCase();
        if (!mNo) return m;

        const opInfo = containerDetailsMap.get(mNo);
        if (!opInfo) return m;

        // Only sync field values — don't change which containers exist
        const grossChanged = Number(m.grossWeight || 0) !== opInfo.grossWeight;
        const maxGrossChanged = Number(m.maxGrossWeightKgs || 0) !== opInfo.maxGrossWeightKgs;
        const vgmChanged = Number(m.vgmWtInvoice || 0) !== opInfo.vgmWtInvoice;
        const tareChanged = Number(m.tareWeightKgs || 0) !== opInfo.tareWeightKgs;
        const sealChanged = (m.shippingLineSealNo || "") !== (opInfo.shippingLineSealNo || "");
        const payloadChanged = Number(m.maxPayloadKgs || 0) !== (opInfo.maxPayloadKgs || 0);
        const sealNoChanged = (m.sealNo || "") !== (opInfo.customSealNo || "");
        const typeChanged = (m.type || "") !== (opInfo.containerSize || "");
        const pkgsChanged = opInfo.noOfPackages > 0 && Number(m.pkgsStuffed || 0) !== opInfo.noOfPackages;
        const netChanged = opInfo.netWeight > 0 && Number(m.netWeight || 0) !== opInfo.netWeight;

        if (grossChanged || maxGrossChanged || vgmChanged || tareChanged || sealChanged || payloadChanged || sealNoChanged || typeChanged || pkgsChanged || netChanged) {
          masterChanged = true;
          return {
            ...m,
            grossWeight: grossChanged ? opInfo.grossWeight : m.grossWeight,
            maxGrossWeightKgs: maxGrossChanged ? opInfo.maxGrossWeightKgs : m.maxGrossWeightKgs,
            vgmWtInvoice: vgmChanged ? opInfo.vgmWtInvoice : m.vgmWtInvoice,
            tareWeightKgs: tareChanged ? opInfo.tareWeightKgs : m.tareWeightKgs,
            shippingLineSealNo: sealChanged ? (opInfo.shippingLineSealNo || m.shippingLineSealNo || "") : m.shippingLineSealNo,
            sealNo: sealNoChanged ? (opInfo.customSealNo || m.sealNo || "") : m.sealNo,
            maxPayloadKgs: payloadChanged ? opInfo.maxPayloadKgs : m.maxPayloadKgs,
            type: typeChanged ? (opInfo.containerSize || m.type || "") : m.type,
            pkgsStuffed: pkgsChanged ? opInfo.noOfPackages : m.pkgsStuffed,
            netWeight: netChanged ? opInfo.netWeight : m.netWeight,
          };
        }
        return m;
      });

      if (masterChanged && JSON.stringify(currentMaster) !== JSON.stringify(nextContainers)) {
        syncingRef.current = true;
        formik.setFieldValue("containers", nextContainers);
        setTimeout(() => { syncingRef.current = false; }, 100);
      }
    }
  }, [opsContainerKey]); // Stable serialized key prevents reference-change loops

  // Phase D: Master -> Operations Sync (Syncs newly added containers from ContainerTab to Operations)
  useEffect(() => {
    if (!formik.values.job_no || operations.length === 0 || isAir) return;
    if (syncingRef.current) return;

    const masterContainers = formik.values.containers || [];
    let opsChanged = false;

    const nextOperations = operations.map(op => {
      if (isDockLCL) return op;

      const syncedOp = { ...op };
      let opIsDirty = false;

      const sectionsToUpdate = ["containerDetails", "weighmentDetails"];

      sectionsToUpdate.forEach(secName => {
        const currentArr = [...(syncedOp[secName] || [])];
        let sectionDirty = false;

        // 1. Match length with Master
        while (currentArr.length < masterContainers.length) {
          currentArr.push(getDefaultItem(secName));
          sectionDirty = true;
        }
        // Strict truncating sync (allows deleting the last container row safely)
        if (currentArr.length > masterContainers.length) {
          currentArr.length = masterContainers.length;
          sectionDirty = true;
        }

        // 2. Sync values from Master by index
        masterContainers.forEach((m, idx) => {
          if (idx >= currentArr.length) return;
          const d = currentArr[idx];
          const mNo = (m.containerNo || "").trim().toUpperCase();

          // Sync Container Number
          if ((d.containerNo || "").trim().toUpperCase() !== mNo) {
            currentArr[idx] = { ...currentArr[idx], containerNo: mNo };
            sectionDirty = true;
          }

          // Sync other fields back to operations for existing containers
          if (secName === "containerDetails" && mNo) {
            const row = currentArr[idx];
            if (
              Number(row.grossWeight || 0) !== Number(m.grossWeight || 0) ||
              Number(row.maxGrossWeightKgs || 0) !== Number(m.maxGrossWeightKgs || 0) ||
              Number(row.tareWeightKgs || 0) !== Number(m.tareWeightKgs || 0) ||
              Number(row.noOfPackages || 0) !== Number(m.pkgsStuffed || 0) ||
              (row.containerSize || "") !== (m.type || "") ||
              (row.shippingLineSealNo || "") !== (m.shippingLineSealNo || "") ||
              (row.customSealNo || "") !== (m.sealNo || "")
            ) {
              currentArr[idx] = {
                ...row,
                grossWeight: Number(m.grossWeight || 0),
                maxGrossWeightKgs: Number(m.maxGrossWeightKgs || 0),
                tareWeightKgs: Number(m.tareWeightKgs || 0),
                noOfPackages: Number(m.pkgsStuffed || 0),
                maxPayloadKgs: Number(m.maxGrossWeightKgs || 0) - Number(m.tareWeightKgs || 0),
                vgmWtInvoice: Number(m.grossWeight || 0) + Number(m.tareWeightKgs || 0),
                containerSize: m.type || "",
                shippingLineSealNo: m.shippingLineSealNo || "",
                customSealNo: m.sealNo || ""
              };
              sectionDirty = true;
            }
          }
        });

        if (sectionDirty) {
          syncedOp[secName] = currentArr;
          opIsDirty = true;
        }
      });

      if (opIsDirty) opsChanged = true;
      return syncedOp;
    });

    if (opsChanged && JSON.stringify(operations) !== JSON.stringify(nextOperations)) {
      syncingRef.current = true;
      formik.setFieldValue("operations", nextOperations);
      setTimeout(() => { syncingRef.current = false; }, 100);
    }

  }, [masterContainerKey]); // Stable serialized key prevents reference-change loops

  // Auto-fill Transporter Gross Weight & Packages from Job Header
  // DEPENDENCY NOTE: We intentionally exclude 'operations' to prevent reverting user deletions
  // Auto-fill Transporter Gross Weight & Packages from Job Header removed as requested
  // sync logic for shipment header fields has been disabled.

  // --- Actions ---

  const addOperation = () => {
    const transportMode = toUpper(formik.values.transportMode || "");
    const isAir = transportMode === "AIR";
    const customHouse = formik.values.custom_house || "";

    const statusDefaults = { ...getDefaultItem("statusDetails") };
    if (toUpper(formik.values.consignmentType || "") !== "FCL") {
      statusDefaults.icdPort = toUpper(customHouse);
    }

    const tDefaults = getDefaultItem("transporterDetails");
    // Pre-filling from header removed as requested in new operations too

    const newOp = {
      transporterDetails: [tDefaults],
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
        section,
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
        ["containerDetails", "weighmentDetails"].forEach(
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
          },
        );
      }

      // Auto-calculate Max Payload if Max Gross Weight or Tare Weight changes in Container Details
      if (section === "containerDetails" && (field === "maxGrossWeightKgs" || field === "tareWeightKgs")) {
        updatedOp[section] = updatedOp[section].map((item, idx) => {
          if (idx !== itemIndex) return item;
          const capacity = field === "maxGrossWeightKgs" ? Number(finalValue || 0) : Number(item.maxGrossWeightKgs || 0);
          const tare = field === "tareWeightKgs" ? Number(finalValue || 0) : Number(item.tareWeightKgs || 0);
          const payload = capacity - tare;
          return { ...item, maxPayloadKgs: payload };
        });
      }

      // Auto-calculate VGM Wt. (invoice) = grossWeight (Cargo) + tareWeightKgs
      if (section === "containerDetails" && (field === "grossWeight" || field === "tareWeightKgs")) {
        updatedOp[section] = updatedOp[section].map((item, idx) => {
          if (idx !== itemIndex) return item;
          const cargoWeight = field === "grossWeight" ? Number(finalValue || 0) : Number(item.grossWeight || 0);
          const tare = field === "tareWeightKgs" ? Number(finalValue || 0) : Number(item.tareWeightKgs || 0);
          return { ...item, vgmWtInvoice: cargoWeight + tare };
        });
      }

      // SYNC: Port Of Loading with Header
      if (section === "containerDetails" && field === "portOfLoading") {
        formik.setFieldValue("port_of_loading", finalValue);
      }

      return updatedOp;
    });

    formik.setFieldValue("operations", newOperations);

    // AUTO-SYNC: When billing date is set, update detailedStatus and milestones
    if (section === "statusDetails" && field === "billingDocsSentDt" && value) {
      // 1. Set "Billing Pending" to detailedStatus if not already present
      const currentStatus = formik.values.detailedStatus;
      if (currentStatus !== "Billing Pending") {
        formik.setFieldValue("detailedStatus", "Billing Pending");
      }

      // 2. Update the "Billing Pending" milestone
      const milestones = formik.values.milestones || [];
      const billingIdx = milestones.findIndex((m) => m.milestoneName === "Billing Pending");
      if (billingIdx !== -1) {
        // Convert the date to dd-mm-yyyy format for milestone
        let milestoneDate = value;
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
          const [y, m, d] = value.split("-");
          milestoneDate = `${d}-${m}-${y}`;
        }
        const updatedMilestones = [...milestones];
        updatedMilestones[billingIdx] = {
          ...updatedMilestones[billingIdx],
          actualDate: milestoneDate,
          isCompleted: true,
          isMandatory: true,
        };
        formik.setFieldValue("milestones", updatedMilestones);
      }
    }

    // If billing date is cleared, remove "Billing Pending" from detailedStatus and reset milestone
    if (section === "statusDetails" && field === "billingDocsSentDt" && !value) {
      const currentStatus = formik.values.detailedStatus;
      if (currentStatus === "Billing Pending") {
        formik.setFieldValue("detailedStatus", "");
      }

      const milestones = formik.values.milestones || [];
      const billingIdx = milestones.findIndex((m) => m.milestoneName === "Billing Pending");
      if (billingIdx !== -1) {
        const updatedMilestones = [...milestones];
        updatedMilestones[billingIdx] = {
          ...updatedMilestones[billingIdx],
          actualDate: "",
          isCompleted: false,
        };
        formik.setFieldValue("milestones", updatedMilestones);
      }
    }
  };

  const addItem = (section) => {
    const newOperations = [...operations];
    const op = { ...newOperations[activeOpIndex] };
    if (!op) return;

    const newItem = getDefaultItem(section);
    // Pre-filling from header removed as requested
    op[section] = [...(op[section] || []), newItem];

    newOperations[activeOpIndex] = op;
    formik.setFieldValue("operations", newOperations);
  };

  const deleteItem = (section, itemIndex) => {
    const newOperations = [...operations];
    const op = { ...newOperations[activeOpIndex] };
    if (!op) return;

    // Get the container number being deleted (for syncing to master)
    const deletedRow = (op[section] || [])[itemIndex];
    const deletedNo = (deletedRow?.containerNo || "").trim().toUpperCase();

    op[section] = (op[section] || []).filter((_, i) => i !== itemIndex);

    // If deleting from containerDetails or weighmentDetails, also delete from the mirror section
    if (section === "containerDetails") {
      op.weighmentDetails = (op.weighmentDetails || []).filter((_, i) => i !== itemIndex);
    } else if (section === "weighmentDetails") {
      op.containerDetails = (op.containerDetails || []).filter((_, i) => i !== itemIndex);
    }

    newOperations[activeOpIndex] = op;
    syncingRef.current = true;
    formik.setFieldValue("operations", newOperations);

    // Also remove from master containers list so Phase D doesn't re-add it
    if ((section === "containerDetails" || section === "weighmentDetails") && deletedNo) {
      const masterContainers = formik.values.containers || [];
      const nextMaster = masterContainers.filter(
        c => (c.containerNo || "").trim().toUpperCase() !== deletedNo
      );
      if (nextMaster.length !== masterContainers.length) {
        nextMaster.forEach((c, i) => { c.serialNumber = i + 1; });
        formik.setFieldValue("containers", nextMaster);
      }
    }

    setTimeout(() => { syncingRef.current = false; }, 150);
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
        {
          field: "noOfPackages",
          label: "Packages",
          type: "number",
          width: "80px",
        },
        {
          field: "grossWeightKgs",
          label: "Cargo Wt (KG)",
          type: "number",
          width: "100px",
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
      defaultOpen={false}
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
          field: "noOfPackages",
          label: "Packages",
          type: "number",
          width: "100px",
        },
        {
          field: "shippingLineSealNo",
          label: "S/Line Seal No",
          width: "140px",
        },
        {
          field: "customSealNo",
          label: "Custom Seal No",
          width: "140px",
        },
        { field: "containerSize", label: "Size (FT)", width: "160px", type: "select", options: containerTypes },
        { field: "cargoType", label: "Cargo Type", width: "120px", type: "select", options: cargoTypes },
        { field: "portOfLoading", label: "Port Of Loading", width: "170px", type: "select", options: PORT_OF_LOADING_OPTIONS },
        {
          field: "maxGrossWeightKgs",
          label: "Max GW",
          type: "number",
          width: "100px",
        },
        {
          field: "grossWeight",
          label: "Gw",
          type: "number",
          width: "100px",
        },
        {
          field: "tareWeightKgs",
          label: "Tare Wt",
          type: "number",
          width: "100px",
        },
        {
          field: "vgmWtInvoice",
          label: "VGM Wt. (invoice)",
          type: "number",
          width: "110px",
          readOnly: true,
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
      defaultOpen={false}
    />
  );

  const bookingSection = !isAir && !isLCL && (
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
          label: "Date",
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
          field: "emptyPickUpLoc",
          label: "Pickup Loc.",
          width: "140px",
        },
        !isAir && {
          field: "emptyDropLoc",
          label: "Drop Loc.",
          width: "140px",
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
      defaultOpen={false}
    />
  );

  const weighmentSection = !isAir && !isLCL && (
    <TableSection
      title="Weighment Details"
      data={activeOperation.weighmentDetails || []}
      formik={formik}
      activeOpIndex={activeOpIndex}
      columns={[
        { field: "containerNo", label: "Container No.", width: "140px" },
        { field: "regNo", label: "Reg No/Slip No", width: "140px" },
        {
          field: "weighBridgeName",
          label: "Weighbridge Name",
          width: "180px",
        },
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
        {
          field: "tareWeight",
          label: "VGM WT (KG)",
          type: "number",
          width: "110px",
          showVgmDiff: true,
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
      defaultOpen={false}
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
      defaultOpen={false}
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
  } else if (isFCL) {
    // FCL Order (Dock or Factory): Carting/Transport -> Status -> Booking -> Container -> Weighment
    renderedContent = (
      <>
        {transporterSection}
        {statusSection}
        {bookingSection}
        {containerSection}
        {weighmentSection}
      </>
    );
  } else {
    // Standard Order (e.g. Air, Other): Transporter -> Container -> Booking -> Weighment -> Status
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
  defaultOpen = false,
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
                                  updatedList,
                                );
                              }}
                            />
                            <ImagePreview
                              images={item[col.field] || []}
                              readOnly={false}
                              onDeleteImage={(deleteIndex) => {
                                const currentImages = item[col.field] || [];
                                const updatedList = currentImages.filter(
                                  (_, i) => i !== deleteIndex,
                                );
                                onUpdate(
                                  section,
                                  rowIdx,
                                  col.field,
                                  updatedList,
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
                                e.target.value,
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
                          <div style={{ position: "relative", width: "100%" }}>
                            <input
                              type={
                                col.type === "date" ||
                                  col.type === "datetime-local"
                                  ? "text"
                                  : col.type || "text"
                              }
                              value={
                                item[col.field] === undefined ||
                                  item[col.field] === null ||
                                  (col.type === "number" &&
                                    Number(item[col.field] || 0) === 0)
                                  ? ""
                                  : col.type === "date" ||
                                    col.type === "datetime-local"
                                    ? formatDateForInput(
                                      item[col.field],
                                      col.type,
                                    )
                                    : item[col.field]
                              }
                              placeholder={
                                col.type === "number"
                                  ? "0.00"
                                  : col.placeholder ||
                                  (col.type === "date" ? "dd-mm-yyyy" : "")
                              }
                              readOnly={!!col.readOnly}
                              disabled={!!col.readOnly}
                              onChange={(e) => {
                                if (col.readOnly) return;
                                // Fix: Immediate switch back to text mode to show formatted date
                                if (col.type === "date" || col.type === "datetime-local") {
                                  e.target.type = "text";
                                }
                                onUpdate(
                                  section,
                                  rowIdx,
                                  col.field,
                                  col.type === "number"
                                    ? e.target.value === ""
                                      ? 0
                                      : e.target.value
                                    : e.target.value,
                                );
                              }}
                              onDoubleClick={(e) => {
                                if (col.readOnly) return;
                                if (
                                  col.type === "date" ||
                                  col.type === "datetime-local"
                                ) {
                                  const pickerVal = formatDateForPicker(
                                    item[col.field],
                                    col.type,
                                  );
                                  if (pickerVal) e.target.value = pickerVal;
                                  e.target.type = col.type;
                                  // Use setTimeout to ensure type change is processed before showPicker
                                  setTimeout(() => {
                                    if (e.target.showPicker) e.target.showPicker();
                                  }, 10);
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
                                if (col.readOnly) return;
                                // Auto-fill logic from header removed as requested
                              }}
                              step={col.type === "datetime-local" ? "60" : undefined}
                              style={{
                                ...styles.cellInput,
                                ...(col.readOnly ? { backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" } : {}),
                                ...(col.showVgmDiff && (() => {
                                  const vgmInv = Number(formik.values.operations[activeOpIndex]
                                    ?.containerDetails?.[rowIdx]?.vgmWtInvoice || 0);
                                  const vgmWt = Number(item.tareWeight || 0);
                                  if (vgmInv > 0 && vgmWt > 0 && vgmInv !== vgmWt) {
                                    return { border: "2px solid #ef4444" };
                                  }
                                  return {};
                                })()),
                              }}
                              title={
                                col.showVgmDiff ? (() => {
                                  const vgmInv = Number(formik.values.operations[activeOpIndex]
                                    ?.containerDetails?.[rowIdx]?.vgmWtInvoice || 0);
                                  const vgmWt = Number(item.tareWeight || 0);
                                  if (vgmInv > 0 && vgmWt > 0 && vgmInv !== vgmWt) {
                                    const diff = vgmWt - vgmInv;
                                    return `Difference: ${diff > 0 ? "+" : ""}${diff.toFixed(2)} KG from VGM Wt. (invoice)`;
                                  }
                                  return "";
                                })() : ""
                              }
                            />
                            {/* Show VGM weight difference indicator */}
                            {col.showVgmDiff && (() => {
                              const vgmInv = Number(formik.values.operations[activeOpIndex]
                                ?.containerDetails?.[rowIdx]?.vgmWtInvoice || 0);
                              const vgmWt = Number(item.tareWeight || 0);
                              if (vgmInv > 0 && vgmWt > 0 && vgmInv !== vgmWt) {
                                const diff = vgmWt - vgmInv;
                                return (
                                  <span style={{
                                    position: "absolute",
                                    bottom: "-14px",
                                    left: "4px",
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    color: "#ef4444",
                                    whiteSpace: "nowrap",
                                  }}>
                                    Diff: {diff > 0 ? "+" : ""}{diff.toFixed(2)} KG
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
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
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const displayData =
    data && data.length > 0 ? data : [getDefaultItem(section)];

  const row1Fields = [
    {
      field: "gateInDate",
      label: "Gate-In/Carting",
      type: "date",
      width: 1,
    },
    {
      field: "rms",
      label: "RMS Status",
      type: "select",
      options: ["RMS", "Assessment"],
      width: 1,
    },
    {
      field: "goodsRegistrationDate",
      label: "Goods Registration",
      type: "date",
      width: 1,
    },
    {
      field: "goodsReportDate",
      label: "Goods Report",
      type: "date",
      width: 1,
    },
    { field: "leoDate", label: "LEO", type: "date", width: 1 },
    { field: "leoUpload", label: "LEO Copy", type: "upload", width: 1 },
    {
      field: "icdPort",
      label: "ICD/Port",
      type: "text",
      width: 1,
      readOnly: true,
    },
  ].filter((f) => !f.hidden);

  const row2Fields = [
    {
      field: "containerPlacementDate",
      label: "container placement",
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
    {
      field: "handoverForwardingNoteDate",
      label: "Handover doc",
      type: "date",
      width: 1,
    },
  ].filter((f) => !f.hidden);

  const row3Fields = [
    {
      field: "handoverImageUpload",
      label: "Handover Copy",
      type: "upload",
      width: 1,
      hidden: isAir,
    },
    {
      field: "forwarderName",
      label: "Forwarder",
      type: "text",
      width: 1,
    },
    {
      field: "dispatchDetails",
      label: "Dispatch Tracking",
      type: "dispatch",
      width: 2,
      hidden: isAir,
    },
    {
      field: "railOutReachedDate",
      label: "Rail Reached",
      type: "date",
      width: 1,
      hidden: isAir,
    },
    {
      field: "billingDocsSentDt",
      label: "Billing",
      type: "date",
      width: 1,
      disabledFn: (item) => !(item.billingDocsSentUpload && item.billingDocsSentUpload.length > 0),
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
  const r3Cols = row3Fields.reduce((sum, f) => sum + (f.width || 1), 0);

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
              (_, i) => i !== deleteIndex,
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
            Rail out
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
            Road out
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
                        e.target.checked ? "private" : "concor",
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
                      e.target.value.toUpperCase(),
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
              "date",
            )}
            onDoubleClick={(e) => {
              const pickerVal = formatDateForPicker(
                item.handoverConcorTharSanganaRailRoadDate,
                "date",
              );
              if (pickerVal) e.target.value = pickerVal;
              e.target.type = "date";
              e.target.showPicker && e.target.showPicker();
            }}
            onBlur={(e) => (e.target.type = "text")}
            onChange={(e) => {
              e.target.type = "text"; // Fix: Switch back to text immediately
              onUpdate(
                section,
                rowIdx,
                "handoverConcorTharSanganaRailRoadDate",
                e.target.value,
              );
            }}
            style={{
              ...styles.cellInput,
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              height: "28px",
              minHeight: "28px",
              width: "100px",
            }}
            placeholder="dd-mm-yyyy"
          />
        </div>
      </div>
    ) : (() => {
      const isFieldDisabled = f.disabledFn ? f.disabledFn(item) : (f.readOnly || false);
      return (
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
          disabled={isFieldDisabled}
          onChange={(e) => {
            if (isFieldDisabled) return;
            // Fix: Immediate switch back to text mode to show formatted date
            if (f.type === "date" || f.type === "datetime-local") {
              e.target.type = "text";
            }
            onUpdate(section, rowIdx, f.field, e.target.value);
          }}
          onDoubleClick={(e) => {
            if (isFieldDisabled) return;
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
          style={{
            ...styles.cellInput,
            ...(isFieldDisabled
              ? { backgroundColor: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" }
              : {}),
          }}
          placeholder={f.type === "date" ? "dd-mm-yyyy" : ""}
          title={isFieldDisabled ? "Upload Bill Doc Copy first to enable this field" : ""}
        />
      );
    })();
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
                  borderRadius: "0",
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

              {/* Row 3 Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${r3Cols}, 1fr)`,
                  border: "1px solid #e2e8f0",
                  borderTop: "none",
                  borderRadius: "0 0 4px 4px",
                  overflow: "hidden",
                }}
              >
                {/* Headers 3 */}
                {row3Fields.map((f) => (
                  <div
                    key={`h3-${f.field}`}
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
                {/* Data 3 */}
                {row3Fields.map((f) => (
                  <div
                    key={`d3-${f.field}`}
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
          `${apiBase}/gateway-ports/?page=1&status=&type=&search=`,
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
    marginBottom: "10px",
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
