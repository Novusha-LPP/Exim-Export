import React, { useState, useRef, useCallback } from "react";
import DateInput from "../../../common/DateInput.js";

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 13,
    color: "#1e2e38",
  },
  sectionTitleMain: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 13,
    marginBottom: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    padding: 10,
    marginBottom: 18,
  },
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: 5,
    overflow: "hidden",
    fontSize: 12,
  },
  headRow: {
    background: "#f7fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  headCell: {
    padding: "6px 6px",
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    borderRight: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  bodyRow: {
    borderBottom: "1px solid #edf2f7",
    background: "#fff",
  },
  cell: {
    padding: "3px 4px",
    borderRight: "1px solid #edf2f7",
    verticalAlign: "middle",
  },
  srCell: {
    padding: "3px 6px",
    borderRight: "1px solid #edf2f7",
    fontSize: 12,
    fontWeight: 600,
    textAlign: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  inputNumeric: {
    width: "100%",
    fontSize: 12,
    padding: "3px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textAlign: "right",
    fontWeight: 600,
  },
  inputDate: {
    width: "100%",
    fontSize: 12,
    padding: "3px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "none",
    fontWeight: 500,
  },
  select: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  textReadonly: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1f2933",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  newBtn: {
    fontSize: 11,
    padding: "4px 12px",
    borderRadius: 3,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: 600,
    cursor: "pointer",
  },
  actionBtn: (variant) => {
    const base = {
      fontSize: 11,
      padding: "3px 8px",
      borderRadius: 3,
      border: "1px solid",
      cursor: "pointer",
      textTransform: "uppercase",
      fontWeight: 600,
    };
    if (variant === "save") {
      return {
        ...base,
        borderColor: "#16a34a",
        background: "#e8f7ee",
        color: "#166534",
      };
    }
    if (variant === "cancel") {
      return {
        ...base,
        borderColor: "#f59e0b",
        background: "#fff7e6",
        color: "#b45309",
      };
    }
    if (variant === "delete") {
      return {
        ...base,
        borderColor: "#dc2626",
        background: "#fee2e2",
        color: "#b91c1c",
      };
    }
    return {
      ...base,
      borderColor: "#0ea5e9",
      background: "#e0f2fe",
      color: "#0369a1",
    };
  },
  actionsCellInner: {
    display: "flex",
    gap: 4,
    justifyContent: "center",
  },
  emptyRow: {
    padding: "10px 8px",
    fontSize: 12,
    color: "#6b7280",
  },
};

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

  const handleSave = () => setEditingIndex(null);
  const handleCancel = () => setEditingIndex(null);
  const isEditing = (idx) => editingIndex === idx;

  const rows = formik.values.containers || [];

  return (
    <div style={styles.page}>
      <div style={styles.sectionTitleMain}>CONTAINER DETAILS</div>

      <div style={styles.card}>
        <div style={styles.topBar}>
          <button type="button" style={styles.newBtn} onClick={handleAdd}>
            + NEW CONTAINER
          </button>
        </div>

        <div style={styles.tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={styles.headRow}>
                <th style={{ ...styles.headCell, width: 55 }}>SR NO</th>
                <th style={{ ...styles.headCell, width: 130 }}>CONTAINER NO</th>
                <th style={{ ...styles.headCell, width: 110 }}>SEAL NO</th>
                <th style={{ ...styles.headCell, width: 110 }}>SEAL DATE</th>
                <th style={{ ...styles.headCell, width: 150 }}>SEAL TYPE</th>
                <th style={{ ...styles.headCell, width: 150 }}>TYPE</th>
                <th style={{ ...styles.headCell, width: 110 }}>PKGS STUFFED</th>
                <th style={{ ...styles.headCell, width: 130 }}>GROSS WEIGHT</th>

                <th style={{ ...styles.headCell, width: 130 }}>
                  TARE WEIGHT (KGS)
                </th>
                <th style={{ ...styles.headCell, width: 130 }}>GR-WT + TR-W</th>
                <th
                  style={{
                    ...styles.headCell,
                    width: 160,
                    textAlign: "center",
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} style={styles.emptyRow}>
                    NO CONTAINERS ADDED. CLICK "NEW CONTAINER" TO ADD.
                  </td>
                </tr>
              )}

              {rows.map((row, idx) => {
                const edit = isEditing(idx);
                return (
                  <tr key={idx} style={styles.bodyRow}>
                    <td style={styles.srCell}>{row.serialNumber}</td>

                    {/* CONTAINER NO */}
                    <td style={styles.cell}>
                      <input
                        style={styles.input}
                        value={row.containerNo || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "containerNo",
                            e.target.value.toUpperCase()
                          )
                        }
                      />
                    </td>

                    {/* SEAL NO */}
                    <td style={styles.cell}>
                      <input
                        style={styles.input}
                        value={row.sealNo || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "sealNo",
                            e.target.value.toUpperCase()
                          )
                        }
                      />
                    </td>

                    {/* SEAL DATE */}
                    <td style={styles.cell}>
                      <DateInput
                        style={styles.inputDate}
                        value={row.sealDate || ""}
                        onChange={(e) =>
                          handleFieldChange(idx, "sealDate", e.target.value)
                        }
                      />
                    </td>

                    {/* SEAL TYPE */}
                    <td style={styles.cell}>
                      <select
                        style={styles.select}
                        value={row.sealType || ""}
                        onChange={(e) =>
                          handleFieldChange(idx, "sealType", e.target.value)
                        }
                      >
                        <option value="">SELECT</option>
                        {sealTypes.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* TYPE */}
                    <td style={styles.cell}>
                      <select
                        style={styles.select}
                        value={row.type || ""}
                        onChange={(e) =>
                          handleFieldChange(idx, "type", e.target.value)
                        }
                      >
                        <option value="">SELECT</option>
                        {containerTypes.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* PKGS STUFFED */}
                    <td style={styles.cell}>
                      <input
                        type="number"
                        style={styles.inputNumeric}
                        value={row.pkgsStuffed || 0}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "pkgsStuffed",
                            Number(e.target.value || 0)
                          )
                        }
                      />
                    </td>

                    {/* GROSS WEIGHT */}
                    <td style={styles.cell}>
                      <input
                        type="string"
                        style={styles.inputNumeric}
                        value={row.grossWeight || 0}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "grossWeight",
                            Number(e.target.value || 0)
                          )
                        }
                      />
                    </td>

                    {/* SEAL DEVICE ID */}
                    <td style={styles.cell}>
                      <input
                        type="string"
                        style={styles.inputNumeric}
                        value={row.tareWeightKgs || 0}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "tareWeightKgs",
                            Number(e.target.value || 0)
                          )
                        }
                      />
                    </td>

                    {/* GR-WT + TR-W */}
                    <td style={styles.cell}>
                      <input
                        type="number"
                        style={styles.inputNumeric}
                        value={row.grWtPlusTrWt || 0}
                        onChange={(e) =>
                          handleFieldChange(
                            idx,
                            "grWtPlusTrWt",
                            Number(e.target.value || 0)
                          )
                        }
                      />
                    </td>

                    {/* ACTIONS */}
                    <td style={styles.cell}>
                      <div style={styles.actionsCellInner}>
                        {edit ? (
                          <>
                            <button
                              type="button"
                              style={styles.actionBtn("save")}
                              onClick={handleSave}
                            >
                              SAVE
                            </button>
                            <button
                              type="button"
                              style={styles.actionBtn("cancel")}
                              onClick={handleCancel}
                            >
                              CANCEL
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            style={styles.actionBtn("edit")}
                            onClick={() => setEditingIndex(idx)}
                          >
                            EDIT
                          </button>
                        )}
                        <button
                          type="button"
                          style={styles.actionBtn("delete")}
                          onClick={() => handleDelete(idx)}
                        >
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ContainerTab;
