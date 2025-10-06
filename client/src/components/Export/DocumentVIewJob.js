import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import FileUpload from "../gallery/FileUpload.js";
import ImagePreview from "../gallery/ImagePreview.js";
import {
  Button,
  CircularProgress,
  Typography,
  Box,
  Grid,
  Paper,
  Divider,
  Stack,
} from "@mui/material";

const acceptedFileTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

const labelMapping = {
  leo_copy: "LEO Copy",
  assessed_copy: "Assessed Copy",
  gate_pass_copy: "Gate Pass Copy",
};

const basicInfoFields = [
  { label: "Job Number", key: "job_no" },
  { label: "Custom House", key: "custom_house" },
  { label: "Exporter Name", key: "exporter_name" },
  { label: "Invoice Number", key: "invoice_number" },
  { label: "Invoice Date", key: "invoice_date" },
  { label: "Supplier/Exporter", key: "supplier_exporter" },
  { label: "Gross Weight", key: "gross_weight" },
  { label: "Net Weight", key: "net_weight" },
  { label: "Port of Origin", key: "port_of_origin" },
  { label: "Port of Discharge", key: "port_of_discharge" },
  {
    label: "Country of Final Destination",
    key: "country_of_final_destination",
  },
  { label: "Movement Type", key: "movement_type" },
  { label: "Priority", key: "priorityJob" },
  { label: "Bank Name", key: "bank_name" },
  { label: "CTH No", key: "cth_no" },
  { label: "Status", key: "status" },
  { label: "Detailed Status", key: "detailed_status" },
  { label: "Remarks", key: "remarks" },
  { label: "Authorized Dealer Code", key: "adCode" },
];

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString();
};

const DocumentViewJob = () => {
  const { job_no } = useParams();
  const [basicDetails, setBasicDetails] = useState(null);
  const [job, setJob] = useState(null);
  const [documents, setDocuments] = useState({
    leo_copy: [],
    assessed_copy: [],
    gate_pass_copy: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch job details including basic details from backend API
  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${
            import.meta.env.VITE_API_STRING
          }/export/documentation/jobs/${job_no}`
        );
        if (res.data.success) {
          setBasicDetails(res.data.basicDetails || {});
          setJob(res.data.job || {});
          setDocuments({
            leo_copy: res.data.job.leo_copy || [],
            assessed_copy: res.data.job.assessed_copy || [],
            gate_pass_copy: res.data.job.gate_pass_copy || [],
          });
        } else {
          alert("Failed to fetch job details");
        }
      } catch (err) {
        console.error(err);
        alert("Error fetching job details");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [job_no]);

  // Handle file uploads
  const handleFilesUploaded = (field, newFiles) => {
    setDocuments((prev) => ({
      ...prev,
      [field]: [...prev[field], ...newFiles],
    }));
  };

  // Handle deletion of uploaded files
  const handleDeleteImage = (field, index) => {
    setDocuments((prev) => {
      const updated = [...prev[field]];
      updated.splice(index, 1);
      return {
        ...prev,
        [field]: updated,
      };
    });
  };

  // Submit documents and update job status
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await axios.patch(
        `${
          import.meta.env.VITE_API_STRING
        }/export/documentation/jobs/${job_no}/submit`,
        {
          uploadedDocuments: documents,
        }
      );
      if (res.data.success) {
        alert("Job submitted successfully");
      } else {
        alert("Failed to submit job");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting job");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <CircularProgress
        size={40}
        sx={{ display: "block", margin: "40px auto" }}
      />
    );
  if (!job) return <Typography>No job data found for {job_no}</Typography>;

  return (
    <Box p={3}>
      <Button
        variant="outlined"
        sx={{ mb: 3 }}
        onClick={() => window.history.back()}
      >
        Back to Job List
      </Button>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" mb={2}>
          Job Basic Details
        </Typography>
        <Grid container spacing={2}>
          {basicInfoFields.map(({ label, key }) => {
            let val = basicDetails[key] ?? "-";
            if (key.toLowerCase().includes("date") || key === "invoice_date") {
              val = formatDate(val);
            }
            if (key === "priorityJob" && val) {
              const clr =
                val.toLowerCase() === "high"
                  ? "error"
                  : val.toLowerCase() === "urgent"
                  ? "warning"
                  : "default";
              return (
                <Grid key={key} item xs={6} sm={4} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {label}
                  </Typography>
                  <Typography variant="body1" color={clr} fontWeight="bold">
                    {val}
                  </Typography>
                </Grid>
              );
            }
            return (
              <Grid key={key} item xs={6} sm={4} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  {label}
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight="medium"
                  sx={{ wordBreak: "break-word" }}
                >
                  {val}
                </Typography>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Divider />

      {["leo_copy", "assessed_copy", "gate_pass_copy"].map((field) => (
        <Box key={field} mt={4}>
          <Typography variant="h6" gutterBottom>
            {labelMapping[field]}
          </Typography>
          <FileUpload
            label={`Upload ${labelMapping[field]}`}
            bucketPath={field}
            onFilesUploaded={(newFiles) => handleFilesUploaded(field, newFiles)}
            multiple={true}
            acceptedFileTypes={acceptedFileTypes}
          />
          <ImagePreview
            images={documents[field]}
            onDeleteImage={(index) => handleDeleteImage(field, index)}
          />
        </Box>
      ))}

      <Box mt={5} textAlign="right">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting}
          size="large"
        >
          {submitting ? "Submitting..." : "Submit Job"}
        </Button>
      </Box>
    </Box>
  );
};

export default DocumentViewJob;
