import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Grid,
} from "@mui/material";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_STRING}/exports/job`; // Assuming this API takes ?jobNo= param and returns details

const SubmissionJobDetail = () => {
  const { jobNo } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchJob() {
      try {
        setLoading(true);
        const res = await axios.get(API_URL, { params: { jobNo } });
        if (res.data.success) {
          setJob(res.data.data.job);
        } else {
          setError("Job not found");
        }
      } catch (err) {
        setError(err.message || "Error fetching job details");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [jobNo]);

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" mt={4}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <Paper sx={{ maxWidth: 800, mx: "auto", mt: 4, p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Job Details - {job.job_no}
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(job).map(([key, value]) => {
          // Optionally, format dates or special fields here
          let displayValue = value;
          if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            // Basic ISO datetime string check
            displayValue = new Date(value).toLocaleString();
          }
          if (value === null || value === undefined || value === "") {
            displayValue = "-";
          }
          return (
            <Grid item xs={6} key={key}>
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
              >
                {key.replace(/_/g, " ").toUpperCase()}
              </Typography>
              <Typography variant="body1">{displayValue.toString()}</Typography>
            </Grid>
          );
        })}
      </Grid>
      <Box mt={3}>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Back to Jobs List
        </Button>
      </Box>
    </Paper>
  );
};

export default SubmissionJobDetail;
