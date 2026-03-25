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
import { UserContext } from "../../../../contexts/UserContext";

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
const QueryCard = ({ query, onClick, isHovered, onHover, onLeave, onViewJob }) => {
  const st = STATUS_STYLES[query.status] || STATUS_STYLES.open;

  return (
    <div
      style={{
        border: `1px solid ${THEME.border}`,
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
            {" · From: "}
            <span style={{ fontWeight: 600 }}>{MODULE_LABELS[query.raisedFromModule] || query.raisedFromModule}</span>
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
          {!query.seenByTarget && query.status === "open" && (
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
const QueryDetailDialog = ({ open, onClose, query, onUpdate }) => {
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
              onClick={handleOpenDetail}
              isHovered={hoveredCard === q._id}
              onHover={() => setHoveredCard(q._id)}
              onLeave={() => setHoveredCard(null)}
              onViewJob={(jobNo) => window.open(getJobUrl(jobNo), "_blank")}
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
        onUpdate={fetchQueries}
      />
    </div>
  );
};

export default QueriesPanel;
