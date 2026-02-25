import React, { useState, useRef, useEffect, useCallback } from "react";
import DateInput from "../../../common/DateInput.js";
import { styles, toUpperVal } from "../Product/commonStyles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";

const containerTypes = [
  "20",
  "40"
];

const sealTypes = ["RFID"];

function ContainerTab({ formik, onUpdate }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const saveTimeoutRef = useRef(null);

  const stuffedAt = (formik.values.goods_stuffed_at || "").toUpperCase();
  const showSLineSeal = stuffedAt === "FACTORY";

  const autoSave = useCallback(
    async (values) => {
      if (onUpdate) await onUpdate(values);
    },
    [onUpdate],
  );

  // const debouncedSave = () => {
  //   if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  //   saveTimeoutRef.current = setTimeout(() => {
  //     autoSave(formik.values);
  //   }, 900);
  // };

  // Sync grWtPlusTrWt for existing rows if it's 0 but weights are present
  useEffect(() => {
    const list = formik.values.containers || [];
    let changed = false;
    const newList = list.map((c) => {
      const gw = Number(c.grossWeight || 0);
      const tw = Number(c.tareWeightKgs || 0);
      const targetSum = parseFloat((gw + tw).toFixed(3));

      // Sync both legacy and new field names for safety
      if ((!c.vgmWtInvoice || c.vgmWtInvoice === 0) && targetSum > 0) {
        changed = true;
        return { ...c, vgmWtInvoice: targetSum, grWtPlusTrWt: targetSum };
      }
      return c;
    });

    if (changed) {
      formik.setFieldValue("containers", newList);
    }
  }, [formik.values.containers?.length]); // Run primarily on load or when rows added

  // Initialize with one empty row if empty
  useEffect(() => {
    if (formik.values.job_no && (!formik.values.containers || formik.values.containers.length === 0)) {
      // We use a slight timeout or direct update to ensure we don't conflict with initial fetch
      const list = [{
        serialNumber: 1,
        containerNo: "",
        sealNo: "",
        sealDate: "",
        type: "",
        pkgsStuffed: 0,
        grossWeight: 0,
        maxGrossWeightKgs: 0,
        sealType: "RFID",
        shippingLineSealNo: "",
        tareWeightKgs: 0,
        grWtPlusTrWt: 0,
        vgmWtInvoice: 0,
        maxPayloadKgs: 0,
        rfid: "",
      }];
      formik.setFieldValue("containers", list);
      setEditingIndex(0);
    }
  }, [formik.values.job_no]);

  const handleFieldChange = (idx, field, value) => {
    const list = [...(formik.values.containers || [])];
    list[idx][field] = value;

    // Auto-calculate sum (VGM = Gross + Tare) - keeping for legacy or if needed, but user wants Max Payload in that column
    // The user requested "VGM WT = Max Payload (KG)". We will bind the column to maxPayloadKgs. 
    // We can still calc grWtPlusTrWt in background if needed, but prioritising user request.

    formik.setFieldValue("containers", list);

    // Sync to Operations Tab
    const containerNo = list[idx].containerNo;
    if (containerNo) {
      const operations = formik.values.operations || [];
      let opsChanged = false;

      const newOps = operations.map((op) => {
        const cDetails = op.containerDetails || [];
        const hasContainer = cDetails.some(
          (d) =>
            (d.containerNo || "").trim().toUpperCase() ===
            containerNo.trim().toUpperCase(),
        );

        if (hasContainer) {

          let detailsChanged = false;
          const newCDetails = cDetails.map((d) => {
            if (
              (d.containerNo || "").trim().toUpperCase() ===
              containerNo.trim().toUpperCase()
            ) {
              const newD = { ...d };

              if (field === "type") newD.containerSize = value;
              if (field === "grossWeight") newD.grossWeight = value;
              if (field === "maxGrossWeightKgs") newD.maxGrossWeightKgs = value;
              if (field === "vgmWtInvoice") newD.vgmWtInvoice = value;
              if (field === "tareWeightKgs") newD.tareWeightKgs = value;
              if (field === "shippingLineSealNo") newD.shippingLineSealNo = value;
              if (field === "maxPayloadKgs") newD.maxPayloadKgs = value;

              if (JSON.stringify(newD) !== JSON.stringify(d)) {
                detailsChanged = true;
                return newD;
              }
            }
            return d;
          });

          if (detailsChanged) {
            opsChanged = true;
            return { ...op, containerDetails: newCDetails };
          }
        }
        return op;
      });

      if (opsChanged) {
        formik.setFieldValue("operations", newOps);
      }
    }

    // debouncedSave();
  };

  const handleAdd = () => {
    const list = [...(formik.values.containers || [])];
    list.push({
      serialNumber: list.length + 1,
      containerNo: "",
      sealNo: "",
      sealDate: "",
      type: "",
      pkgsStuffed: 0,
      grossWeight: 0,
      maxGrossWeightKgs: 0,
      sealType: "RFID",
      shippingLineSealNo: "",
      tareWeightKgs: 0,
      grWtPlusTrWt: 0,
      vgmWtInvoice: 0,
      maxPayloadKgs: 0,
      rfid: "",
    });
    formik.setFieldValue("containers", list);
    setEditingIndex(list.length - 1);
    // debouncedSave();
  };

  const handleDelete = (idx) => {
    if (!window.confirm("Are you sure you want to delete this container?")) return;
    const deletedContainer = (formik.values.containers || [])[idx];
    const deletedNo = (deletedContainer?.containerNo || "").trim().toUpperCase();

    // Remove from master containers list
    const list = (formik.values.containers || []).filter((_, i) => i !== idx);
    list.forEach((c, i) => {
      c.serialNumber = i + 1;
    });
    formik.setFieldValue("containers", list);

    // Also directly remove from operations (OperationsTab may not be mounted)
    const operations = formik.values.operations || [];
    if (operations.length > 0) {
      let opsChanged = false;
      const nextOps = operations.map(op => {
        const syncedOp = { ...op };
        let dirty = false;

        ["containerDetails", "weighmentDetails"].forEach(secName => {
          const arr = syncedOp[secName] || [];
          if (arr.length > list.length) {
            // Truncate to match master length
            syncedOp[secName] = arr.slice(0, list.length);
            dirty = true;
          }
          // Also remove by container number if it matches the deleted one
          if (deletedNo && arr.some(d => (d.containerNo || "").trim().toUpperCase() === deletedNo)) {
            syncedOp[secName] = arr.filter(d => (d.containerNo || "").trim().toUpperCase() !== deletedNo);
            dirty = true;
          }
        });

        // Re-sync remaining container numbers by index from master
        ["containerDetails", "weighmentDetails"].forEach(secName => {
          const current = syncedOp[secName] || [];
          list.forEach((m, i) => {
            if (i < current.length) {
              const mNo = (m.containerNo || "").trim().toUpperCase();
              if ((current[i].containerNo || "").trim().toUpperCase() !== mNo) {
                current[i] = { ...current[i], containerNo: mNo };
                dirty = true;
              }
            }
          });
        });

        if (dirty) opsChanged = true;
        return syncedOp;
      });

      if (opsChanged) {
        formik.setFieldValue("operations", nextOps);
      }
    }

    if (editingIndex === idx) setEditingIndex(null);
    else if (editingIndex > idx) setEditingIndex(editingIndex - 1);
    // debouncedSave();
  };

  const rows = formik.values.containers || [];

  const exportToExcel = () => {
    if (!rows || rows.length === 0) {
      alert("No container data available to export.");
      return;
    }

    const exportData = rows.map((r, index) => ({
      "Sr No": index + 1,
      "Container No": r.containerNo || "",
      "Seal No": r.sealNo || "",
      "Seal Date": r.sealDate || "",
      "Type": r.type || "",
      "Pkgs Stuffed": r.pkgsStuffed || 0,
      "Gross Weight (Kg)": r.grossWeight || 0,
      "Tare Weight (Kg)": r.tareWeightKgs || 0,
      "S Line Seal": r.shippingLineSealNo || "",
      "RFID": r.rfid || "",
      "Max Payload (KG)": r.maxPayloadKgs || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Containers");

    const jobNo = formik.values.job_no ? formik.values.job_no.replace(/\//g, "-") : "Job";
    XLSX.writeFile(workbook, `Containers_${jobNo}.xlsx`);
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.cardTitle, marginBottom: 8 }}>
        CONTAINER DETAILS
      </div>

      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 10,
            gap: "10px",
          }}
        >
          <button type="button" style={{ ...styles.addBtn, backgroundColor: "#10b981", color: "#fff" }} onClick={exportToExcel}>
            <span style={{ marginRight: "5px" }}>📥</span> EXPORT EXCEL
          </button>
          <button type="button" style={styles.addBtn} onClick={handleAdd}>
            ＋ NEW CONTAINER
          </button>
        </div>

        <div style={styles.tableContainer}>
          <table style={{ ...styles.table, minWidth: 1400 }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 20 }}>#</th>
                <th style={{ ...styles.th, width: 120 }}>CONTAINER NO</th>
                <th style={{ ...styles.th, width: 80 }}>SEAL NO</th>
                <th style={{ ...styles.th, width: 100 }}>SEAL TYPE</th>
                <th style={{ ...styles.th, width: 100 }}>SEAL DATE</th>
                {showSLineSeal && (
                  <th style={{ ...styles.th, width: 150 }}>S/L SEAL NO</th>
                )}
                <th style={{ ...styles.th, width: 180 }}>TYPE</th>
                <th style={{ ...styles.th, width: 100 }}>PKGS</th>
                <th style={{ ...styles.th, width: 130 }}>GROSS WT</th>
                <th style={{ ...styles.th, width: 130 }}>TARE WT</th>
                <th style={{ ...styles.th, width: 130 }}>VGM WT</th>
                <th style={{ ...styles.th, width: 130 }}>MAX PAYLOAD</th>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      padding: 20,
                      color: "#94a3b8",
                    }}
                  >
                    NO CONTAINERS ADDED. CLICK "NEW CONTAINER" TO START.
                  </td>
                </tr>
              )}

              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: "center",
                      fontWeight: 700,
                    }}
                  >
                    {row.serialNumber}
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={toUpperVal(row.containerNo || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "containerNo",
                          toUpperVal(e.target.value),
                        )
                      }
                      placeholder="CONT. NO"
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={toUpperVal(row.sealNo || "")}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "sealNo",
                          toUpperVal(e.target.value),
                        )
                      }
                      placeholder="SEAL NO"
                    />
                  </td>

                  <td style={styles.td}>
                    <select
                      style={styles.select}
                      value={row.sealType || ""}
                      onChange={(e) =>
                        handleFieldChange(idx, "sealType", e.target.value)
                      }
                    >
                      <option value="">-- SELECT --</option>
                      {sealTypes.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={styles.td}>
                    <DateInput
                      style={styles.input}
                      value={row.sealDate || ""}
                      onChange={(e) =>
                        handleFieldChange(idx, "sealDate", e.target.value)
                      }
                    />
                  </td>

                  {showSLineSeal && (
                    <td>
                      <input
                        style={styles.input}
                        value={toUpperVal(row.shippingLineSealNo || "")}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "shippingLineSealNo",
                            toUpperVal(e.target.value),
                          )
                        }
                        placeholder="S/LINE SEAL NO"
                      />
                    </td>
                  )}

                  <td style={styles.td}>
                    <select
                      style={styles.select}
                      value={row.type || ""}
                      onChange={(e) =>
                        handleFieldChange(idx, "type", e.target.value)
                      }
                    >
                      <option value="">-- SELECT --</option>
                      {containerTypes.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={Number(row.pkgsStuffed) === 0 ? "" : row.pkgsStuffed}
                      // User can edit, but it might be overwritten by OperationsSync if connected
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "pkgsStuffed",
                          Number(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={Number(row.grossWeight) === 0 ? "" : row.grossWeight}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "grossWeight",
                          Number(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={Number(row.tareWeightKgs) === 0 ? "" : row.tareWeightKgs}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "tareWeightKgs",
                          Number(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={Number(row.vgmWtInvoice) === 0 ? "" : row.vgmWtInvoice}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "vgmWtInvoice",
                          Number(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={Number(row.maxPayloadKgs) === 0 ? "" : row.maxPayloadKgs}
                      onChange={(e) =>
                        handleFieldChange(
                          idx,
                          "maxPayloadKgs",
                          Number(e.target.value || 0),
                        )
                      }
                      placeholder="0.00"
                    />
                  </td>

                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button
                      type="button"
                      style={styles.linkButton}
                      onClick={() => handleDelete(idx)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
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
