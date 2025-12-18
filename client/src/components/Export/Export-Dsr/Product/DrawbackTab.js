import React, { useRef, useCallback } from "react";

// Shared styles object (same as used in ProductEPCGTab/ProductDEECTab)
const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 13,
    color: "#1e2e38",
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 12,
    marginBottom: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  tableContainer: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    marginBottom: 18,
    maxHeight: 400,
    overflow: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1200 }, // Added minWidth for horizontal scroll
  th: {
    background: "#16408f",
    color: "white",
    fontWeight: 700,
    fontSize: 11,
    padding: "8px 12px",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 10,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "top",
  },
  input: {
    width: "100%",
    textTransform: "uppercase",
    fontWeight: 600,
    fontSize: 12,
    padding: "4px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 28,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  checkbox: { cursor: "pointer" },
  select: {
    width: "100%",
    textTransform: "uppercase",
    fontWeight: 600,
    fontSize: 12,
    padding: "4px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 28,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 14,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    background: "#e2e8f0",
    color: "#1e2e38",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 12,
    height: 20,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    background: "#16408f",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  },
};

// Default drawback detail object
const getDefaultDrawback = (idx = 1) => ({
  serialNumber: String(idx),
  dbkitem: false,
  dbkSrNo: "",
  fobValue: "",
  quantity: 0,
  dbkUnder: "Actual",
  dbkDescription: "",
  dbkRate: 1.5,
  dbkCap: 0,
  dbkAmount: 0,
  percentageOfFobValue: "1.5% of FOB Value",
});

const DrawbackTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);

  // Ensure array exists
  const drawbackDetails = formik.values.drawbackDetails || [
    getDefaultDrawback(1),
  ];

  const autoSave = useCallback(() => formik.submitForm(), [formik]);

  const scheduleSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(autoSave, 1200);
  };

  const handleDrawbackFieldChange = (idx, field, value) => {
    const updated = [...(formik.values.drawbackDetails || [])];
    if (!updated[idx]) updated[idx] = getDefaultDrawback(idx + 1);
    updated[idx][field] = value;

    formik.setFieldValue("drawbackDetails", updated);
    scheduleSave();
  };

  const addDrawbackDetail = () => {
    const updated = [...(formik.values.drawbackDetails || [])];
    updated.push(getDefaultDrawback(updated.length + 1));
    formik.setFieldValue("drawbackDetails", updated);
  };

  const deleteDrawbackDetail = (idx) => {
    const updated = [...(formik.values.drawbackDetails || [])];
    if (updated.length > 1) {
      updated.splice(idx, 1);
      formik.setFieldValue("drawbackDetails", updated);
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
              <th style={{ ...styles.th, width: 40, textAlign: "center" }}>
                DBK Item
              </th>
              <th style={styles.th}>DBK Sr. No</th>
              <th style={styles.th}>FOB Value (INR)</th>
              <th style={styles.th}>Quantity (MTS)</th>
              <th style={styles.th}>DBK Under</th>
              <th style={{ ...styles.th, minWidth: 200 }}>Description</th>
              <th style={styles.th}>Rate (%)</th>
              <th style={styles.th}>Cap</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>% of FOB</th>
              <th style={{ ...styles.th, width: 50, textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {drawbackDetails.map((item, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={item.dbkitem || false}
                    onChange={(e) =>
                      handleDrawbackFieldChange(
                        idx,
                        "dbkitem",
                        e.target.checked
                      )
                    }
                    style={styles.checkbox}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={styles.input}
                    value={item.dbkSrNo || ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(idx, "dbkSrNo", e.target.value)
                    }
                    placeholder="SR NO"
                  />
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
                    type="number"
                    value={item.dbkCap ?? ""}
                    onChange={(e) =>
                      handleDrawbackFieldChange(idx, "dbkCap", e.target.value)
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
                <td style={styles.td}>
                  <input
                    style={{
                      ...styles.input,
                      backgroundColor: "#eee",
                      color: "#666",
                    }}
                    value={item.percentageOfFobValue || ""}
                    readOnly
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
    </div>
  );
};

export default DrawbackTab;
