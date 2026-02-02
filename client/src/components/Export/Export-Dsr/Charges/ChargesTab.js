import React, { useEffect } from "react";

const DEFAULT_PARTICULARS = [
  "EDI CHARGES",
  "HASTI PETROCHEMICAL",
  "CONTAINER CORPORATION",
  "VGM",
  "E-SB",
  "FORM 13",
  "SURVEY",
  "LASHING & CHOKING",
  "FUMIGATION",
  "PALLETISATION",
  "GSEC",
  "ADANI"
];

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
    marginBottom: 8,
  },
  tableWrapper: {
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    background: "#ffffff",
    marginBottom: 10,
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: 1000,
    borderCollapse: "collapse",
  },
  th: {
    fontSize: 11,
    fontWeight: 700,
    color: "#f9fafb",
    background: "#16408f",
    padding: "8px 6px",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 10,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 6px",
    borderBottom: "1px solid #e0e5f0",
    verticalAlign: "top",
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 24,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 700,
  },
  disabledInput: {
    width: "100%",
    fontSize: 12,
    padding: "3px 6px",
    border: "1px solid #e0e0e0",
    borderRadius: 3,
    height: 24,
    background: "#f0f0f0",
    outline: "none",
    boxSizing: "border-box",
    fontWeight: 700,
    color: "#999",
    cursor: "not-allowed"
  },
  smallButton: {
    padding: "3px 9px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #16408f",
    background: "#16408f",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
    marginRight: 6,
  },
  linkButton: {
    padding: "2px 7px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #e53e3e",
    background: "#fff5f5",
    color: "#c53030",
    cursor: "pointer",
    fontWeight: 600,
  },
};

const ChargesTab = ({ formik, directories, params }) => {
  const charges = formik.values.charges || [];

  // Initialize charges if empty, but only after job data is loaded (checked via job_no)
  useEffect(() => {
    if (charges.length === 0 && formik.values.job_no) {
      const initialCharges = DEFAULT_PARTICULARS.map(p => ({
        isEnabled: false,
        particulars: p,
        buying: 0,
        selling: 0,
        remarks: ""
      }));
      formik.setFieldValue("charges", initialCharges);
    }
  }, [charges.length, formik.values.job_no, formik.setFieldValue]);

  const handleCheckboxChange = (index, checked) => {
    formik.setFieldValue(`charges.${index}.isEnabled`, checked);
  };

  const handleInputChange = (index, field, value) => {
    formik.setFieldValue(`charges.${index}.${field}`, value);
  };

  const traverseAndAddRow = () => {
    const newCharge = {
      isEnabled: false,
      particulars: "",
      buying: 0,
      selling: 0,
      remarks: ""
    };
    formik.setFieldValue("charges", [...charges, newCharge]);
  };

  const handleDeleteRow = (index) => {
    const updatedCharges = [...charges];
    updatedCharges.splice(index, 1);
    formik.setFieldValue("charges", updatedCharges);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>Charges</div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 50, textAlign: "center" }}>Status</th>
                <th style={{ ...styles.th, width: 50 }}>SR NO</th>
                <th style={{ ...styles.th }}>PARTICULARS</th>
                <th style={{ ...styles.th, width: 150 }}>BUYING</th>
                <th style={{ ...styles.th, width: 150 }}>SELLING</th>
                <th style={{ ...styles.th, width: 500 }}>REMARKS</th>
                <th style={{ ...styles.th, width: 80, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((charge, index) => (
                <tr key={index}>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={charge.isEnabled || false}
                      onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                      style={{ cursor: "pointer", width: "14px", height: "14px" }}
                    />
                  </td>
                  <td style={styles.td}>
                    {index + 1}
                  </td>
                  <td style={styles.td}>
                    <input 
                      type="text"
                      value={charge.particulars || ""}
                      onChange={(e) => handleInputChange(index, "particulars", e.target.value)}
                      style={styles.input}
                      placeholder="Enter Particulars"
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="number"
                      value={charge.buying}
                      onChange={(e) => handleInputChange(index, "buying", e.target.value)}
                      disabled={!charge.isEnabled}
                      style={!charge.isEnabled ? styles.disabledInput : styles.input}
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="number"
                      value={charge.selling}
                      onChange={(e) => handleInputChange(index, "selling", e.target.value)}
                      disabled={!charge.isEnabled}
                      style={!charge.isEnabled ? styles.disabledInput : styles.input}
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      type="text"
                      value={charge.remarks}
                      onChange={(e) => handleInputChange(index, "remarks", e.target.value)}
                      disabled={!charge.isEnabled}
                      style={!charge.isEnabled ? styles.disabledInput : styles.input}
                    />
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button
                      type="button"
                      style={styles.linkButton}
                      onClick={() => handleDeleteRow(index)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            style={styles.smallButton}
            onClick={traverseAndAddRow}
          >
            + Add Row
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChargesTab;
