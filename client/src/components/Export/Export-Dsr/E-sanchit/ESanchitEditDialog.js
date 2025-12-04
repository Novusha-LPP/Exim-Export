import React, { useEffect, useState } from "react";
import axios from "axios";
import FileUpload from "../../../gallery/FileUpload.js";
import ImagePreview from "../../../gallery/ImagePreview.js";
import ConfirmDialog from "../../../gallery/ConfirmDialog.js";

// Helper
function toUpper(val) {
  return (typeof val === "string" ? val : "")?.toUpperCase() || "";
}

// Enterprise styles
const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15,23,42,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 1300,
    overflowY: "auto",
    padding: "20px 0",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontWeight: "700",
  },
  container: {
    backgroundColor: "#ffffff",
    width: "98vw",
    maxWidth: "980px",
    borderRadius: 6,
    boxShadow: "0 18px 45px rgba(15,23,42,0.45)",
    display: "flex",
    flexDirection: "column",
    fontSize: 11,
    color: "#111827",
    border: "1px solid #1d4ed8",
    margin: "auto",
  },
  header: {
    background: "linear-gradient(to bottom, #e0ecff 0%, #c7d7ff 100%)",
    borderBottom: "1px solid #1d4ed8",
    padding: "8px 12px",
    fontWeight: 700,
    color: "#1d4ed8",
    fontSize: 12,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  body: {
    padding: "10px 12px 12px 12px",
    backgroundColor: "#f3f4f6",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  row: {
    display: "flex",
    gap: 16,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  fieldGroup: {
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  label: {
    width: 120,
    fontWeight: 700,
    color: "#374151",
    fontSize: 10,
    flexShrink: 0,
    textTransform: "uppercase",
  },
  input: {
    flex: 1,
    padding: "3px 6px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    fontSize: 11,
    outline: "none",
    height: 24,
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
    fontWeight: 700,
  },
  select: {
    flex: 1,
    padding: "0 4px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    fontSize: 11,
    height: 24,
    backgroundColor: "#ffffff",
    boxSizing: "border-box",
        fontWeight: 700,

  },
  sectionTitleLink: {
    fontWeight: 700,
    color: "#1d4ed8",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    margin: "6px 0 4px 0",
  },
  docSectionContainer: {
    marginTop: 8,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6,
  },
  docHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1d4ed8",
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: "0.04em",
  },
  footerActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #e5e7eb",
  },
  btnPrimary: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "1px solid #1d4ed8",
    padding: "6px 16px",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    boxShadow: "0 1px 2px rgba(15,23,42,0.2)",
  },
  btnSecondary: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "6px 14px",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  },
};

// Small field helper
const Field = ({ label, value, onChange, type = "text", disabled = false }) => (
  <div style={s.fieldGroup}>
    <span style={s.label}>{label}</span>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        ...s.input,
        backgroundColor: disabled ? "#e5e7eb" : "#ffffff",
      }}
    />
  </div>
);

const ESanchitEditDialog = ({ open, onClose, onSave, doc, setDoc }) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);

  const safeDoc = doc || {};

  useEffect(() => {
    if (setDoc && doc) setDoc(doc);
  }, [doc, setDoc]);

  useEffect(() => {
    if (!open) return;
    const fetchOrgs = async () => {
      try {
        setOrgLoading(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/directory`
        );
        if (res.data?.success) setOrganizations(res.data.data || []);
      } catch (e) {
        console.error("Error fetching organizations for eSanchit", e);
      } finally {
        setOrgLoading(false);
      }
    };
    fetchOrgs();
  }, [open]);

  const issuingParty = safeDoc.issuingParty || {};
  const beneficiaryParty = safeDoc.beneficiaryParty || {};
  const level = safeDoc.documentLevel || "Invoice";

  const disableInvSrNo = level === "Job" || level === "Item";
  const disableItemSrNo = level === "Job" || level === "Invoice";

  const handleFieldChange = (field, value) => {
    setDoc((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleIssuingPartyChange = (field, value) => {
    setDoc((prev) => ({
      ...(prev || {}),
      issuingParty: { ...(prev?.issuingParty || {}), [field]: value },
    }));
  };

  const handleBeneficiaryPartyChange = (field, value) => {
    setDoc((prev) => ({
      ...(prev || {}),
      beneficiaryParty: { ...(prev?.beneficiaryParty || {}), [field]: value },
    }));
  };

  const onSelectIssuingParty = (e) => {
    const val = toUpper(e.target.value);
    handleIssuingPartyChange("name", val);
    const org = organizations.find(
      (o) => toUpper(o.organization || "") === val
    );
    if (!org) return;
    const branch = org.branchInfo?.[0] || {};
    handleIssuingPartyChange("code", toUpper(branch.branchCode || ""));
    handleIssuingPartyChange("addressLine1", toUpper(branch.address || ""));
    handleIssuingPartyChange("addressLine2", "");
    handleIssuingPartyChange("city", toUpper(branch.city || ""));
    handleIssuingPartyChange("pinCode", toUpper(branch.postalCode || ""));
  };

  const onSelectBeneficiaryParty = (e) => {
    const val = toUpper(e.target.value);
    handleBeneficiaryPartyChange("name", val);
    const org = organizations.find(
      (o) => toUpper(o.organization || "") === val
    );
    if (!org) return;
    const branch = org.branchInfo?.[0] || {};
    handleBeneficiaryPartyChange("code", toUpper(branch.branchCode || ""));
    handleBeneficiaryPartyChange("addressLine1", toUpper(branch.address || ""));
    handleBeneficiaryPartyChange("addressLine2", "");
    handleBeneficiaryPartyChange("city", toUpper(branch.city || ""));
    handleBeneficiaryPartyChange("pinCode", toUpper(branch.postalCode || ""));
  };

  const handleConfirmDelete = () => {
    handleFieldChange("fileUrl", "");
    setDeleteConfirmOpen(false);
  };

  const fileArray = safeDoc.fileUrl ? [safeDoc.fileUrl] : [];

  if (!open) return null;

  return (
    <div style={s.overlay}>
      <div style={s.container}>
        <div style={s.header}>ESANCHIT DOCUMENT DETAILS</div>

        <div style={s.body}>
          {/* Top details rows */}
          <div style={s.row}>
            <div style={s.col}>
              <div style={s.fieldGroup}>
                <span style={s.label}>Document Level</span>
                <select
                  style={s.select}
                  value={safeDoc.documentLevel || "Invoice"}
                  onChange={(e) =>
                    handleFieldChange("documentLevel", e.target.value)
                  }
                >
                  <option value="Job">Job</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Item">Item</option>
                </select>
              </div>
              <Field
                label="Inv. Sr. No."
                value={safeDoc.invSerialNo}
                onChange={(v) => handleFieldChange("invSerialNo", v)}
                disabled={disableInvSrNo}
              />
              <Field
                label="IRN (Image Ref)"
                value={safeDoc.irn}
                onChange={(v) => handleFieldChange("irn", v)}
              />
              <div style={s.fieldGroup}>
                <span style={s.label}>ICEGATE ID</span>
                <select
                  style={s.select}
                  value={safeDoc.icegateIdSelect || ""}
                  onChange={(e) =>
                    handleFieldChange("icegateIdSelect", e.target.value)
                  }
                >
                  <option value="">-- Select --</option>
                  <option value="RAJANSFPL - GCard - RAJANSFPL">
                    RAJANSFPL - GCard - RAJANSFPL
                  </option>
                  <option value="SURAJAHD - FCard - SURAJAHD">
                    SURAJAHD - FCard - SURAJAHD
                  </option>
                  <option value="SURAJAMD - GCard - SURAJAMD">
                    SURAJAMD - GCard - SURAJAMD
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <Field
                label="ICEGATE Filename"
                value={safeDoc.icegateFilename}
                onChange={(v) => handleFieldChange("icegateFilename", v)}
              />
              <Field
                label="Date-Time Upload"
                type="datetime-local"
                value={
                  safeDoc.dateTimeOfUpload
                    ? safeDoc.dateTimeOfUpload.substring(0, 16)
                    : ""
                }
                onChange={(v) => handleFieldChange("dateTimeOfUpload", v)}
              />
              <Field
                label="Doc Ref No."
                value={safeDoc.documentReferenceNo}
                onChange={(v) => handleFieldChange("documentReferenceNo", v)}
              />
              <Field
                label="Date of Issue"
                type="date"
                value={
                  safeDoc.dateOfIssue
                    ? safeDoc.dateOfIssue.substring(0, 10)
                    : ""
                }
                onChange={(v) => handleFieldChange("dateOfIssue", v)}
              />
            </div>

            <div style={s.col}>
              <div style={s.fieldGroup}>
                <span style={s.label}>Scope</span>
                <select
                  style={s.select}
                  value={safeDoc.scope || "This job only"}
                  onChange={(e) => handleFieldChange("scope", e.target.value)}
                >
                  <option value="This job only">This job only</option>
                  <option value="Multiple jobs">Multiple jobs</option>
                </select>
              </div>
              <Field
                label="Item Sr. No."
                value={safeDoc.itemSerialNo}
                onChange={(v) => handleFieldChange("itemSerialNo", v)}
                disabled={disableItemSrNo}
              />
              <div style={s.fieldGroup}>
                <span style={s.label}>Document Type</span>
                <select
                  style={s.select}
                  value={safeDoc.documentType || ""}
                  onChange={(e) =>
                    handleFieldChange("documentType", e.target.value)
                  }
                >
                  <option value="">Select Type...</option>
                  <option value="380">Commercial Invoice</option>
                  <option value="Packing List">Packing List</option>
                </select>
              </div>
              <Field
                label="Other ICEGATE ID"
                value={safeDoc.icegateId}
                onChange={(v) => handleFieldChange("icegateId", v)}
              />
              <Field
                label="File Type"
                value="PDF"
                onChange={() => {}}
                disabled
              />
              <Field
                label="Place of Issue"
                value={safeDoc.placeOfIssue}
                onChange={(v) => handleFieldChange("placeOfIssue", v)}
              />
              <Field
                label="Expiry Date"
                type="date"
                value={
                  safeDoc.expiryDate ? safeDoc.expiryDate.substring(0, 10) : ""
                }
                onChange={(v) => handleFieldChange("expiryDate", v)}
              />
            </div>
          </div>

          {/* Party details */}
          <div style={s.row}>
            <div style={s.col}>
              <div style={s.sectionTitleLink}>Issuing Party Details</div>
              <div style={s.fieldGroup}>
                <span style={s.label}>
                  Name {orgLoading ? "(...)" : ""}
                </span>
                <select
                  style={s.select}
                  value={issuingParty.name || ""}
                  onChange={onSelectIssuingParty}
                >
                  <option value="">-- Select --</option>
                  {organizations.map((o) => (
                    <option
                      key={o._id || o.organization}
                      value={toUpper(o.organization || "")}
                    >
                      {toUpper(o.organization || "")}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Code"
                value={issuingParty.code}
                onChange={(v) => handleIssuingPartyChange("code", v)}
              />
              <Field
                label="Address Line 1"
                value={issuingParty.addressLine1}
                onChange={(v) =>
                  handleIssuingPartyChange("addressLine1", v)
                }
              />
              <Field
                label="Address Line 2"
                value={issuingParty.addressLine2}
                onChange={(v) =>
                  handleIssuingPartyChange("addressLine2", v)
                }
              />
              <Field
                label="City"
                value={issuingParty.city}
                onChange={(v) => handleIssuingPartyChange("city", v)}
              />
              <Field
                label="Pin Code"
                value={issuingParty.pinCode}
                onChange={(v) => handleIssuingPartyChange("pinCode", v)}
              />
            </div>

            <div style={s.col}>
              <div style={s.sectionTitleLink}>Beneficiary Party Details</div>
              <div style={s.fieldGroup}>
                <span style={s.label}>
                  Name {orgLoading ? "(...)" : ""}
                </span>
                <select
                  style={s.select}
                  value={beneficiaryParty.name || ""}
                  onChange={onSelectBeneficiaryParty}
                >
                  <option value="">-- Select --</option>
                  {organizations.map((o) => (
                    <option
                      key={o._id || o.organization}
                      value={toUpper(o.organization || "")}
                    >
                      {toUpper(o.organization || "")}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="Code"
                value={beneficiaryParty.code}
                onChange={(v) => handleBeneficiaryPartyChange("code", v)}
              />
              <Field
                label="Address Line 1"
                value={beneficiaryParty.addressLine1}
                onChange={(v) =>
                  handleBeneficiaryPartyChange("addressLine1", v)
                }
              />
              <Field
                label="Address Line 2"
                value={beneficiaryParty.addressLine2}
                onChange={(v) =>
                  handleBeneficiaryPartyChange("addressLine2", v)
                }
              />
              <Field
                label="City"
                value={beneficiaryParty.city}
                onChange={(v) =>
                  handleBeneficiaryPartyChange("city", v)
                }
              />
              <Field
                label="Pin Code"
                value={beneficiaryParty.pinCode}
                onChange={(v) =>
                  handleBeneficiaryPartyChange("pinCode", v)
                }
              />
            </div>
          </div>

          {/* Unsigned document section */}
          <div style={s.docSectionContainer}>
            <div style={s.docHeader}>Unsigned Document PDF</div>

            {!safeDoc.fileUrl && (
              <div style={{ marginBottom: 8 }}>
                <FileUpload
                  label="Browse"
                  bucketPath="esanchit"
                  multiple={false}
                  acceptedFileTypes={[".pdf", ".jpg", ".png"]}
                  onFilesUploaded={(urls) => {
                    const url = urls && urls.length ? urls[0] : "";
                    handleFieldChange("fileUrl", url);
                  }}
                />
              </div>
            )}

            <ImagePreview
              images={fileArray}
              readOnly={false}
              onDeleteImage={() => setDeleteConfirmOpen(true)}
            />
          </div>

          {/* Footer buttons */}
          <div style={s.footerActions}>
            <button
              type="button"
              style={s.btnPrimary}
              onClick={() => onSave(safeDoc)}
            >
              Save
            </button>
            <button type="button" style={s.btnSecondary} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        handleClose={() => setDeleteConfirmOpen(false)}
        handleConfirm={handleConfirmDelete}
        message="Are you sure you want to remove this file?"
        isEdit={false}
      />
    </div>
  );
};

export default ESanchitEditDialog;
