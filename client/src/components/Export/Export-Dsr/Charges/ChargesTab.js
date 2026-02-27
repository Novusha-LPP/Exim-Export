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
  const fines = formik.values.fines || [];

  // Fine type options with default amounts
  const FINE_TYPES = [
    { label: "Challan", defaultAmount: 1000 },
    { label: "Fine by Officer", defaultAmount: 0 },
    { label: "Notesheet Amount", defaultAmount: 500 },
    { label: "Misc", defaultAmount: 0 },
  ];

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
    if ((field === "buying" || field === "selling") && parseFloat(value) <= 0 && value !== "") {
      alert("Amount must be greater than zero");
      return;
    }
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

  // Fine handlers
  const handleAddFine = () => {
    const newFine = {
      fineType: "",
      accountability: "",
      amount: 0,
      remarks: "",
    };
    formik.setFieldValue("fines", [...fines, newFine]);
  };

  const handleFineChange = (index, field, value) => {
    if (field === "amount" && parseFloat(value) <= 0 && value !== "") {
      alert("Amount must be greater than zero");
      return;
    }
    formik.setFieldValue(`fines.${index}.${field}`, value);
  };

  const handleFineTypeChange = (index, value) => {
    formik.setFieldValue(`fines.${index}.fineType`, value);
    // Auto-fill amount based on type
    const fineType = FINE_TYPES.find((t) => t.label === value);
    if (fineType && fineType.defaultAmount > 0) {
      formik.setFieldValue(`fines.${index}.amount`, fineType.defaultAmount);
    }
  };

  const handleDeleteFine = (index) => {
    const updatedFines = [...fines];
    updatedFines.splice(index, 1);
    formik.setFieldValue("fines", updatedFines);
  };

  return (
    <div style={styles.page}>
      {/* Charges Section */}
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

      {/* Fine Section */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Fine</div>
        <div style={styles.tableWrapper}>
          <table style={{ ...styles.table, minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 50 }}>SR NO</th>
                <th style={{ ...styles.th, width: 200 }}>TYPE OF FINE</th>
                <th style={{ ...styles.th, width: 180 }}>ACCOUNTABILITY</th>
                <th style={{ ...styles.th, width: 150 }}>AMOUNT (₹)</th>
                <th style={{ ...styles.th }}>REMARKS</th>
                <th style={{ ...styles.th, width: 80, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {fines.length > 0 ? (
                fines.map((fine, index) => (
                  <tr key={index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      <select
                        value={fine.fineType || ""}
                        onChange={(e) => handleFineTypeChange(index, e.target.value)}
                        style={{ ...styles.input, cursor: "pointer" }}
                      >
                        <option value="">Select Type</option>
                        {FINE_TYPES.map((ft) => (
                          <option key={ft.label} value={ft.label}>
                            {ft.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", minHeight: 24 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          <input
                            type="radio"
                            name={`fine_accountability_${index}`}
                            value="By Us"
                            checked={fine.accountability === "By Us"}
                            onChange={(e) => handleFineChange(index, "accountability", e.target.value)}
                            style={{ cursor: "pointer" }}
                          />
                          By Us
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          <input
                            type="radio"
                            name={`fine_accountability_${index}`}
                            value="By Exporter"
                            checked={fine.accountability === "By Exporter"}
                            onChange={(e) => handleFineChange(index, "accountability", e.target.value)}
                            style={{ cursor: "pointer" }}
                          />
                          By Exporter
                        </label>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        value={fine.amount || ""}
                        onChange={(e) => handleFineChange(index, "amount", parseFloat(e.target.value) || 0)}
                        style={styles.input}
                        placeholder="0"
                      />
                    </td>
                    <td style={styles.td}>
                      <input
                        type="text"
                        value={fine.remarks || ""}
                        onChange={(e) => handleFineChange(index, "remarks", e.target.value)}
                        style={styles.input}
                        placeholder="Enter remarks"
                      />
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      <button
                        type="button"
                        style={styles.linkButton}
                        onClick={() => handleDeleteFine(index)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ ...styles.td, textAlign: "center", color: "#9ca3af", padding: "16px" }}>
                    No fine entries. Click "+ Add Fine" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            style={styles.smallButton}
            onClick={handleAddFine}
          >
            + Add Fine
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChargesTab;
