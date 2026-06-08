import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Checkbox,
  Typography,
  TextField,
  Box,
  Chip,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import axios from "axios";

const CreateClubJobModal = ({ open, onClose, currentJob, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open && currentJob?.year) {
      fetchEligibleJobs();
      setSearchQuery("");
    }
  }, [open, currentJob]);

  const fetchEligibleJobs = async () => {
    try {
      setLoading(true);
      // We'll fetch jobs for the same year to club using the global search endpoint
      const res = await axios.get(
        `${import.meta.env.VITE_API_STRING}/global-search-jobs?year=${currentJob.year}&limit=1000`
      );
      
      if (res.data?.success) {
        const targetParentJobNo = currentJob.is_club_job_parent ? currentJob.job_no : currentJob.parent_club_job;

        const eligibleJobs = res.data.data.jobs.filter(
          (j) =>
            j.job_no !== currentJob.job_no &&
            !j.is_club_job_parent &&
            (!j.parent_club_job || (targetParentJobNo && j.parent_club_job === targetParentJobNo))
        );
        setJobs(eligibleJobs);

        if (targetParentJobNo) {
          try {
            const parentRes = await axios.get(
              `${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(targetParentJobNo)}`
            );
            if (parentRes.data?.clubbed_jobs) {
              setSelectedJobs(parentRes.data.clubbed_jobs.filter(j => j !== currentJob.job_no && j !== targetParentJobNo));
            }
          } catch (err) {
            console.error("Failed to fetch parent job details", err);
          }
        } else {
          setSelectedJobs([]);
        }
      }
    } catch (error) {
      console.error("Error fetching jobs to club:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJob = (jobNo) => {
    setSelectedJobs((prev) =>
      prev.includes(jobNo)
        ? prev.filter((no) => no !== jobNo)
        : [...prev, jobNo]
    );
  };

  const handleSubmit = async () => {
    const targetParentJobNo = currentJob?.is_club_job_parent ? currentJob?.job_no : currentJob?.parent_club_job;
    const parentJobNo = targetParentJobNo || currentJob?.job_no;
    const isExistingClub = !!targetParentJobNo;

    if (!isExistingClub && selectedJobs.length === 0) return;

    try {
      setLoading(true);
      // Always include parent and current job, plus any other selected jobs
      const finalSelectedJobs = [...new Set([parentJobNo, currentJob?.job_no, ...selectedJobs])];
      
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/create-club-job`, {
        selected_job_nos: finalSelectedJobs,
        primary_job_no: parentJobNo
      });

      if (res.data?.success) {
        onSuccess(res.data.job_no);
        onClose();
      }
    } catch (error) {
      console.error("Error updating club job:", error);
      alert("Failed to update club job");
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const searchLower = searchQuery.toLowerCase();
    const jobNo = (job.job_no || "").toLowerCase();
    const sbNo = (job.sb_no || "").toLowerCase();
    
    return jobNo.includes(searchLower) || sbNo.includes(searchLower);
  });

  const sortedFilteredJobs = [...filteredJobs].sort((a, b) => {
    const aSelected = selectedJobs.includes(a.job_no);
    const bSelected = selectedJobs.includes(b.job_no);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  const targetParentJobNo = currentJob?.is_club_job_parent ? currentJob?.job_no : currentJob?.parent_club_job;
  const isExistingClub = !!targetParentJobNo;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: "18px", color: "#0f172a", pb: 1.5 }}>
        {isExistingClub ? "Manage Club Job" : "Create Club Job"}
      </DialogTitle>
      
      <DialogContent dividers sx={{ borderColor: "#f1f5f9", px: 3, py: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "16px",
          }}
        >
          <InfoIcon sx={{ color: "#3b82f6", fontSize: 18, marginTop: "2px" }} />
          <Typography sx={{ fontSize: "12.5px", color: "#1e3a8a", lineHeight: 1.5, fontWeight: 500 }}>
            {isExistingClub ? (
              <>
                The current job <strong>{currentJob?.job_no}</strong> is part of a club job (Parent: <strong>{targetParentJobNo}</strong>). Select additional jobs to add, or uncheck to remove them:
              </>
            ) : (
              <>
                The current job <strong>{currentJob?.job_no}</strong> will automatically be included. Select additional jobs to club below:
              </>
            )}
          </Typography>
        </Box>

        {loading && jobs.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <CircularProgress size={28} />
          </div>
        ) : jobs.length === 0 ? (
          <Typography variant="body2" color="error" sx={{ py: 2, textAlign: "center" }}>
            No other eligible jobs found for this year.
          </Typography>
        ) : (
          <>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder="Search by Job No or SB No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                marginBottom: "12px",
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  "& fieldset": {
                    borderColor: "#e2e8f0",
                  },
                  "&:hover fieldset": {
                    borderColor: "#cbd5e1",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#3b82f6",
                  },
                },
              }}
            />
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4, maxHeight: "360px", overflowY: "auto", paddingRight: 4 }}>
              {sortedFilteredJobs.length > 0 ? (
                sortedFilteredJobs.map((job) => {
                  const isChecked = selectedJobs.includes(job.job_no);
                  const wasAlreadyMember = job.parent_club_job === targetParentJobNo;
                  
                  let chipLabel = "";
                  let chipBg = "";
                  let chipColor = "";
                  
                  if (isChecked) {
                    if (wasAlreadyMember) {
                      chipLabel = "Club Member";
                      chipBg = "#e0f2fe";
                      chipColor = "#0369a1";
                    } else {
                      chipLabel = "To Add";
                      chipBg = "#dcfce7";
                      chipColor = "#15803d";
                    }
                  } else if (wasAlreadyMember) {
                    chipLabel = "To Remove";
                    chipBg = "#fee2e2";
                    chipColor = "#b91c1c";
                  }

                  return (
                    <Box
                      key={job.job_no}
                      onClick={() => handleToggleJob(job.job_no)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: isChecked ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                        backgroundColor: isChecked ? "#f0f9ff" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: isChecked ? "#e0f2fe" : "#f8fafc",
                          borderColor: isChecked ? "#2563eb" : "#cbd5e1",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <Checkbox
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation(); // prevent double toggle due to Box onClick
                            handleToggleJob(job.job_no);
                          }}
                          size="small"
                          sx={{
                            color: "#cbd5e1",
                            "&.Mui-checked": {
                              color: "#3b82f6",
                            },
                            padding: 0,
                          }}
                        />
                        <Box>
                          <Typography
                            sx={{
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#1e293b",
                            }}
                          >
                            {job.job_no}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "11px",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            {job.sb_no ? `SB: ${job.sb_no}` : "No SB Filed"}
                          </Typography>
                        </Box>
                      </Box>
                      {chipLabel && (
                        <Chip
                          label={chipLabel}
                          size="small"
                          sx={{
                            height: "20px",
                            fontSize: "10px",
                            fontWeight: 600,
                            backgroundColor: chipBg,
                            color: chipColor,
                            border: "none",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="textSecondary" style={{ textAlign: "center", marginTop: 20 }}>
                  No jobs match your search.
                </Typography>
              )}
            </div>
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9" }}>
        <Button 
          onClick={onClose} 
          disabled={loading} 
          color="inherit"
          sx={{ textTransform: "none", fontWeight: 600, fontSize: "13px", borderRadius: "6px" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || (!isExistingClub && selectedJobs.length === 0)}
          variant="contained"
          sx={{ 
            textTransform: "none", 
            fontWeight: 600, 
            fontSize: "13px", 
            borderRadius: "6px",
            backgroundColor: "#2563eb",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#1d4ed8",
              boxShadow: "none"
            }
          }}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isExistingClub ? "Update Club Job" : "Create Club Job"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateClubJobModal;
