import React, { useState, useRef, useCallback, useEffect } from "react";
import DateInput from "../../../common/DateInput.js";

const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 13,
    color: "#1e2e38",
  },
  row: { display: "flex", gap: 20, alignItems: "stretch" },
  col: { flex: 1, minWidth: 0 },
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    padding: 13,
    marginBottom: 18,
  },
  sectionTitleMain: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 13,
    marginBottom: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#1e2e38",
    fontSize: 12,
    marginBottom: 8,
  },
  field: { marginBottom: 8 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
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
  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "4px 8px",
    border: "1.5px solid #ccd6dd",
    borderRadius: 4,
    minHeight: 60,
    background: "#f7fafc",
    resize: "vertical",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  split: { display: "flex", gap: 10 },
  half: { flex: 1, minWidth: 0 },
  checkboxRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 4 },
  checkboxLabel: {
    fontSize: 11,
    color: "#34495e",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableWrap: {
    marginTop: 8,
    border: "1px solid #d3dde8",
    borderRadius: 5,
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: {
    background: "#f1f5f9",
    padding: "4px 6px",
    textAlign: "left",
    borderBottom: "1px solid #d3dde8",
    fontWeight: 700,
    fontSize: 11,
  },
  td: {
    padding: "3px 6px",
    borderBottom: "1px solid #edf2f7",
    verticalAlign: "middle",
  },
  smallButton: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 3,
    border: "1px solid #d32f2f",
    background: "#fff5f5",
    color: "#b71c1c",
    cursor: "pointer",
  },
  addButton: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 3,
    border: "1px solid #2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    cursor: "pointer",
    marginTop: 8,
  },
};

function toDateTimeLocal(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return "";

    // Format: YYYY-MM-DDTHH:MM
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

function toUpper(v) {
  return (typeof v === "string" ? v : "")?.toUpperCase() || "";
}

function AnnexC1DetailsTab({ formik, onUpdate }) {
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
    }, 1100);
  };

  const handleFieldChange = (field, value) => {
    // Update both flat field AND nested annexC1Details structure
    formik.setFieldValue(field, value);

    // Map flat field names to nested annexC1Details structure
    const fieldMapping = {
      ie_code_of_eou: "ieCodeOfEOU",
      branch_sr_no: "branchSerialNo",
      examination_date: "examinationDate",
      examining_officer: "examiningOfficer",
      supervising_officer: "supervisingOfficer",
      commissionerate: "commissionerate",
      verified_by_examining_officer: "verifiedByExaminingOfficer",
      annex_seal_number: "sealNumber",
      annex_designation: "designation",
      annex_division: "division",
      annex_range: "range",
      sample_forwarded: "sampleForwarded",
    };

    // If this field maps to annexC1Details, update the nested structure too
    if (fieldMapping[field]) {
      formik.setFieldValue(`annexC1Details.${fieldMapping[field]}`, value);
    }

    // Special: keep Annex C1 seal number in sync with stuffing seal
    if (field === "stuffing_seal_no") {
      formik.setFieldValue("annex_seal_number", value);
      formik.setFieldValue("annexC1Details.sealNumber", value);
    }

    debouncedSave();
  };

  const handleDocChange = (index, field, value) => {
    const docs = [...(formik.values.annex_c1_documents || [])];
    docs[index] = {
      ...docs[index],
      [field]: value,
      serialNo:
        field === "serialNo"
          ? parseInt(value) || index + 1
          : docs[index].serialNo || index + 1,
    };
    formik.setFieldValue("annex_c1_documents", docs);
    debouncedSave();
  };

  const addDoc = () => {
    const docs = [...(formik.values.annex_c1_documents || [])];
    const nextSn =
      docs.length > 0 ? Math.max(...docs.map((d) => d.serialNo || 0)) + 1 : 1;
    docs.push({ serialNo: nextSn, documentName: "" });
    formik.setFieldValue("annex_c1_documents", docs);
  };

  const deleteDoc = (index) => {
    const docs = [...(formik.values.annex_c1_documents || [])];
    docs.splice(index, 1);
    docs.forEach((d, i) => {
      d.serialNo = i + 1;
    });
    formik.setFieldValue("annex_c1_documents", docs);
    debouncedSave();
  };

  // initial sync of annex_seal_number from stuffing_seal_no
  useEffect(() => {
    if (formik.values.stuffing_seal_no && !formik.values.annex_seal_number) {
      formik.setFieldValue("annex_seal_number", formik.values.stuffing_seal_no);
    }
  }, [
    formik.values.stuffing_seal_no,
    formik.values.annex_seal_number,
    formik.setFieldValue,
  ]);

  return (
    <div style={styles.page}>
      <div style={styles.sectionTitleMain}>ANNEX C1 DETAILS</div>

      <div style={styles.row}>
        {/* LEFT COLUMN – CORE C1 INFO */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>
              EXPORT / EXAMINATION INFORMATION
            </div>

            <div style={styles.field}>
              <div style={styles.label}>IE CODE OF EOU</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.ie_code_of_eou || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "ie_code_of_eou",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="ENTER IE CODE OF EOU"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>BRANCH SR NO</div>
              <input
                style={{
                  ...styles.input,
                  textTransform: "none",
                  fontWeight: 500,
                }}
                type="number"
                value={formik.values.branch_sr_no || 0}
                onChange={(e) =>
                  handleFieldChange(
                    "branch_sr_no",
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="0"
              />
            </div>
            <div style={styles.field}>
              <div style={styles.label}>EXAMINATION DATE</div>
              <DateInput
                style={{
                  ...styles.input,
                  textTransform: "none",
                  fontWeight: 500,
                }}
                value={
                  formik.values.examination_date ||
                  formik.values.annexC1Details?.examinationDate ||
                  ""
                }
                onChange={(e) =>
                  handleFieldChange("examination_date", e.target.value)
                }
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>EXAMINING OFFICER</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.examining_officer || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "examining_officer",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="ENTER EXAMINING OFFICER NAME"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>SUPERVISING OFFICER</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.supervising_officer || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "supervising_officer",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="ENTER SUPERVISING OFFICER NAME"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>COMMISSIONERATE</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.commissionerate || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "commissionerate",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="ENTER COMMISSIONERATE"
              />
            </div>

            <div style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={formik.values.verified_by_examining_officer || false}
                onChange={(e) =>
                  handleFieldChange(
                    "verified_by_examining_officer",
                    e.target.checked
                  )
                }
                style={{ width: 14, height: 14 }}
              />
              <span style={styles.checkboxLabel}>
                VERIFIED BY EXAMINING OFFICER
              </span>
            </div>

            <div style={{ ...styles.field, marginTop: 8 }}>
              <div style={styles.label}>SEAL NUMBER (ANNEX C1)</div>
              <input
                style={{
                  ...styles.input,
                  background: "#edf2f7",
                  cursor: "not-allowed",
                }}
                value={toUpper(formik.values.annex_seal_number || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "annex_seal_number",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="AUTO-FILLED FROM STUFFING SEAL NO"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN – ADMIN / RANGE / NOTES */}
        <div style={styles.col}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>ADMIN / RANGE DETAILS</div>

            <div style={styles.field}>
              <div style={styles.label}>DESIGNATION</div>
              <input
                style={styles.input}
                value={toUpper(formik.values.annex_designation || "")}
                onChange={(e) =>
                  handleFieldChange(
                    "annex_designation",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="ENTER DESIGNATION"
              />
            </div>

            <div style={styles.split}>
              <div style={styles.half}>
                <div style={styles.label}>DIVISION</div>
                <input
                  style={styles.input}
                  value={toUpper(formik.values.annex_division || "")}
                  onChange={(e) =>
                    handleFieldChange(
                      "annex_division",
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="ENTER DIVISION"
                />
              </div>
              <div style={styles.half}>
                <div style={styles.label}>RANGE</div>
                <input
                  style={styles.input}
                  value={toUpper(formik.values.annex_range || "")}
                  onChange={(e) =>
                    handleFieldChange(
                      "annex_range",
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="ENTER RANGE"
                />
              </div>
            </div>

            <div style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={formik.values.sample_forwarded || false}
                onChange={(e) =>
                  handleFieldChange("sample_forwarded", e.target.checked)
                }
                style={{ width: 14, height: 14 }}
              />
              <span style={styles.checkboxLabel}>SAMPLE FORWARDED TO PORT</span>
            </div>

            <div style={{ ...styles.field, marginTop: 10 }}>
              <div style={styles.label}>ADDITIONAL NOTES</div>
              <textarea
                style={styles.textarea}
                rows={4}
                value={formik.values.annex_additional_notes || ""}
                onChange={(e) =>
                  handleFieldChange(
                    "annex_additional_notes",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="ENTER ANY ADDITIONAL NOTES..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENTS GRID */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>ANNEX C1 DOCUMENTS</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>SR NO</th>
                <th style={styles.th}>DOCUMENT NAME</th>
                <th style={{ ...styles.th, width: 80 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(formik.values.annex_c1_documents || []).map((doc, index) => (
                <tr key={index}>
                  <td style={styles.td}>
                    <input
                      type="number"
                      style={{
                        ...styles.input,
                        height: 24,
                        textTransform: "none",
                        fontWeight: 500,
                      }}
                      value={doc.serialNo || index + 1}
                      onChange={(e) =>
                        handleDocChange(index, "serialNo", e.target.value)
                      }
                    />
                  </td>
                  <td style={styles.td}>
                    <input
                      style={{ ...styles.input, height: 24 }}
                      value={toUpper(doc.documentName || "")}
                      onChange={(e) =>
                        handleDocChange(
                          index,
                          "documentName",
                          e.target.value.toUpperCase()
                        )
                      }
                      placeholder="ENTER DOCUMENT NAME"
                    />
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.smallButton}
                      onClick={() => deleteDoc(index)}
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
              {(!formik.values.annex_c1_documents ||
                formik.values.annex_c1_documents.length === 0) && (
                <tr>
                  <td
                    style={{ ...styles.td, fontSize: 11, color: "#718096" }}
                    colSpan={3}
                  >
                    NO DOCUMENTS ADDED.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button type="button" style={styles.addButton} onClick={addDoc}>
          ADD DOCUMENT
        </button>
      </div>
    </div>
  );
}

export default AnnexC1DetailsTab;
