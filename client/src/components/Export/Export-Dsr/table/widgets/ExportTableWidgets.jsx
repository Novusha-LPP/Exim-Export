import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  IconButton,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { uploadFileToS3 } from "../../../../../utils/awsFileUpload";

export const QuickUploadButton = ({ job, field, uploadType = "status", idx = 0, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFileToS3(file, "export_docs");
      const url = result.Location;

      let dotPath = "";
      let currentFiles = [];

      if (uploadType === "toplevel") {
        dotPath = field;
        currentFiles = Array.isArray(job[field]) ? [...job[field]] : [];
      } else if (uploadType === "section") {
        dotPath = `operations.0.${field}.${idx}.images`;
        const ops = job.operations?.[0] || {};
        const section = Array.isArray(ops[field]) ? ops[field] : [];
        const item = section[idx] || {};
        currentFiles = Array.isArray(item.images) ? [...item.images] : [];
      } else if (uploadType === "container") {
        dotPath = `containers.${idx}.${field}`;
        const container = job.containers?.[idx] || {};
        currentFiles = Array.isArray(container[field]) ? [...container[field]] : [];
      } else {
        dotPath = `operations.0.statusDetails.0.${field}`;
        const ops = job.operations?.[0] || {};
        const status = (ops.statusDetails && ops.statusDetails[0]) || {};
        currentFiles = Array.isArray(status[field]) ? [...status[field]] : [];
      }

      const newValue = [...currentFiles, url];

      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(job.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: newValue }]
        }
      );

      if (onSuccess) onSuccess(url);
    } catch (err) {
      console.error("Quick upload err:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
        disabled={uploading}
        style={{ padding: "1px", marginLeft: "2px" }}
        title="Quick Upload Document"
      >
        {uploading ? (
          <CircularProgress size={12} style={{ color: "#16408f" }} />
        ) : (
          <CloudUploadIcon style={{ fontSize: "14px", color: "#16408f" }} />
        )}
      </IconButton>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.mp4,.webm,.ogg,.mov,.avi,.mkv,.3gp,application/pdf,image/jpeg,image/png,video/*"
        style={{ display: "none" }}
      />
    </>
  );
};

export const QuickDeleteButton = ({ job, field, url, uploadType = "status", idx = 0, onSuccess }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    setDeleting(true);
    try {
      let dotPath = "";
      let currentFiles = [];
      let newValue = [];

      if (uploadType === "toplevel") {
        dotPath = field;
        currentFiles = Array.isArray(job[field]) ? [...job[field]] : [];
        newValue = currentFiles.filter(f => f !== url);
      } else if (uploadType === "section") {
        dotPath = `operations.0.${field}.${idx}.images`;
        const ops = job.operations?.[0] || {};
        const section = Array.isArray(ops[field]) ? ops[field] : [];
        const item = section[idx] || {};
        currentFiles = Array.isArray(item.images) ? [...item.images] : [];
        newValue = currentFiles.filter(f => f !== url);
      } else if (uploadType === "container") {
        dotPath = `containers.${idx}.${field}`;
        const container = job.containers?.[idx] || {};
        currentFiles = Array.isArray(container[field]) ? [...container[field]] : [];
        newValue = currentFiles.filter(f => f !== url);
      } else if (uploadType === "custom") {
        dotPath = `operations.0.statusDetails.0.otherDocsCustom`;
        const ops = job.operations?.[0] || {};
        const status = (ops.statusDetails && ops.statusDetails[0]) || {};
        currentFiles = Array.isArray(status.otherDocsCustom) ? [...status.otherDocsCustom] : [];
        newValue = currentFiles.filter(f => f.url !== url);
      } else {
        dotPath = `operations.0.statusDetails.0.${field}`;
        const ops = job.operations?.[0] || {};
        const status = (ops.statusDetails && ops.statusDetails[0]) || {};
        currentFiles = Array.isArray(status[field]) ? [...status[field]] : [];
        newValue = currentFiles.filter(f => f !== url);
      }

      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(job.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: newValue }]
        }
      );

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Quick delete err:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <IconButton
      size="small"
      onClick={(e) => handleDelete(e)}
      disabled={deleting}
      style={{ padding: "1px", marginLeft: "2px" }}
      title="Delete Document"
    >
      {deleting ? (
        <CircularProgress size={12} style={{ color: "#dc2626" }} />
      ) : (
        <DeleteIcon style={{ fontSize: "14px", color: "#dc2626" }} />
      )}
    </IconButton>
  );
};

export const CustomDocCreatorItem = ({ job, onSuccess }) => {
  const [customName, setCustomName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadClick = (e) => {
    e.stopPropagation();
    if (!customName.trim()) {
      alert("Please enter a document name first.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFileToS3(file, "export_docs");
      const url = result.Location;

      const ops = job.operations?.[0] || {};
      const status = (ops.statusDetails && ops.statusDetails[0]) || {};
      const currentItems = Array.isArray(status.otherDocsCustom) ? [...status.otherDocsCustom] : [];

      const newItem = {
        name: customName.trim(),
        url: url,
        uploadedAt: new Date()
      };

      const dotPath = "operations.0.statusDetails.0.otherDocsCustom";
      const newValue = [...currentItems, newItem];

      const res = await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(job.job_no)}/fields`,
        {
          fieldUpdates: [{ field: dotPath, value: newValue }]
        }
      );

      setCustomName("");
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      console.error("Custom doc upload err:", err);
      alert("Failed to upload custom document.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}
    >
      <input
        type="text"
        placeholder="Custom doc name..."
        value={customName}
        onChange={(e) => setCustomName(e.target.value)}
        style={{
          flex: 1,
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #cbd5e1',
          outline: 'none',
          minWidth: 0
        }}
      />
      <IconButton
        size="small"
        onClick={handleUploadClick}
        disabled={uploading}
        style={{ padding: "4px" }}
        title="Upload Custom Document"
      >
        {uploading ? (
          <CircularProgress size={16} />
        ) : (
          <CloudUploadIcon style={{ fontSize: "16px", color: "#0284c7" }} />
        )}
      </IconButton>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.mp4,.webm,.ogg,.mov,.avi,.mkv,.3gp,application/pdf,image/jpeg,image/png,video/*"
        style={{ display: "none" }}
      />
    </div>
  );
};

export const PulseOverviewHover = ({ exporter, year }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchPulse = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_STRING}/export-analytics/pulse`, {
          params: { exporter, year: year || undefined }
        });
        if (active && response.data.success) {
          setSummary(response.data.summary);
        }
      } catch (error) {
        console.error("Pulse fetch error in hover overview:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPulse();
    return () => { active = false; };
  }, [exporter, year]);

  if (loading || !summary) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '200px', bgcolor: '#0b0f19', color: '#94a3b8', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <CircularProgress size={16} sx={{ color: '#f87171', mr: 1.5 }} />
        <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>FETCHING OVERVIEW...</span>
      </Box>
    );
  }

  const getSeverity = (title, value) => {
    if (title === "CREATED TODAY") {
      return value > 0 ? 'green' : 'amber';
    }
    return value === 0 ? 'green' : value <= 10 ? 'amber' : 'red';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'green') return '#10b981';
    if (severity === 'amber') return '#f59e0b';
    return '#ef4444';
  };

  const getSeverityBg = (severity) => {
    if (severity === 'green') return 'rgba(16, 185, 129, 0.1)';
    if (severity === 'amber') return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
  };

  const getSeverityGlow = (severity) => {
    if (severity === 'green') return '#34d399';
    if (severity === 'amber') return '#fbbf24';
    return '#f87171';
  };

  const getStatusLabel = (severity) => {
    if (severity === 'green') return '🏆 ALL CLEAR';
    if (severity === 'amber') return '⚡ PENDING';
    return '🚨 ACTION REQUIRED';
  };

  const metrics = [
    { title: "PENDING JOBS", value: summary.pending ?? summary.totalPending },
    { title: "HANDOVER PENDING", value: summary.handover },
    { title: "BILLING PENDING", value: summary.billing },
    { title: "OPERATIONS PENDING", value: summary.ops },
    { title: "CREATED TODAY", value: summary.createdToday },
  ];

  return (
    <Box sx={{
      p: 2.5,
      bgcolor: '#0a0f1d',
      borderRadius: '12px',
      border: '1px solid #1e293b',
      boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
      width: '450px',
      fontFamily: '"Outfit", "Roboto", sans-serif'
    }}>
      <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '1px', mb: 0.2 }}>
          ALVISION — PULSE OVERVIEW
        </Typography>
        <Typography sx={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.5px' }}>
          Real-time monitoring across all modules
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        {metrics.map((m, idx) => {
          const severity = getSeverity(m.title, m.value);
          const color = getSeverityColor(severity);
          const bg = getSeverityBg(severity);
          const glow = getSeverityGlow(severity);

          const gridColumn = idx === 4 ? 'span 2' : 'span 1';

          return (
            <Box key={m.title} sx={{
              gridColumn,
              p: 1.5,
              bgcolor: 'rgba(17, 24, 39, 0.7)',
              borderRadius: '8px',
              border: `1.5px solid rgba(30, 41, 59, 0.5)`,
              borderTop: `3px solid ${color}`,
              boxShadow: `0 4px 15px rgba(0, 0, 0, 0.25)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.5px', mb: 0.8, textAlign: 'center' }}>
                {m.title}
              </Typography>
              <Typography sx={{
                fontSize: '28px',
                fontWeight: 900,
                color: glow,
                textShadow: `0 0 10px ${color}40`,
                lineHeight: 1,
                mb: 1
              }}>
                {m.value}
              </Typography>
              <Box sx={{
                px: 1,
                py: 0.2,
                bgcolor: bg,
                borderRadius: '4px',
                border: `1px solid ${color}30`
              }}>
                <Typography sx={{ fontSize: '7.5px', fontWeight: 700, color, letterSpacing: '0.3px' }}>
                  {getStatusLabel(severity)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
