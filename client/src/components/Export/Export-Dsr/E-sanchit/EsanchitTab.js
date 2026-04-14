// ESanchitTab.jsx
import React, { useState } from "react";
import ESanchitEditDialog from "./ESanchitEditDialog";
import { formatDate } from "../../../../utils/dateUtils";

// Enterprise styles
// Enterprise styles matching ProductMainTab
const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 12,
    color: "#1f2933",
    padding: 12,
    background: "#f5f7fb",
    minHeight: "100%",
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
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    fontSize: 11,
    fontWeight: 700,
    color: "#f9fafb",
    background: "#16408f",
    padding: "8px 8px",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 10,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 8px",
    borderBottom: "1px solid #e0e5f0",
    color: "#111827",
    fontWeight: 600,
  },
  primaryButton: {
    padding: "6px 14px",
    borderRadius: 4,
    border: "1px solid #16408f",
    backgroundColor: "#16408f",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(15,23,42,0.15)",
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
  emptyRow: {
    textAlign: "center",
    color: "#9ca3af",
    fontStyle: "italic",
    padding: "20px 0",
  },
  footerBar: {
    marginTop: 8,
    display: "flex",
    justifyContent: "flex-start",
  },
};

const ESanchitTab = ({ formik }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleNew = () => {
    setSelectedDoc(null);
    setEditMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (doc, idx) => {
    setSelectedDoc({ ...doc, _index: idx });
    setEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = (updatedDoc) => {
    const documents = [...(formik.values.eSanchitDocuments || [])];
    if (editMode && selectedDoc && selectedDoc._index !== undefined) {
      documents[selectedDoc._index] = updatedDoc;
    } else {
      documents.push(updatedDoc);
    }
    formik.setFieldValue("eSanchitDocuments", documents);
    setIsDialogOpen(false);
  };

  const handleDelete = (idx) => {
    const doc = docs[idx];
    const label = doc.irn || doc.documentReferenceNo || `Row ${idx + 1}`;
    if (window.confirm(`⚠️ Are you sure you want to delete e-Sanchit document "${label}"?\n\nThis action cannot be undone.`)) {
      const updated = [...(formik.values.eSanchitDocuments || [])];
      updated.splice(idx, 1);
      formik.setFieldValue("eSanchitDocuments", updated);
    }
  };

  const docs = formik.values.eSanchitDocuments || [];

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>e-Sanchit Uploads</div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Doc. Level</th>
                <th style={styles.th}>Scope</th>
                <th style={styles.th}>Inv. Sr. No.</th>
                <th style={styles.th}>Item Sr. No.</th>
                <th style={styles.th}>Doc. IRN</th>
                <th style={styles.th}>Doc. Type</th>
                <th style={styles.th}>Doc. Ref. No.</th>
                <th style={styles.th}>ICEGATE ID</th>
                <th style={styles.th}>ICEGATE Filename</th>
                <th style={styles.th}>Doc. Issue Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, idx) => (
                <tr
                  key={idx}
                  style={{ ...styles.rowClickable }}
                  onClick={() => handleEdit(doc, idx)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f7fb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <td style={styles.td}>{doc.documentLevel || "Invoice"}</td>
                  <td style={styles.td}>{doc.scope || "This job only"}</td>
                  <td style={styles.td}>{doc.invSerialNo}</td>
                  <td style={styles.td}>{doc.itemSerialNo}</td>
                  <td style={styles.td}>{doc.irn}</td>
                  <td style={styles.td}>{doc.documentType}</td>
                  <td style={styles.td}>{doc.documentReferenceNo}</td>
                  <td style={styles.td}>{doc.otherIcegateId}</td>
                  <td style={styles.td}>{doc.icegateFilename}</td>
                  <td style={styles.td}>
                    {doc.dateOfIssue
                      ? formatDate(doc.dateOfIssue)
                      : ""}
                  </td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      style={styles.smallButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(doc, idx);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={styles.linkButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(idx);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {docs.length === 0 && (
                <tr>
                  <td style={{ ...styles.td, ...styles.emptyRow }} colSpan={11}>
                    No eSanchit documents added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footerBar}>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={handleNew}
          >
            New
          </button>
        </div>
      </div>

      {isDialogOpen && (
        <ESanchitEditDialog
          open={isDialogOpen}
          doc={selectedDoc}
          setDoc={setSelectedDoc}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
          jobData={formik.values}
        />
      )}
    </div>
  );
};

export default ESanchitTab;
