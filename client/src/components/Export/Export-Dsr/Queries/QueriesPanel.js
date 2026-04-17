import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Pagination,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ReplyIcon from "@mui/icons-material/Reply";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { UserContext } from "../../../../contexts/UserContext";
import { uploadFileToS3 } from "../../../../utils/awsFileUpload";
import { Box } from '@mui/material';


// ─── Theme (matches ExportJobsTable / ExportDashboard) ────────────────────────
const THEME = {
  blue: "#2563eb",
  blueSoft: "#eff6ff",
  blueHover: "#1d4ed8",
  green: "#10b981",
  greenSoft: "#ecfdf5",
  amber: "#f59e0b",
  amberSoft: "#fffbeb",
  red: "#ef4444",
  redSoft: "#fef2f2",
  text: "#111827",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  bg: "#f9fafb",
  white: "#ffffff",
};

const STATUS_STYLES = {
  open: { bg: THEME.amberSoft, text: THEME.amber, border: "#fde68a", label: "Open" },
  resolved: { bg: THEME.greenSoft, text: THEME.green, border: "#a7f3d0", label: "Resolved" },
  rejected: { bg: THEME.redSoft, text: THEME.red, border: "#fecaca", label: "Rejected" },
};

const MODULE_LABELS = {
  "export-operation": "Operations",
  "export-dsr": "Export DSR",
  "export-documentation": "Documentation",
  "export-esanchit": "E-Sanchit",
  "export-charges": "Charges",
};

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Helper to get the job URL based on current module path
const getJobUrl = (jobNo) => {
  const pathname = window.location.pathname;
  const base = pathname.startsWith("/export-operation")
    ? "/export-operation"
    : pathname.startsWith("/export-documentation")
      ? "/export-documentation"
      : pathname.startsWith("/export-esanchit")
        ? "/export-esanchit"
        : pathname.startsWith("/export-charges")
          ? "/export-charges"
          : "/export-dsr";
  return `${base}/job/${encodeURIComponent(jobNo)}`;
};

// ─── Query Card ────────────────────────────────────────────────────────────────
const QueryCard = ({ query, currentModule, onClick, isHovered, onHover, onLeave, onViewJob, onUpload }) => {
  const st = STATUS_STYLES[query.status] || STATUS_STYLES.open;

  // Decide if this query is considered "New" for the CURRENT module
  const isTarget = query.targetModule === currentModule;
  const isSender = query.raisedFromModule === currentModule;
  const isNew = (isTarget && !query.seenByTarget) || (isSender && !query.seenBySender);

  return (
    <div
      style={{
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: THEME.border,
        borderRadius: "4px",
        padding: "12px 14px",
        marginBottom: "8px",
        background: THEME.white,
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
        borderLeft: `3px solid ${st.text}`,
        ...(isHovered ? { boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderColor: "#c7d2fe" } : {}),
      }}
      onClick={() => onClick(query)}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Row 1: Title + Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: THEME.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {query.subject}
          </div>
          <div style={{ fontSize: "11px", color: THEME.textMuted, marginTop: "1px" }}>
            Job: <span style={{ fontWeight: 600, color: THEME.blue }}>{query.job_no}</span>
            {" · "}
            <span style={{ fontWeight: 600 }}>
              {isSender ? `To: ${MODULE_LABELS[query.targetModule] || query.targetModule}` : `From: ${MODULE_LABELS[query.raisedFromModule] || query.raisedFromModule}`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "12px" }}>
          <button
            onClick={(e) => { e.stopPropagation(); onViewJob(query.job_no); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              padding: "3px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 600,
              border: `1px solid ${THEME.blue}`, background: THEME.blueSoft, color: THEME.blue,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
            title="Open this job"
          >
            <OpenInNewIcon sx={{ fontSize: 11 }} />
            View Job
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUpload(query.job_no); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              padding: "3px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 600,
              border: `1px solid ${THEME.green}`, background: THEME.greenSoft, color: THEME.green,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
            title="Upload documents for this job"
          >
            <CloudUploadIcon sx={{ fontSize: 11 }} />
            Upload
          </button>
          <span style={{
            padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.03em",
            backgroundColor: st.bg, color: st.text, border: `1px solid ${st.border}`,
          }}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Row 2: Message preview */}
      <div style={{
        fontSize: "12px", color: "#4b5563", lineHeight: 1.4,
        overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: "6px",
      }}>
        {query.message}
      </div>

      {/* Row 3: Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", color: THEME.textMuted }}>
        <div>
          By <span style={{ fontWeight: 600, color: "#374151" }}>{query.raisedByName || query.raisedBy}</span>
          {" · "}{formatDate(query.createdAt)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {query.replies?.length > 0 && (
            <span style={{ background: THEME.bg, padding: "1px 6px", borderRadius: "3px", fontWeight: 600, color: THEME.textMuted, border: `1px solid ${THEME.border}` }}>
              💬 {query.replies.length}
            </span>
          )}
          {isNew && query.status === "open" && (
            <span style={{
              background: "#dbeafe", color: THEME.blue, padding: "1px 6px",
              borderRadius: "3px", fontWeight: 700, fontSize: "9px", textTransform: "uppercase",
            }}>
              New
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Query Detail Dialog ────────────────────────────────────────────────────
const QueryDetailDialog = ({ open, onClose, query, currentModule, onUpdate }) => {
  const { user } = useContext(UserContext);
  const [replyText, setReplyText] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeQuery, setActiveQuery] = useState(query);
  const [showResolveFields, setShowResolveFields] = useState(false);
  const [showRejectFields, setShowRejectFields] = useState(false);

  useEffect(() => {
    setActiveQuery(query);
    setShowResolveFields(false);
    setShowRejectFields(false);
    setReplyText("");
    setResolutionNote("");
  }, [query]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_STRING}/queries/${activeQuery._id}/reply`,
        {
          message: replyText.trim(),
          repliedBy: user?.username || "unknown",
          repliedByName: user?.fullName || user?.username || "Unknown",
          fromModule: currentModule,
        }
      );
      setActiveQuery(res.data.data);
      setReplyText("");
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error replying:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_STRING}/queries/${activeQuery._id}/resolve`,
        {
          resolvedBy: user?.username || "unknown",
          resolvedByName: user?.fullName || user?.username || "Unknown",
          resolutionNote: resolutionNote.trim(),
        }
      );
      setActiveQuery(res.data.data);
      setShowResolveFields(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error resolving:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_STRING}/queries/${activeQuery._id}/reject`,
        {
          resolvedBy: user?.username || "unknown",
          resolvedByName: user?.fullName || user?.username || "Unknown",
          resolutionNote: resolutionNote.trim(),
        }
      );
      setActiveQuery(res.data.data);
      setShowRejectFields(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Error rejecting:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!activeQuery) return null;

  const st = STATUS_STYLES[activeQuery.status] || STATUS_STYLES.open;
  const isOwn = activeQuery.raisedBy === user?.username;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: "6px", maxHeight: "85vh" } }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          py: 1.5, px: 2, borderBottom: `1px solid ${THEME.border}`,
          backgroundColor: THEME.white,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: THEME.text }}>{activeQuery.subject}</div>
          <div style={{ fontSize: "11px", color: THEME.textMuted, marginTop: "2px" }}>
            Job: <span style={{ fontWeight: 600, color: THEME.blue }}>{activeQuery.job_no}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={() => window.open(getJobUrl(activeQuery.job_no), "_blank")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", borderRadius: "3px", fontSize: "11px", fontWeight: 600,
              border: `1px solid ${THEME.blue}`, background: THEME.blueSoft, color: THEME.blue,
              cursor: "pointer",
            }}
          >
            <OpenInNewIcon sx={{ fontSize: 12 }} /> View Job
          </button>
          <span style={{
            padding: "3px 10px", borderRadius: "3px", fontSize: "10px", fontWeight: 700,
            textTransform: "uppercase", backgroundColor: st.bg, color: st.text, border: `1px solid ${st.border}`,
          }}>
            {st.label}
          </span>
          <IconButton onClick={onClose} size="small" sx={{ color: THEME.textMuted }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent sx={{ py: 2, px: 2, backgroundColor: THEME.bg }}>
        {/* Info Grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "1px", background: THEME.border, borderRadius: "4px",
          overflow: "hidden", marginBottom: "16px",
        }}>
          {[
            { label: "Raised By", value: activeQuery.raisedByName || activeQuery.raisedBy },
            { label: "From Module", value: MODULE_LABELS[activeQuery.raisedFromModule] || activeQuery.raisedFromModule },
            { label: "Target Module", value: MODULE_LABELS[activeQuery.targetModule] || activeQuery.targetModule },
            { label: "Raised At", value: formatDate(activeQuery.createdAt) },
          ].map((item, i) => (
            <div key={i} style={{ padding: "10px 12px", background: THEME.white, fontSize: "12px" }}>
              <div style={{ color: THEME.textMuted, fontWeight: 600, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "2px" }}>
                {item.label}
              </div>
              <div style={{ fontWeight: 600, color: THEME.text }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Original Message */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
            Description
          </div>
          <div style={{
            padding: "10px 12px", borderRadius: "4px", background: THEME.white,
            border: `1px solid ${THEME.border}`, borderLeft: `3px solid ${THEME.blue}`,
          }}>
            <div style={{ fontSize: "12px", lineHeight: 1.6, color: "#374151" }}>
              {activeQuery.message}
            </div>
            <div style={{ fontSize: "10px", color: THEME.textMuted, marginTop: "6px" }}>
              — {activeQuery.raisedByName || activeQuery.raisedBy}, {formatDate(activeQuery.createdAt)}
            </div>
          </div>
        </div>

        {/* Replies Thread */}
        {activeQuery.replies?.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Replies ({activeQuery.replies.length})
            </div>
            {activeQuery.replies.map((reply, idx) => {
              const isSelfReply = reply.repliedBy === user?.username;
              return (
                <div key={reply._id || idx} style={{
                  padding: "10px 12px", borderRadius: "4px", marginBottom: "6px",
                  background: THEME.white, border: `1px solid ${THEME.border}`,
                  borderLeft: isSelfReply ? `3px solid ${THEME.blue}` : `3px solid #d1d5db`,
                }}>
                  <div style={{ fontSize: "12px", lineHeight: 1.6, color: "#374151" }}>
                    {reply.message}
                  </div>
                  <div style={{ fontSize: "10px", color: THEME.textMuted, marginTop: "4px" }}>
                    — {reply.repliedByName || reply.repliedBy}, {formatDate(reply.repliedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resolution Info */}
        {(activeQuery.status === "resolved" || activeQuery.status === "rejected") && (
          <div style={{
            padding: "10px 14px", borderRadius: "4px",
            background: st.bg, border: `1px solid ${st.border}`, marginBottom: "16px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: st.text, marginBottom: "3px" }}>
              {activeQuery.status === "resolved" ? "✅ Resolved" : "❌ Rejected"} by {activeQuery.resolvedByName || activeQuery.resolvedBy}
            </div>
            {activeQuery.resolutionNote && (
              <div style={{ fontSize: "12px", color: "#4b5563" }}>{activeQuery.resolutionNote}</div>
            )}
            <div style={{ fontSize: "10px", color: THEME.textMuted, marginTop: "3px" }}>
              {formatDate(activeQuery.resolvedAt)}
            </div>
          </div>
        )}

        {/* Reply Box — only for open queries */}
        {activeQuery.status === "open" && (
          <div style={{
            borderTop: `1px solid ${THEME.border}`, paddingTop: "14px",
          }}>
            <TextField
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              fullWidth size="small" multiline rows={2}
              placeholder="Type your reply..."
              sx={{ mb: 1.5, "& .MuiInputBase-root": { fontSize: "12px", backgroundColor: THEME.white } }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                variant="contained" size="small"
                onClick={handleReply}
                disabled={loading || !replyText.trim()}
                startIcon={<ReplyIcon sx={{ fontSize: "13px !important" }} />}
                sx={{
                  textTransform: "none", fontSize: "11px",
                  backgroundColor: THEME.blue, "&:hover": { backgroundColor: THEME.blueHover },
                }}
              >
                Reply
              </Button>

              <div style={{ display: "flex", gap: "6px" }}>
                {!showResolveFields && !showRejectFields && (
                  <>
                    <Button
                      variant="outlined" size="small"
                      onClick={() => { setShowResolveFields(true); setShowRejectFields(false); }}
                      startIcon={<CheckCircleIcon sx={{ fontSize: "13px !important" }} />}
                      sx={{
                        textTransform: "none", fontSize: "11px",
                        borderColor: THEME.green, color: THEME.green,
                        "&:hover": { borderColor: "#059669", background: THEME.greenSoft },
                      }}
                    >
                      Resolve
                    </Button>
                    <Button
                      variant="outlined" size="small"
                      onClick={() => { setShowRejectFields(true); setShowResolveFields(false); }}
                      startIcon={<CancelIcon sx={{ fontSize: "13px !important" }} />}
                      sx={{
                        textTransform: "none", fontSize: "11px",
                        borderColor: THEME.red, color: THEME.red,
                        "&:hover": { borderColor: "#dc2626", background: THEME.redSoft },
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Resolve / Reject confirmation */}
            {(showResolveFields || showRejectFields) && (
              <div style={{
                marginTop: "10px", padding: "10px 12px", borderRadius: "4px",
                background: showResolveFields ? THEME.greenSoft : THEME.redSoft,
                border: `1px solid ${showResolveFields ? "#a7f3d0" : "#fecaca"}`,
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: showResolveFields ? THEME.green : THEME.red, marginBottom: "6px" }}>
                  {showResolveFields ? "Resolve this query" : "Reject this query"}
                </div>
                <TextField
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  fullWidth size="small" multiline rows={2}
                  placeholder={showResolveFields ? "Resolution note (optional)..." : "Reason for rejection (optional)..."}
                  sx={{ mb: 1, "& .MuiInputBase-root": { fontSize: "12px", backgroundColor: THEME.white } }}
                />
                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                  <Button size="small"
                    onClick={() => { setShowResolveFields(false); setShowRejectFields(false); setResolutionNote(""); }}
                    sx={{ textTransform: "none", fontSize: "11px", color: THEME.textMuted }}
                  >
                    Cancel
                  </Button>
                  <Button variant="contained" size="small" disabled={loading}
                    onClick={showResolveFields ? handleResolve : handleReject}
                    sx={{
                      textTransform: "none", fontSize: "11px",
                      backgroundColor: showResolveFields ? THEME.green : THEME.red,
                      "&:hover": { backgroundColor: showResolveFields ? "#059669" : "#dc2626" },
                    }}
                  >
                    {loading ? "Processing..." : showResolveFields ? "Confirm Resolve" : "Confirm Reject"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Main QueriesPanel ────────────────────────────────────────────────────────
const QueriesPanel = () => {
  const { user } = useContext(UserContext);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadJobNo, setUploadJobNo] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Determine current module
  const pathname = window.location.pathname;
  const currentModule = pathname.startsWith("/export-operation")
    ? "export-operation"
    : pathname.startsWith("/export-documentation")
      ? "export-documentation"
      : pathname.startsWith("/export-esanchit")
        ? "export-esanchit"
        : pathname.startsWith("/export-charges")
          ? "export-charges"
          : "export-dsr";

  const fetchQueries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/queries`, {
        params: {
          targetModule: currentModule,
          raisedFromModule: currentModule,
          status: statusFilter || undefined,
          page,
          limit: 20,
        },
      });
      if (res.data.success) {
        setQueries(res.data.data.queries);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error("Error fetching queries:", err);
    } finally {
      setLoading(false);
    }
  }, [currentModule, statusFilter, page]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  // Mark queries as seen when panel is loaded
  useEffect(() => {
    const markSeen = async () => {
      try {
        await axios.put(`${import.meta.env.VITE_API_STRING}/queries/mark-seen`, {
          targetModule: currentModule,
          raisedFromModule: currentModule,
        });
      } catch (err) {
        // non-critical
      }
    };
    markSeen();
  }, [currentModule]);

  const handleOpenDetail = (query) => {
    setSelectedQuery(query);
    setDetailOpen(true);
  };

  const handleOpenUpload = (jobNo) => {
    setUploadJobNo(jobNo);
    setUploadDialogOpen(true);
  };

  const filterTabs = [
    { key: "", label: "All" },
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div style={{
      padding: "10px 15px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
      fontSize: "12px", color: THEME.text, backgroundColor: THEME.white, minHeight: "60vh",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: THEME.text }}>
            Queries
          </h2>
          <p style={{ fontSize: "11px", color: THEME.textMuted, margin: "1px 0 0" }}>
            Queries directed to your module
          </p>
        </div>
      </div>

      {/* Filter Tabs — match style of ExportJobsTable tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${THEME.border}`, marginBottom: "12px" }}>
        {filterTabs.map((f) => {
          const isActive = statusFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => { setStatusFilter(f.key); setPage(1); }}
              style={{
                padding: "7px 18px", cursor: "pointer", fontSize: "12px", fontWeight: 600,
                color: isActive ? THEME.blue : THEME.textMuted,
                borderBottom: isActive ? `2px solid ${THEME.blue}` : "2px solid transparent",
                backgroundColor: "transparent", border: "none", outline: "none",
                marginBottom: "-1px", transition: "color 0.15s",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Query List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <CircularProgress size={24} sx={{ color: THEME.blue }} />
          <div style={{ fontSize: "11px", color: THEME.textMuted, marginTop: "8px" }}>Loading queries...</div>
        </div>
      ) : queries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: THEME.textMuted }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#9ca3af" }}>No queries found</div>
          <div style={{ fontSize: "12px", color: "#d1d5db", marginTop: "4px" }}>
            {statusFilter ? `No ${statusFilter} queries for your module.` : "No queries have been raised yet."}
          </div>
        </div>
      ) : (
        <>
          {queries.map((q) => (
            <QueryCard
              key={q._id}
              query={q}
              currentModule={currentModule}
              onClick={handleOpenDetail}
              isHovered={hoveredCard === q._id}
              onHover={() => setHoveredCard(q._id)}
              onLeave={() => setHoveredCard(null)}
              onViewJob={(jobNo) => window.open(getJobUrl(jobNo), "_blank")}
              onUpload={handleOpenUpload}
            />
          ))}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
              <Pagination
                count={totalPages} page={page}
                onChange={(e, v) => setPage(v)}
                shape="rounded" color="primary" size="small"
              />
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <QueryDetailDialog
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedQuery(null); }}
        query={selectedQuery}
        currentModule={currentModule}
        onUpdate={fetchQueries}
      />

      {/* Upload Dialog */}
      <UploadDocsDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        jobNo={uploadJobNo}
      />
    </div>
  );
};

// ─── Helper Components for Upload ──────────────────────────────────────────

const UploadDocsDialog = ({ open, onClose, jobNo }) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && jobNo) {
      const fetchJob = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_STRING}/${encodeURIComponent(jobNo)}`);
          setJob(res.data);
        } catch (err) {
          console.error("Error fetching job for upload:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchJob();
    }
  }, [open, jobNo]);

  const categories = [
    {
      name: "1. Shipping / Port Documents",
      items: [
        { field: "leoUpload", title: "LEO" },
        { field: "eGatePassUpload", title: "Gate Pass" },
        { field: "booking_copy", title: "Booking" },
        { field: "forwardingNoteDocUpload", title: "Forwarding Note" },
        { field: "handoverImageUpload", title: "HO/DOC Copy" },
      ]
    },
    {
      name: "2. VGM / ODEX Documents",
      items: [
        { field: "manualVgmUpload", title: "Manual VGM" },
        { field: "odexVgmUpload", title: "Odex VGM" },
        { field: "odexEsbUpload", title: "Odex ESB" },
        { field: "odexForm13Upload", title: "Odex Form 13" },
        { field: "cmaForwardingNoteUpload", title: "CMA Forwarding Note" },
      ]
    },
    {
      name: "3. Container & Cargo Photos",
      items: [
        { field: "images", title: "Container Door Photo", uploadType: "container" },
        { field: "stuffingPhotoUpload", title: "Stuffing Photo" },
        { field: "images", title: "Carting Photo", uploadType: "section" },
      ]
    },
    {
      name: "4. Operational Documents",
      items: [
        { field: "weighmentImages", title: "Weighment Slip", uploadType: "container" },
        { field: "stuffingSheetUpload", title: "Stuffing Sheet" },
      ]
    },
    {
      name: "5. Billing & Others",
      items: [
        { field: "billingDocsSentUpload", title: "Bill Doc Copy" },
        { field: "otherDocUpload", title: "Other Doc" },
      ]
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: "8px" } }}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, px: 2, borderBottom: `1px solid ${THEME.border}` }}>
        <div style={{ fontSize: "16px", fontWeight: 700, color: THEME.blue }}>Upload Documents</div>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 2, backgroundColor: THEME.bg }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}><CircularProgress size={24} /></Box>
        ) : job ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ fontSize: "13px", color: THEME.textMuted, borderBottom: `1px solid ${THEME.border}`, pb: 1 }}>
              Job: <span style={{ fontWeight: 700, color: THEME.text }}>{jobNo}</span>
            </div>

            {categories.map((cat) => (
              <div key={cat.name}>
                <div style={{
                  fontSize: "11px", fontWeight: 700, color: THEME.blue,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px"
                }}>
                  {cat.name}
                  <div style={{ flex: 1, height: "1px", background: THEME.border }}></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {cat.items.map((opt) => (
                    <UploadItem
                      key={opt.field}
                      job={job}
                      field={opt.field}
                      title={opt.title}
                      uploadType={opt.uploadType || "status"}
                      onSuccess={(newJobData) => setJob(newJobData)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: THEME.red, fontSize: "12px", py: 4 }}>Job not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const UploadItem = ({ job, field, title, uploadType, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleUpload = async (e) => {
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
        currentFiles = Array.isArray(job[field]) ? job[field] : [];
      } else if (uploadType === "section") {
        dotPath = `operations.0.${field}.0.images`;
        const ops = job.operations?.[0] || {};
        const section = Array.isArray(ops[field]) ? ops[field] : [];
        const item = section[0] || {};
        currentFiles = Array.isArray(item.images) ? item.images : [];
      } else if (uploadType === "container") {
        dotPath = `containers.0.${field}`;
        const container = job.containers?.[0] || {};
        currentFiles = Array.isArray(container[field]) ? container[field] : [];
      } else {
        dotPath = `operations.0.statusDetails.0.${field}`;
        const ops = job.operations?.[0] || {};
        const status = (ops.statusDetails && ops.statusDetails[0]) || {};
        currentFiles = Array.isArray(status[field]) ? status[field] : [];
      }

      const newValue = [...currentFiles, url];
      const res = await axios.patch(
        `${import.meta.env.VITE_API_STRING}/${encodeURIComponent(job.job_no)}/fields`,
        { fieldUpdates: [{ field: dotPath, value: newValue }] }
      );
      if (onSuccess) onSuccess(res.data.data);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const hasDocs = (() => {
    if (uploadType === "toplevel") return job[field]?.length > 0;
    if (uploadType === "section") return job.operations?.[0]?.[field]?.[0]?.images?.length > 0;
    if (uploadType === "container") return job.containers?.[0]?.[field]?.length > 0;
    return job.operations?.[0]?.statusDetails?.[0]?.[field]?.length > 0;
  })();

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 12px", border: `1px solid ${THEME.border}`, borderRadius: "4px",
      backgroundColor: THEME.white
    }}>
      <span style={{ fontSize: "13px", color: hasDocs ? THEME.blue : THEME.text, fontWeight: hasDocs ? 600 : 500 }}>
        {title}
      </span>
      <div>
        <IconButton size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <CircularProgress size={16} /> : <CloudUploadIcon sx={{ fontSize: 18, color: THEME.blue }} />}
        </IconButton>
        <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: "none" }} />
      </div>
    </div>
  );
};

export default QueriesPanel;
