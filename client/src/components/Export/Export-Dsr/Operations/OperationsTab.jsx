import React, { useState, useEffect, useRef } from "react";
import FileUpload from "../../../gallery/FileUpload";
import ImagePreview from "../../../gallery/ImagePreview";

// Helper
const toUpper = (str) => (str ? str.toUpperCase() : "");

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
        !wrapperRef.current.contains(e.target)
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
      }, 100);
    },
  };
}

function ShippingLineDropdownField({ fieldName, formik, placeholder = "" }) {
  const d = useShippingOrAirlineDropdown(fieldName, formik);
  const transportMode = toUpper(formik.values.transportMode || "");
  const isAir = transportMode === "AIR";

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
        {d.open && filteredOpts.length > 0 && (
          <div style={styles.acMenu}>
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
                  onMouseDown={() => {
                    if (originalIndex >= 0) d.select(originalIndex);
                  }}
                  onMouseEnter={() => d.setActive(i)}
                >
                  {code} - {name}
                  {opt.status && (
                    <span
                      style={{ marginLeft: 8, color: "#8ad", fontWeight: 500 }}
                    >
                      ({toUpper(opt.status)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const OperationsTab = ({ formik }) => {
  const operations = formik.values.operations || [];
  const [activeOpIndex, setActiveOpIndex] = useState(0);

  const containerNos = (formik.values.containers || [])
    .map((c) => c.containerNo)
    .filter(Boolean);
  const operationContainerNos = operations
    .map((op) => op.containerDetails?.[0]?.containerNo)
    .filter(Boolean);
  const syncStatus =
    containerNos.length === operationContainerNos.length
      ? "Synced"
      : "Out of Sync";

  // --- Actions ---

  const addOperation = () => {
    const newOp = {
      transporterDetails: [getDefaultItem("transporterDetails")],
      containerDetails: [getDefaultItem("containerDetails")],
      bookingDetails: [getDefaultItem("bookingDetails")],
      weighmentDetails: [getDefaultItem("weighmentDetails")],
      statusDetails: [getDefaultItem("statusDetails")],
    };
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
    // Use formik.values.operations directly to avoid stale closure issues
    const currentOps = formik.values.operations || [];

    const newOperations = currentOps.map((op, opIdx) => {
      if (opIdx !== activeOpIndex) return op;

      // Handle the active operation
      const currentSection = op[section] || [];
      const newSection = currentSection.map((item, itemIdx) => {
        if (itemIdx !== itemIndex) return item;
        return { ...item, [field]: value };
      });

      return { ...op, [section]: newSection };
    });

    formik.setFieldValue("operations", newOperations);
  };

  const addItem = (section) => {
    const newOperations = [...operations];
    if (newOperations[activeOpIndex] && newOperations[activeOpIndex][section]) {
      newOperations[activeOpIndex][section].push(getDefaultItem(section));
      formik.setFieldValue("operations", newOperations);
    }
  };

  const deleteItem = (section, itemIndex) => {
    const newOperations = [...operations];
    if (newOperations[activeOpIndex] && newOperations[activeOpIndex][section]) {
      newOperations[activeOpIndex][section] = newOperations[activeOpIndex][
        section
      ].filter((_, i) => i !== itemIndex);
      formik.setFieldValue("operations", newOperations);
    }
  };

  // --- Render Helpers ---

  if (operations.length === 0) {
    return <EmptyState onAdd={addOperation} />;
  }

  const activeOperation = operations[activeOpIndex];
  // Safety check if activeOpIndex is out of bounds (can happen during deletes)
  if (!activeOperation) {
    if (operations.length > 0) setActiveOpIndex(0);
    return null;
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
      <div style={styles.contentArea}>
        {/* Section: Transporter Details */}
        <TableSection
          title="Transporter Details"
          data={activeOperation.transporterDetails || []}
          formik={formik}
          activeOpIndex={activeOpIndex}
          columns={[
            {
              field: "transporterName",
              label: "Transporter Name",
              width: "180px",
            },
            { field: "vehicleNo", label: "Vehicle No.", width: "120px" },
            { field: "containerNo", label: "Container No.", width: "140px" },
            { field: "driverName", label: "Driver Name", width: "150px" },
            { field: "contactNo", label: "Contact No.", width: "120px" },
            {
              field: "noOfPackages",
              label: "Pkgs",
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
              field: "images",
              label: "Images",
              type: "upload",
              width: "180px",
              bucketPath: "transporter_images",
            },
          ]}
          section="transporterDetails"
          onUpdate={updateField}
          onAdd={addItem}
          onDelete={deleteItem}
        />

        {/* Section: Container Details */}
        <TableSection
          title="Container Details"
          data={activeOperation.containerDetails || []}
          formik={formik}
          activeOpIndex={activeOpIndex}
          columns={[
            { field: "containerNo", label: "Container No.", width: "140px" },
            { field: "containerSize", label: "Size", width: "80px" },
            { field: "containerType", label: "Type", width: "100px" },
            { field: "cargoType", label: "Cargo Type", width: "100px" },
            {
              field: "maxGrossWeightKgs",
              label: "Max Gross",
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
              field: "maxPayloadKgs",
              label: "Max Payload",
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
        />

        {/* Section: Booking Details */}
        <TableSection
          title="Booking Details"
          data={activeOperation.bookingDetails || []}
          formik={formik}
          activeOpIndex={activeOpIndex}
          columns={[
            {
              field: "shippingLineName",
              label: "Shipping Line",
              width: "200px",
              type: "shipping-dropdown",
            },
            { field: "forwarderName", label: "Forwarder Name", width: "150px" },
            { field: "bookingNo", label: "Booking No.", width: "140px" },
            {
              field: "bookingDate",
              label: "Booking Date",
              type: "date",
              width: "130px",
            },
            { field: "vesselName", label: "Vessel Name", width: "150px" },
            { field: "voyageNo", label: "Voyage No.", width: "100px" },
            { field: "portOfLoading", label: "POL", width: "120px" },
            {
              field: "handoverLocation",
              label: "Handover Loc",
              width: "140px",
            },
            {
              field: "validity",
              label: "Validity",
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
          ]}
          section="bookingDetails"
          onUpdate={updateField}
          onAdd={addItem}
          onDelete={deleteItem}
        />

        {/* Section: Weighment Details */}
        <TableSection
          title="Weighment Details"
          data={activeOperation.weighmentDetails || []}
          formik={formik}
          activeOpIndex={activeOpIndex}
          columns={[
            { field: "weighBridgeName", label: "Weigh Bridge", width: "180px" },
            { field: "regNo", label: "Reg No.", width: "120px" },
            {
              field: "dateTime",
              label: "Date/Time",
              type: "datetime-local",
              width: "160px",
            },
            { field: "vehicleNo", label: "Vehicle No.", width: "120px" },
            { field: "containerNo", label: "Container No.", width: "140px" },
            { field: "size", label: "Size", width: "80px" },
            {
              field: "grossWeight",
              label: "Gross",
              type: "number",
              width: "90px",
            },
            {
              field: "tareWeight",
              label: "Tare",
              type: "number",
              width: "90px",
            },
            { field: "netWeight", label: "Net", type: "number", width: "90px" },
          ]}
          section="weighmentDetails"
          onUpdate={updateField}
          onAdd={addItem}
          onDelete={deleteItem}
        />

        {/* Section: Status Details (Special Layout since it has many dates) */}
        <StatusSection
          title="Status Tracking"
          data={activeOperation.statusDetails || []}
          section="statusDetails"
          onUpdate={updateField}
        />
      </div>
    </div>
  );
};

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
}) => {
  return (
    <div style={styles.sectionContainer}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{title}</h3>
      </div>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.field} style={{ ...styles.th, width: col.width }}>
                  {col.label}
                </th>
              ))}
              <th style={{ ...styles.th, width: "60px", textAlign: "center" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((item, rowIdx) => (
              <tr key={rowIdx} style={styles.tr}>
                {columns.map((col) => (
                  <td key={col.field} style={styles.td}>
                    {col.type === "upload" ? (
                      <div style={styles.uploadCell}>
                        <FileUpload
                          bucketPath={col.bucketPath || "general_uploads"}
                          multiple={true}
                          acceptedFileTypes={[".pdf", ".jpg", ".png", ".jpeg"]}
                          onFilesUploaded={(newUrls) => {
                            const currentImages = item[col.field] || [];
                            const updatedList = [...currentImages, ...newUrls];
                            onUpdate(section, rowIdx, col.field, updatedList);
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
                            onUpdate(section, rowIdx, col.field, updatedList);
                          }}
                        />
                      </div>
                    ) : col.type === "shipping-dropdown" ? (
                      <ShippingLineDropdownField
                        fieldName={`operations.${activeOpIndex}.${section}.${rowIdx}.${col.field}`}
                        formik={formik}
                        placeholder={col.placeholder || ""}
                      />
                    ) : (
                      <input
                        type={col.type || "text"}
                        value={
                          item[col.field] === undefined ||
                          item[col.field] === null
                            ? ""
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
                        style={styles.cellInput}
                        placeholder={col.placeholder || ""}
                      />
                    )}
                  </td>
                ))}
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button
                    onClick={() => onDelete(section, rowIdx)}
                    style={styles.rowDeleteBtn}
                    title="Delete Row"
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
    </div>
  );
};

const StatusSection = ({ title, data, section, onUpdate }) => {
  if (!data || !data.length) return null;

  const fields = [
    {
      field: "rms",
      label: "RMS Status",
      type: "select",
      options: ["RMS", "Assessment"],
    },
    {
      field: "goodsRegistrationDate",
      label: "Goods Reg. Date/ Report Date",
      type: "date",
    },
    { field: "leoDate", label: "LEO Date", type: "date" },
    { field: "leoUpload", label: "LEO Uploaded", type: "upload" },
    { field: "stuffingDate", label: "Stuffing Date", type: "date" },
    { field: "stuffingSheetUpload", label: "Stuffing Sheet", type: "upload" },
    { field: "stuffingPhotoUpload", label: "Stuffing Photo", type: "upload" },
    { field: "eGatePassCopyDate", label: "E-Gate Pass Date", type: "date" },
    { field: "eGatePassUpload", label: "E-Gate Pass", type: "upload" },
    {
      field: "handoverForwardingNoteDate",
      label: "H/O Fwd Note Date",
      type: "date",
    },
    { field: "handoverImageUpload", label: "H/O Image", type: "upload" },
    {
      field: "handoverConcorTharSanganaRailRoadDate",
      label: "Rail/Road Date",
      type: "date",
    },
    { field: "billingDocsSentDt", label: "Billing Docs Sent", type: "date" },
    {
      field: "billingDocsSentUpload",
      label: "Billing Docs Sent Image",
      type: "upload",
    },
    {
      field: "billingDocsStatus",
      label: "Bill Status",
      type: "select",
      options: ["Pending", "Completed"],
    },
  ];

  return (
    <div style={styles.sectionContainer}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{title}</h3>
      </div>
      {data.map((item, idx) => (
        <div key={idx} style={styles.statusGrid}>
          {fields.map((f) => {
            if (f.type === "upload") {
              const currentImages = item[f.field] || [];
              const bucketPath =
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
                  : "job_handover_images";

              return (
                <div key={f.field} style={styles.statusField}>
                  <label style={styles.statusLabel}>{f.label}</label>
                  <FileUpload
                    bucketPath={bucketPath}
                    multiple={true}
                    acceptedFileTypes={[".pdf", ".jpg", ".png", ".jpeg"]}
                    onFilesUploaded={(newUrls) => {
                      const updatedList = [...currentImages, ...newUrls];
                      onUpdate(section, idx, f.field, updatedList);
                    }}
                  />
                  <div style={{ marginTop: "4px" }}>
                    <ImagePreview
                      images={currentImages}
                      onDeleteImage={(deleteIndex) => {
                        const updatedList = currentImages.filter(
                          (_, i) => i !== deleteIndex
                        );
                        onUpdate(section, idx, f.field, updatedList);
                      }}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={f.field} style={styles.statusField}>
                <label style={styles.statusLabel}>{f.label}</label>
                {f.type === "checkbox" ? (
                  <div
                    style={{
                      ...styles.checkboxWrapper,
                      background: item[f.field] ? "#f0fdf4" : "#fff",
                      borderColor: item[f.field] ? "#22c55e" : "#cbd5e0",
                      color: item[f.field] ? "#15803d" : "#64748b",
                    }}
                    onClick={() =>
                      onUpdate(section, idx, f.field, !item[f.field])
                    }
                  >
                    {item[f.field] ? "✓ Uploaded" : "Pending"}
                  </div>
                ) : f.type === "select" ? (
                  <select
                    value={item[f.field] || ""}
                    onChange={(e) =>
                      onUpdate(section, idx, f.field, e.target.value)
                    }
                    style={styles.statusInput}
                  >
                    <option value="">Select...</option>
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={item[f.field] || ""}
                    onChange={(e) =>
                      onUpdate(section, idx, f.field, e.target.value)
                    }
                    style={styles.statusInput}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
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
    },
    containerDetails: {
      containerNo: "",
      containerSize: "",
      containerType: "",
      cargoType: "GEN",
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
    },
    weighmentDetails: {
      weighBridgeName: "",
      regNo: "",
      dateTime: "",
      vehicleNo: "",
      containerNo: "",
      size: "",
      grossWeight: 0,
      tareWeight: 0,
      netWeight: 0,
      address: "",
    },
    statusDetails: {
      rms: "RMS", // Default
      goodsRegistrationDate: null,
      leoDate: null,
      leoUpload: [],
      stuffingDate: null,
      stuffingSheetUpload: [],
      stuffingPhotoUpload: [],
      eGatePassCopyDate: null,
      eGatePassUpload: [],
      handoverForwardingNoteDate: null,
      handoverImageUpload: [],
      handoverConcorTharSanganaRailRoadDate: null,
      billingDocsSentDt: null,
      billingDocsSentUpload: [],
      billingDocsStatus: "Pending",
    },
  };
  return defaults[section] || {};
};

// --- Styles ---

const styles = {
  container: {
    fontFamily: "-apple-system, system-ui, sans-serif",
    backgroundColor: "#f1f5f9",
    padding: "16px",
    minHeight: "100%",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    background: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  tabsScroll: {
    display: "flex",
    gap: "6px",
    overflowX: "auto",
    paddingBottom: "2px",
    alignItems: "center",
  },
  opTab: {
    padding: "6px 12px",
    borderRadius: "6px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s",
    userSelect: "none",
  },
  opTabActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
    boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
  },
  opTabText: {
    whiteSpace: "nowrap",
  },
  opTabClose: {
    fontSize: "11px",
    lineHeight: 1,
    padding: "2px 6px",
    borderRadius: "4px",
    marginLeft: "4px",
    background: "rgba(255, 255, 255, 0.2)",
    color: "#fff",
    cursor: "pointer",
  },
  addOpButton: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px dashed #cbd5e1",
    background: "transparent",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#475569",
    background: "#f8fafc",
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  contentArea: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionContainer: {
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  sectionHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "700",
    color: "#040505ff",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sectionFooter: {
    padding: "10px 16px",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  tableWrapper: {
    overflowX: "auto",
    minHeight: "200px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  th: {
    background: "#f1f5f9",
    color: "#040505ff",
    fontWeight: "700",
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "1px solid #e2e8f0",
    borderRight: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  tr: {
    transition: "background 0.1s",
  },
  td: {
    padding: "0",
    borderBottom: "1px solid #e2e8f0",
    borderRight: "1px solid #e2e8f0",
    height: "auto",
    verticalAlign: "top",
  },
  cellInput: {
    width: "100%",
    minHeight: "32px",
    border: "2px solid transparent",
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#1e293b",
    outline: "none",
    background: "transparent",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  uploadCell: {
    padding: "8px",
    minWidth: "160px",
  },
  rowDeleteBtn: {
    background: "transparent",
    color: "#ef4444",
    border: "none",
    fontSize: "11px",
    cursor: "pointer",
    padding: "4px 8px",
    fontWeight: "600",
    opacity: 0.8,
    transition: "opacity 0.2s",
    marginTop: "6px",
  },
  addRowBtn: {
    background: "transparent",
    color: "#2563eb",
    border: "none",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "0",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "16px",
    padding: "16px",
  },
  statusField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statusLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
  },
  statusInput: {
    padding: "6px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: "4px",
    fontSize: "12px",
    color: "#1e293b",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  checkboxWrapper: {
    padding: "6px 10px",
    border: "1px solid",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
    textAlign: "center",
    userSelect: "none",
    fontWeight: "500",
    transition: "all 0.2s",
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
    background: "#fff",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
    transition: "background 0.2s",
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
    minHeight: "32px",
    border: "2px solid transparent",
    padding: "4px 8px",
    paddingRight: "20px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#1e293b",
    outline: "none",
    background: "transparent",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  acIcon: {
    position: "absolute",
    right: "6px",
    fontSize: "10px",
    pointerEvents: "none",
    color: "#64748b",
  },
  acMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    marginTop: "4px",
    maxHeight: "200px",
    overflowY: "auto",
    zIndex: 1000,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  acItem: (isActive) => ({
    padding: "8px 12px",
    fontSize: "12px",
    cursor: "pointer",
    background: isActive ? "#f1f5f9" : "transparent",
    color: "#1e293b",
    borderBottom: "1px solid #f1f5f9",
  }),
};

export default OperationsTab;
