import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import FileUpload from "../gallery/FileUpload";
import ImagePreview from "../gallery/ImagePreview";
import { UserContext } from "../../contexts/UserContext";
import { Row, Col } from "react-bootstrap";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  Button,
  Snackbar,
} from "@mui/material";

const acceptedFileTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

const predefinedDocuments = [
  { document_name: "Commercial Invoice", document_code: "CINV" },
  { document_name: "Packing List", document_code: "PLIST" },
  { document_name: "Certificate of Origin", document_code: "COO" },
  { document_name: "Export License", document_code: "EXLIC" },
  { document_name: "Shipping Bill", document_code: "SB" },
  { document_name: "Bill of Lading", document_code: "BL" },
  { document_name: "Letter of Credit", document_code: "LC" },
  { document_name: "Quality Certificate", document_code: "QC" },
  { document_name: "Phytosanitary Certificate", document_code: "PHYTO" },
  { document_name: "Insurance Certificate", document_code: "INS" },
];

const EsanchitViewJob = () => {
  const { job_no } = useParams();
  const { user } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState(false);

  // Fetch and initialize data
  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/export/eshanchit/jobs/${job_no}`
        );
        const storedDocuments = res.data.documents || [];
        const mergedDocuments = predefinedDocuments.map((doc) => {
          const storedDoc =
            storedDocuments.find(
              (d) => d.document_code === doc.document_code
            ) || {};
          return {
            ...doc,
            url: storedDoc.url || [],
            document_number: storedDoc.document_number || "",
            verification_date: storedDoc.verification_date || "",
            is_verified: storedDoc.is_verified || false,
          };
        });
        formik.setValues({ cth_documents: mergedDocuments });
      } catch {
        alert("Failed to fetch documents!");
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, [job_no]);

  // Formik setup
  const formik = useFormik({
    initialValues: { cth_documents: [] },
    enableReinitialize: true,
    onSubmit: async (values) => {
      setSubmitting(true);
      const updatedDocs = values.cth_documents.filter(
        (doc) =>
          (doc.url && doc.url.length) ||
          doc.document_number ||
          doc.verification_date ||
          doc.is_verified
      );
      try {
        const res = await axios.patch(
          `${
            import.meta.env.VITE_API_STRING
          }/export/eshanchit/jobs/${job_no}/export-documents`,
          { documents: updatedDocs }
        );
        if (res.data.success) {
          setSnackbar(true);
        } else {
          alert("Failed to update documents");
        }
      } catch {
        alert("Error saving documents!");
      } finally {
        setSubmitting(false);
      }
    },
  });

  const isDisabled = user.role !== "Admin"; // example condition for disabling inputs

  const handleFileUpload = (urls, document) => {
    const idx = formik.values.cth_documents.findIndex(
      (d) =>
        d.document_code === document.document_code &&
        d.document_name === document.document_name
    );
    if (idx < 0) return;
    const updatedDocs = [...formik.values.cth_documents];
    updatedDocs[idx].url = [...(updatedDocs[idx].url || []), ...urls];
    formik.setFieldValue("cth_documents", updatedDocs);
  };

  const handleDeleteFile = (document, fileIdx) => {
    const idx = formik.values.cth_documents.findIndex(
      (d) =>
        d.document_code === document.document_code &&
        d.document_name === document.document_name
    );
    if (idx < 0) return;
    const updatedDocs = [...formik.values.cth_documents];
    updatedDocs[idx].url.splice(fileIdx, 1);
    formik.setFieldValue("cth_documents", updatedDocs);
  };

  if (loading) return <Typography>Loading documents...</Typography>;

  return (
    <form onSubmit={formik.handleSubmit}>
      <Box sx={{ p: 2, background: "#fff" }}>
        <Typography variant="h5" gutterBottom>
          Documents
        </Typography>

        {formik.values.cth_documents.map((document, idx) => (
          <Box
            key={document.document_code}
            sx={{ border: "1px solid #ddd", borderRadius: 1, p: 2, mb: 2 }}
          >
            <Row className="align-items-center">
              <Col
                xs={12}
                lg={4}
                style={{ marginBottom: 20, position: "relative" }}
              >
                <FileUpload
                  label={`${document.document_name} (${document.document_code})`}
                  bucketPath={`cth-documents/${document.document_name}`}
                  onFilesUploaded={(urls) => handleFileUpload(urls, document)}
                  multiple
                  readOnly={isDisabled}
                  acceptedFileTypes={acceptedFileTypes}
                />
                <ImagePreview
                  images={document.url || []}
                  onDeleteImage={(fileIdx) =>
                    handleDeleteFile(document, fileIdx)
                  }
                  readOnly={isDisabled}
                />
              </Col>

              <Col xs={12} lg={4}>
                <TextField
                  label="IRN"
                  size="small"
                  fullWidth
                  disabled={isDisabled}
                  value={document.document_number || ""}
                  onChange={(e) => {
                    const updatedDocs = [...formik.values.cth_documents];
                    updatedDocs[idx].document_number = e.target.value;
                    formik.setFieldValue("cth_documents", updatedDocs);
                  }}
                />
              </Col>

              <Col xs={12} lg={4}>
                <Box display="flex" alignItems="center">
                  <Checkbox
                    checked={!!document.verification_date}
                    disabled={isDisabled}
                    onChange={() => {
                      const updatedDocs = [...formik.values.cth_documents];
                      if (updatedDocs[idx].verification_date) {
                        updatedDocs[idx].verification_date = "";
                      } else {
                        updatedDocs[idx].verification_date = new Date()
                          .toISOString()
                          .slice(0, 10);
                      }
                      formik.setFieldValue("cth_documents", updatedDocs);
                    }}
                  />
                  <Typography>Approved Date</Typography>
                </Box>
                {user.role === "Admin" && (
                  <TextField
                    type="date"
                    fullWidth
                    size="small"
                    disabled={isDisabled}
                    value={document.verification_date || ""}
                    onChange={(e) => {
                      const updatedDocs = [...formik.values.cth_documents];
                      updatedDocs[idx].verification_date = e.target.value;
                      formik.setFieldValue("cth_documents", updatedDocs);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              </Col>
            </Row>
          </Box>
        ))}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Submit"}
          </Button>
        </Box>

        <Snackbar
          open={snackbar}
          message="Documents saved successfully."
          autoHideDuration={6000}
          onClose={() => setSnackbar(false)}
        />
      </Box>
    </form>
  );
};

export default EsanchitViewJob;
