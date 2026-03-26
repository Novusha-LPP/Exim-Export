import React, { useState, useEffect } from "react";
import DateInput from "../../../common/DateInput.js";
import { toUpperVal } from "../Product/commonStyles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faBox, faScaleBalanced } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import FileUpload from "../../../gallery/FileUpload";
import ImagePreview from "../../../gallery/ImagePreview";

const containerTypes = [
  "20 Standard Dry",
  "20 Flat Rack",
  "20 Collapsible Flat Rack",
  "20 Reefer",
  "20 Tank",
  "20 Open Top",
  "20 Hard Top",
  "20 Platform",
  "40 Standard Dry",
  "40 Flat Rack",
  "40 Collapsible Flat Rack",
  "40 Reefer",
  "40 Tank",
  "40 Open Top",
  "40 Hard Top",
  "40 High Cube",
  "40 Reefer High Cube",
  "40 Platform"
];

const isValidContainer = (val) => {
  if (!val) return true;
  const regex = /^[A-Z]{4}\d{7}$/;
  return regex.test(val);
};

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 12,
    color: "#1f2933",
    padding: 12,
    background: "#f5f7fb",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.02)",
  },
  cardTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 13,
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  tableWrapper: {
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    background: "#ffffff",
    marginBottom: 10,
    overflowX: "auto",
    maxHeight: 400,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    fontSize: 11,
    fontWeight: 700,
    color: "#ffffff",
    background: "#16408f",
    padding: "8px 6px",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 10,
    whiteSpace: "nowrap",
    textTransform: 'uppercase'
  },
  td: {
    padding: "6px 6px",
    borderBottom: "1px solid #e0e5f0",
    verticalAlign: "middle",
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 600,
  },
  readOnlyInput: {
    backgroundColor: '#edf2f7',
    border: '1px solid #cbd5e0',
    color: '#4a5568',
  },
  select: {
    width: "100%",
    fontSize: 12,
    padding: "2px 4px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 600,
  },
  btnAction: {
    padding: "4px 10px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #16408f",
    background: "#16408f",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px'
  },
  btnSecondary: {
    background: '#ffffff',
    color: '#16408f',
    border: '1px solid #16408f',
  },
  trashBtn: {
    color: '#e53e3e',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

function ContainerTab({ formik }) {
  const stuffedAt = (formik.values.goods_stuffed_at || "").toUpperCase();
  // const showSLineSeal = stuffedAt === "FACTORY";

  useEffect(() => {
    if (formik.values.job_no && (!formik.values.containers || formik.values.containers.length === 0)) {
      formik.setFieldValue("containers", [{
        serialNumber: 1,
        containerNo: "",
        isValid: true,
        showWarning: false,
        sealNo: "",
        sealDate: "",
        type: "",
        pkgsStuffed: 0,
        grossWeight: 0,
        maxGrossWeightKgs: 0,
        sealType: "RFID",
        shippingLineSealNo: "",
        tareWeightKgs: 0,
        vgmWtInvoice: 0,
        maxPayloadKgs: 0,
        images: [],
        weighBridgeName: "",
        weighmentRegNo: "",
        weighmentDateTime: "",
        weighmentVehicleNo: "",
        weighmentTareWeight: 0, // This is Cargo Tare Wt in DB
        weighmentAddress: "",
        weighmentImages: [],
      }]);
    }
  }, [formik.values.job_no, formik.setFieldValue]);

  // Sync Gross Weight and Pkgs from Shipment Tab if No of Containers is 1
  useEffect(() => {
    const noOfCont = Number(formik.values.no_of_containers || 0);
    const pkgs = Number(formik.values.total_no_of_pkgs || 0);
    const gw = Number(formik.values.gross_weight_kg || 0);

    if (noOfCont === 1 && formik.values.containers && formik.values.containers.length === 1) {
      const container = formik.values.containers[0];
      if (container.pkgsStuffed !== pkgs || container.grossWeight !== gw) {
        const newList = [...formik.values.containers];
        newList[0] = {
          ...newList[0],
          pkgsStuffed: pkgs,
          grossWeight: gw,
          // Recalculate VGM if needed
          vgmWtInvoice: parseFloat((gw + Number(newList[0].tareWeightKgs || 0)).toFixed(3))
        };
        formik.setFieldValue("containers", newList);
      }
    }
  }, [
    formik.values.no_of_containers,
    formik.values.total_no_of_pkgs,
    formik.values.gross_weight_kg,
    formik.setFieldValue
  ]);

  const [timeouts, setTimeouts] = useState({});

  const handleFieldChange = (idx, field, value) => {
    const list = [...(formik.values.containers || [])];
    if (field === "containerNo") {
      const val = value.toUpperCase().trim();
      if (list.some((c, i) => i !== idx && c.containerNo === val && val !== "")) {
        alert(`Duplicate Container: ${val}`);
        return;
      }

      const valid = isValidContainer(val);
      list[idx].isValid = valid;

      // Clear existing timeout for this row
      if (timeouts[idx]) {
        clearTimeout(timeouts[idx]);
      }

      if (!valid && val !== "") {
        // Delay showing warning
        const timer = setTimeout(() => {
          const freshList = [...formik.values.containers];
          if (!isValidContainer(freshList[idx].containerNo)) {
            freshList[idx].showWarning = true;
            formik.setFieldValue("containers", freshList);
          }
        }, 1000);
        setTimeouts(prev => ({ ...prev, [idx]: timer }));
      } else {
        list[idx].showWarning = false;
      }
    }
    list[idx][field] = value;

    const gw = Number(list[idx].grossWeight || 0);
    const tw = Number(list[idx].tareWeightKgs || 0);
    const maxGw = Number(list[idx].maxGrossWeightKgs || 0);

    if (field === "grossWeight" || field === "tareWeightKgs") {
      list[idx].vgmWtInvoice = parseFloat((gw + tw).toFixed(3));
    }
    if (field === "maxGrossWeightKgs" || field === "tareWeightKgs") {
      list[idx].maxPayloadKgs = parseFloat((maxGw - tw).toFixed(3));
    }
    formik.setFieldValue("containers", list);
  };

  const handleAdd = () => {
    const list = [...(formik.values.containers || [])];
    list.push({
      serialNumber: list.length + 1,
      containerNo: "",
      isValid: true,
      showWarning: false,
      sealNo: "",
      sealDate: "",
      type: "",
      pkgsStuffed: 0,
      grossWeight: 0,
      maxGrossWeightKgs: 0,
      sealType: "RFID",
      shippingLineSealNo: "",
      tareWeightKgs: 0,
      vgmWtInvoice: 0,
      maxPayloadKgs: 0,
      images: [],
      weighBridgeName: "",
      weighmentRegNo: "",
      weighmentDateTime: "",
      weighmentVehicleNo: "",
      weighmentTareWeight: 0,
      weighmentAddress: "",
      weighmentImages: [],
    });
    formik.setFieldValue("containers", list);
  };

  const handleDelete = (idx) => {
    if (!window.confirm("Delete record?")) return;
    const list = (formik.values.containers || []).filter((_, i) => i !== idx);
    list.forEach((c, i) => { c.serialNumber = i + 1; });
    formik.setFieldValue("containers", list);
  };

  const rows = formik.values.containers || [];

  const exportToExcel = () => {
    if (!rows.length) return;
    const exportData = rows.map((r, i) => ({
      Sr: i + 1,
      Container: r.containerNo,
      Seal: r.sealNo,
      Date: r.sealDate,
      Type: r.type,
      CargoWt: r.grossWeight,
      TareWt: r.tareWeightKgs,
      VGM: r.vgmWtInvoice
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Containers");
    XLSX.writeFile(wb, `Containers_${formik.values.job_no || 'List'}.xlsx`);
  };

  return (
    <div style={styles.page}>
      {/* SECTION 1: CONTAINER INFO */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={styles.cardTitle}>
            <FontAwesomeIcon icon={faBox} /> CONTAINER DETAILS
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" style={{ ...styles.btnAction, ...styles.btnSecondary }} onClick={exportToExcel}>Export</button>
            <button type="button" style={styles.btnAction} onClick={handleAdd}>+ New Row</button>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40, textAlign: 'center' }}>#</th>
                <th style={{ ...styles.th, width: 140 }}>Container No</th>
                <th style={{ ...styles.th, width: 110 }}>Seal No</th>
                <th style={{ ...styles.th, width: 100 }}>Seal Date</th>
                {/* {showSLineSeal && */}<th style={{ ...styles.th, width: 110 }}>S/L Seal</th>
                <th style={{ ...styles.th, width: 60 }}>Size</th>
                <th style={{ ...styles.th, width: 50 }}>Pkgs</th>
                <th style={{ ...styles.th, width: 85 }}>Gross Wt</th>
                <th style={{ ...styles.th, width: 85 }}>Tare Wt</th>
                <th style={{ ...styles.th, width: 85 }}>Max GW</th>
                <th style={{ ...styles.th, width: 85 }}>Max Payload</th>
                <th style={{ ...styles.th, width: 100 }}>Photos</th>
                <th style={{ ...styles.th, width: 40, textAlign: 'center' }}>Act</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: 20 }}>No containers found.</td>
                </tr>
              )}
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{row.serialNumber}</td>
                  <td style={styles.td}>
                    <div>
                      <input
                        style={styles.input}
                        value={toUpperVal(row.containerNo || "")}
                        onChange={(e) => handleFieldChange(idx, "containerNo", toUpperVal(e.target.value))}
                        placeholder="CONT. NO"
                        maxLength={11}
                      />
                      {row.showWarning && (
                        <div style={{ color: "#e53e3e", fontSize: "9px", marginTop: "2px", fontWeight: "700", lineHeight: "1" }}>
                          Invalid Format (AAAA1234567)
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <input style={styles.input} value={toUpperVal(row.sealNo || "")}
                      onChange={(e) => handleFieldChange(idx, "sealNo", toUpperVal(e.target.value))} placeholder="SEAL ID" />
                  </td>
                  <td style={styles.td}>
                    <DateInput style={styles.input} value={row.sealDate || ""} onChange={(e) => handleFieldChange(idx, "sealDate", e.target.value)} />
                  </td>
                  {/* {showSLineSeal && */}
                  <td style={styles.td}>
                    <input style={styles.input} value={toUpperVal(row.shippingLineSealNo || "")}
                      onChange={(e) => handleFieldChange(idx, "shippingLineSealNo", toUpperVal(e.target.value))} placeholder="LINE SEAL" />
                  </td>
                  <td style={styles.td}>
                    <select style={styles.select} value={row.type || ""} onChange={(e) => handleFieldChange(idx, "type", e.target.value)}>
                      <option value="">Select</option>
                      {containerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <input type="number" style={styles.input} value={row.pkgsStuffed || ""}
                      onChange={(e) => handleFieldChange(idx, "pkgsStuffed", Number(e.target.value || 0))} />
                  </td>
                  <td style={styles.td}>
                    <input type="number" style={styles.input} value={row.grossWeight || ""}
                      onChange={(e) => handleFieldChange(idx, "grossWeight", Number(e.target.value || 0))} />
                  </td>
                  <td style={styles.td}>
                    <input type="number" style={styles.input} value={row.tareWeightKgs || ""}
                      onChange={(e) => handleFieldChange(idx, "tareWeightKgs", Number(e.target.value || 0))} />
                  </td>
                  <td style={styles.td}>
                    <input type="number" style={styles.input} value={row.maxGrossWeightKgs || ""}
                      onChange={(e) => handleFieldChange(idx, "maxGrossWeightKgs", Number(e.target.value || 0))} />
                  </td>
                  <td style={styles.td}>
                    <input style={{ ...styles.input, ...styles.readOnlyInput }} value={row.maxPayloadKgs || ""} readOnly disabled />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileUpload bucketPath="container_images" multiple={true}
                        onFilesUploaded={(urls) => handleFieldChange(idx, "images", [...(row.images || []), ...urls])} />
                      <ImagePreview images={row.images || []} onDeleteImage={(iIdx) => handleFieldChange(idx, "images", (row.images || []).filter((_, i) => i !== iIdx))} />
                    </div>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <button type="button" style={styles.trashBtn} onClick={() => handleDelete(idx)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: WEIGHMENT INFO */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <FontAwesomeIcon icon={faScaleBalanced} /> WEIGHMENT DETAILS
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40, textAlign: 'center' }}>#</th>
                <th style={{ ...styles.th, width: 140 }}>Container No</th>
                <th style={{ ...styles.th, width: 120 }}>Reg / Slip No</th>
                <th style={{ ...styles.th, width: 160 }}>Weighbridge Name</th>
                <th style={{ ...styles.th, width: 200 }}>Weighbridge Address</th>
                <th style={{ ...styles.th, width: 150 }}>Date & Time</th>
                <th style={{ ...styles.th, width: 110 }}>Vehicle No</th>
                <th style={{ ...styles.th, width: 90 }}>VGM WT (KG)</th>
                <th style={{ ...styles.th, width: 120 }}>Images</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: 20 }}>Add containers above to fill weighment.</td>
                </tr>
              )}
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{row.serialNumber}</td>
                  <td style={styles.td}>
                    <input style={{ ...styles.input, ...styles.readOnlyInput }} value={toUpperVal(row.containerNo || "")} readOnly disabled />
                  </td>
                  <td style={styles.td}>
                    <input style={styles.input} value={toUpperVal(row.weighmentRegNo || "")}
                      onChange={(e) => handleFieldChange(idx, "weighmentRegNo", toUpperVal(e.target.value))} placeholder="SLIP NO" />
                  </td>
                  <td style={styles.td}>
                    <input style={styles.input} value={toUpperVal(row.weighBridgeName || "")}
                      onChange={(e) => handleFieldChange(idx, "weighBridgeName", toUpperVal(e.target.value))} placeholder="BRIDGE NAME" />
                  </td>
                  <td style={styles.td}>
                    <input style={styles.input} value={row.weighmentAddress || ""}
                      onChange={(e) => handleFieldChange(idx, "weighmentAddress", e.target.value)} placeholder="ADDRESS" />
                  </td>
                  <td style={styles.td}>
                    <input type="datetime-local" style={styles.input} value={row.weighmentDateTime || ""}
                      onChange={(e) => handleFieldChange(idx, "weighmentDateTime", e.target.value)} />
                  </td>
                  <td style={styles.td}>
                    <input style={styles.input} value={toUpperVal(row.weighmentVehicleNo || "")}
                      onChange={(e) => handleFieldChange(idx, "weighmentVehicleNo", toUpperVal(e.target.value))} placeholder="VEHICLE NO" />
                  </td>
                  <td style={styles.td}>
                    <input style={{ ...styles.input, ...styles.readOnlyInput }} value={row.vgmWtInvoice || ""} readOnly disabled />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileUpload bucketPath="weighment_images" multiple={true}
                        onFilesUploaded={(urls) => handleFieldChange(idx, "weighmentImages", [...(row.weighmentImages || []), ...urls])} />
                      <ImagePreview images={row.weighmentImages || []} onDeleteImage={(i) => handleFieldChange(idx, "weighmentImages", (row.weighmentImages || []).filter((_, ix) => ix !== i))} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ContainerTab;
