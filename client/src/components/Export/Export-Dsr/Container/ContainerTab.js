import React, { useState, useRef, useCallback } from "react";
import DateInput from "../../../common/DateInput.js";
import { styles, toUpperVal } from "../Product/commonStyles";

const containerTypes = [
  "20 STANDARD DRY",
  "20 FLAT RACK",
  "20 COLLAPSIBLE FLAT RACK",
  "20 REEFER",
  "20 TANK",
  "20 OPEN TOP",
  "20 HARD TOP",
  "20 PLATFORM",
  "40 STANDARD DRY",
  "40 FLAT RACK",
  "40 COLLAPSIBLE FLAT RACK",
  "40 REEFER",
  "40 TANK",
  "40 OPEN TOP",
  "40 HARD TOP",
  "40 HIGH CUBE",
  "40 REEFER HIGH CUBE",
  "40 PLATFORM",
];

const sealTypes = ["RFID - RADIO FREQUENCY IDENTIFIER"];

function ContainerTab({ formik, onUpdate }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const saveTimeoutRef = useRef(null);

  const autoSave = useCallback(
    async (values) => {
      if (onUpdate) await onUpdate(values);
    },
    [onUpdate]
  );

  const debouncedSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(formik.values);
    }, 900);
  };

  const handleFieldChange = (idx, field, value) => {
    const list = [...(formik.values.containers || [])];
    list[idx][field] = value;
    formik.setFieldValue("containers", list);

    // Sync tareWeightKgs to Operations Tab if changed
    if (field === "tareWeightKgs") {
      const containerNo = list[idx].containerNo;
      if (containerNo) {
        const operations = formik.values.operations || [];
        let opsChanged = false;

        const newOps = operations.map((op) => {
          const cDetails = op.containerDetails || [];
          const hasContainer = cDetails.some(
            (d) =>
              (d.containerNo || "").trim().toUpperCase() ===
              containerNo.trim().toUpperCase()
          );

          if (hasContainer) {
            opsChanged = true;
            return {
              ...op,
              containerDetails: cDetails.map((d) => {
                if (
                  (d.containerNo || "").trim().toUpperCase() ===
                  containerNo.trim().toUpperCase()
                ) {
                  return { ...d, tareWeightKgs: value };
                }
                return d;
              }),
            };
          }
          return op;
        });

        if (opsChanged) {
          formik.setFieldValue("operations", newOps);
        }
      }
    }

    debouncedSave();
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
      sealType: "",
      tareWeightKgs: 0,
      grWtPlusTrWt: 0,
      rfid: "",
    });
    formik.setFieldValue("containers", list);
    setEditingIndex(list.length - 1);
    debouncedSave();
  };

  const handleDelete = (idx) => {
    const list = (formik.values.containers || []).filter((_, i) => i !== idx);
    list.forEach((c, i) => {
      c.serialNumber = i + 1;
    });
    formik.setFieldValue("containers", list);
    if (editingIndex === idx) setEditingIndex(null);
    else if (editingIndex > idx) setEditingIndex(editingIndex - 1);
    debouncedSave();
  };

  const rows = formik.values.containers || [];

  return (
    <div style={styles.page}>
      <div style={{ ...styles.cardTitle, marginBottom: 8 }}>CONTAINER DETAILS</div>

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button type="button" style={styles.addBtn} onClick={handleAdd}>
            ＋ NEW CONTAINER
          </button>
        </div>

        <div style={styles.tableContainer}>
          <table style={{ ...styles.table, minWidth: 1400 }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 40 }}>#</th>
                <th style={{ ...styles.th, width: 150 }}>CONTAINER NO</th>
                <th style={{ ...styles.th, width: 120 }}>SEAL NO</th>
                <th style={{ ...styles.th, width: 120 }}>SEAL DATE</th>
                <th style={{ ...styles.th, width: 180 }}>SEAL TYPE</th>
                <th style={{ ...styles.th, width: 180 }}>TYPE</th>
                <th style={{ ...styles.th, width: 100 }}>PKGS</th>
                <th style={{ ...styles.th, width: 130 }}>GROSS WT</th>
                <th style={{ ...styles.th, width: 130 }}>TARE WT</th>
                <th style={{ ...styles.th, width: 130 }}>GR + TR WT</th>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ ...styles.td, textAlign: "center", padding: 20, color: "#94a3b8" }}>
                    NO CONTAINERS ADDED. CLICK "NEW CONTAINER" TO START.
                  </td>
                </tr>
              )}

              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ ...styles.td, textAlign: "center", fontWeight: 700 }}>{row.serialNumber}</td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={toUpperVal(row.containerNo || "")}
                      onChange={(e) =>
                        handleFieldChange(idx, "containerNo", toUpperVal(e.target.value))
                      }
                      placeholder="CONT. NO"
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      style={styles.input}
                      value={toUpperVal(row.sealNo || "")}
                      onChange={(e) =>
                        handleFieldChange(idx, "sealNo", toUpperVal(e.target.value))
                      }
                      placeholder="SEAL NO"
                    />
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
                      value={row.pkgsStuffed || 0}
                      onChange={(e) =>
                        handleFieldChange(idx, "pkgsStuffed", Number(e.target.value || 0))
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={row.grossWeight || 0}
                      onChange={(e) =>
                        handleFieldChange(idx, "grossWeight", Number(e.target.value || 0))
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={row.tareWeightKgs || 0}
                      onChange={(e) =>
                        handleFieldChange(idx, "tareWeightKgs", Number(e.target.value || 0))
                      }
                    />
                  </td>

                  <td style={styles.td}>
                    <input
                      type="number"
                      style={styles.input}
                      value={row.grWtPlusTrWt || 0}
                      onChange={(e) =>
                        handleFieldChange(idx, "grWtPlusTrWt", Number(e.target.value || 0))
                      }
                    />
                  </td>

                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button
                      type="button"
                      style={styles.linkButton}
                      onClick={() => handleDelete(idx)}
                    >
                      ✕
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
