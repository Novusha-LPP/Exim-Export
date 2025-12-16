import React, { useState } from "react";
import FileUpload from "../../../gallery/FileUpload";
import ImagePreview from "../../../gallery/ImagePreview";

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
    const newOperations = [...operations];
    if (
      newOperations[activeOpIndex] &&
      newOperations[activeOpIndex][section] &&
      newOperations[activeOpIndex][section][itemIndex]
    ) {
      newOperations[activeOpIndex][section][itemIndex][field] = value;
      formik.setFieldValue("operations", newOperations);
    }
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
          columns={[
            {
              field: "shippingLineName",
              label: "Shipping Line",
              width: "180px",
            },
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
    { field: "goodsRegistrationDate", label: "Goods Reg. Date", type: "date" },
    { field: "rmsLetExportOrderDate", label: "RMS/LEO Date", type: "date" },
    { field: "leoUpload", label: "LEO Uploaded", type: "upload" },
    { field: "stuffingDate", label: "Stuffing Date", type: "date" },
    { field: "stuffingSheetUpload", label: "Stuffing Sheet", type: "upload" },
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
      field: "billingDocsStatus",
      label: "Bill Status",
      type: "select",
      options: ["YES", "NO"],
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
                  : f.field === "stuffingSheetUpload" // Added stuffingSheetUpload logic
                  ? "stuffing_uploads"
                  : "job_handover_images";

              return (
                <div key={f.field} style={styles.statusField}>
                  <label style={styles.statusLabel}>{f.label}</label>
                  <FileUpload
                    bucketPath={bucketPath}
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
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
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
      goodsRegistrationDate: "",
      rmsLetExportOrderDate: "",
      leoUpload: [],
      stuffingDate: "",
      stuffingSheetUpload: [],
      eGatePassCopyDate: "",
      eGatePassUpload: [],
      handoverForwardingNoteDate: "",
      handoverImageUpload: [],
      handoverConcorTharSanganaRailRoadDate: "",
      billingDocsSentDt: "",
      billingDocsStatus: null,
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
};

export default OperationsTab;
