import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

/**
 * QueryChatDialog - WhatsApp-style thread dialog for job queries and client queries
 */
export default function QueryChatDialog({
  queryChatOpen,
  setQueryChatOpen,
  queryChatJob,
  setQueryChatJob,
  queryChatData = [],
  setQueryChatData,
  clientQueryChatData = [],
  setClientQueryChatData,
  queryChatReply,
  setQueryChatReply,
  clientQueryChatReply,
  setClientQueryChatReply,
  activeChatTab,
  setActiveChatTab,
  activeQueryIndex,
  setActiveQueryIndex,
  queryChatSending,
  setQueryChatSending,
  queryChatLoading,
  chatEndRef,
  currentModuleForQueries,
  user
}) {
  const handleClose = () => {
    setQueryChatOpen(false);
    setQueryChatJob(null);
    setQueryChatData([]);
    setClientQueryChatData([]);
    setQueryChatReply("");
    setClientQueryChatReply("");
  };

  const getChatDateString = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getChatTimeString = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const activeQuery = activeChatTab === "client"
    ? clientQueryChatData[activeQueryIndex]
    : queryChatData[activeQueryIndex];

  const activeQueriesList = activeChatTab === "client" ? clientQueryChatData : queryChatData;

  const chatMessages = [];
  if (activeQuery) {
    chatMessages.push({
      id: "original",
      senderName: activeChatTab === "client"
        ? (activeQuery.client_name || "Client")
        : (activeQuery.raisedByName || activeQuery.raisedBy),
      senderEmail: activeChatTab === "client" ? activeQuery.client_email : "",
      senderUsername: activeChatTab === "client" ? activeQuery.client_username : "",
      message: activeQuery.message,
      subject: activeQuery.subject,
      createdAt: activeQuery.createdAt,
      align: activeChatTab === "client"
        ? "left"
        : (activeQuery.raisedBy === user?.username ? "right" : "left"),
      isReply: false,
      senderType: activeChatTab === "client" ? "client" : "admin"
    });

    if (activeQuery.replies) {
      activeQuery.replies.forEach((r, ri) => {
        chatMessages.push({
          id: r._id || `reply-${ri}`,
          senderName: r.repliedByName || r.repliedBy,
          senderEmail: r.email || "",
          senderUsername: r.username || "",
          message: r.message,
          createdAt: r.repliedAt,
          align: activeChatTab === "client"
            ? (r.senderType === "client" ? "left" : "right")
            : (r.repliedBy === user?.username ? "right" : "left"),
          isReply: true,
          senderType: r.senderType || "admin"
        });
      });
    }
  }

  const handleSendClientReply = async () => {
    if (!clientQueryChatReply.trim() || !activeQuery) return;
    setQueryChatSending(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_STRING}/client-queries/${activeQuery._id}/reply`, {
        message: clientQueryChatReply.trim(),
        repliedBy: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.username || "Admin"),
        senderType: "admin",
        email: user?.email || "",
        username: user?.username || "",
      });
      const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/client-queries`, { params: { job_no: queryChatJob.job_no } });
      setClientQueryChatData(resp.data?.queries || []);
      setClientQueryChatReply("");
    } catch (err) {
      console.error(err);
    } finally {
      setQueryChatSending(false);
    }
  };

  const handleSendInternalReply = async () => {
    if (!queryChatReply.trim() || !activeQuery) return;
    setQueryChatSending(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_STRING}/queries/${activeQuery._id}/reply`, {
        message: queryChatReply.trim(),
        repliedBy: user?.username || "unknown",
        repliedByName: user?.fullName || user?.username || "Unknown",
        fromModule: currentModuleForQueries,
      });
      const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/queries`, { params: { job_no: queryChatJob.job_no } });
      setQueryChatData(resp.data?.data?.queries || resp.data?.data || []);
      setQueryChatReply("");
    } catch (err) {
      console.error(err);
    } finally {
      setQueryChatSending(false);
    }
  };

  return (
    <Dialog
      open={queryChatOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e62d4", py: 1.5, px: 3, background: "#1e62d4", color: "#fff" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Queries &amp; Replies</div>
          {queryChatJob?.job_no && <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Job: {queryChatJob.job_no}</div>}
        </div>
        <IconButton onClick={handleClose} size="small" sx={{ color: "#fff" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Tabs selector if both exist */}
      {queryChatData.length > 0 && clientQueryChatData.length > 0 && (
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f3f4f6" }}>
          <button
            onClick={() => { setActiveChatTab("client"); setActiveQueryIndex(0); }}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderBottom: activeChatTab === "client" ? "3px solid #1e62d4" : "none",
              backgroundColor: activeChatTab === "client" ? "#fff" : "transparent",
              color: activeChatTab === "client" ? "#1e62d4" : "#4b5563",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none"
            }}
          >
            Client Queries ({clientQueryChatData.length})
          </button>
          <button
            onClick={() => { setActiveChatTab("internal"); setActiveQueryIndex(0); }}
            style={{
              flex: 1,
              padding: "10px 16px",
              border: "none",
              borderBottom: activeChatTab === "internal" ? "3px solid #1e62d4" : "none",
              backgroundColor: activeChatTab === "internal" ? "#fff" : "transparent",
              color: activeChatTab === "internal" ? "#1e62d4" : "#4b5563",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none"
            }}
          >
            Internal Queries ({queryChatData.length})
          </button>
        </div>
      )}

      {/* Thread Pills Row if multiple threads in active tab */}
      {activeQueriesList.length > 1 && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 12px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", overflowX: "auto", whiteSpace: "nowrap" }}>
          {activeQueriesList.map((q, idx) => (
            <button
              key={q._id || idx}
              onClick={() => setActiveQueryIndex(idx)}
              style={{
                padding: "4px 12px",
                borderRadius: "16px",
                border: "1px solid",
                borderColor: activeQueryIndex === idx ? "#1e62d4" : "#d1d5db",
                backgroundColor: activeQueryIndex === idx ? "#eff6ff" : "#fff",
                color: activeQueryIndex === idx ? "#1e62d4" : "#374151",
                fontWeight: "600",
                fontSize: "11px",
                cursor: "pointer",
                outline: "none",
                transition: "all 0.15s"
              }}
            >
              {q.subject ? (q.subject.length > 22 ? `${q.subject.substring(0, 20)}...` : q.subject) : `Query ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", height: 500, backgroundColor: "#efeae2" }}>
        {queryChatLoading ? (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", flex: 1, color: "#6b7280" }}>
            <CircularProgress size={28} sx={{ color: "#1e62d4", mb: 1 }} />
            <span style={{ fontSize: "13px", fontWeight: "500" }}>Loading conversation...</span>
          </div>
        ) : activeQueriesList.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, color: "#9ca3af", fontStyle: "italic", fontSize: 13 }}>
            No queries raised for this job yet.
          </div>
        ) : (
          <>
            {/* Client Info Banner */}
            {activeQuery && (
              <div style={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "10px 16px",
                margin: "12px 12px 6px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                flexShrink: 0
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: activeChatTab === "client" ? "#3f51b5" : "#009688",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "15px"
                  }}>
                    {activeChatTab === "client"
                      ? (activeQuery.client_name ? activeQuery.client_name[0].toUpperCase() : "C")
                      : (activeQuery.raisedByName ? activeQuery.raisedByName[0].toUpperCase() : (activeQuery.raisedBy ? activeQuery.raisedBy[0].toUpperCase() : "I"))
                    }
                  </div>

                  <div>
                    <div style={{ fontWeight: "700", fontSize: "13.5px", color: "#1f2937" }}>
                      {activeChatTab === "client"
                        ? (activeQuery.client_name || activeQuery.client_id || "Client")
                        : (activeQuery.raisedByName || activeQuery.raisedBy || "Internal User")
                      }
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280" }}>
                      {activeChatTab === "client"
                        ? (activeQuery.client_email || "no-email@client.com")
                        : `Module: ${activeQuery.raisedFromModule} → ${activeQuery.targetModule}`
                      }
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    textTransform: "uppercase",
                    backgroundColor: activeQuery.status === "resolved" ? "#dcfce7" : activeQuery.status === "rejected" ? "#fee2e2" : "#fef3c7",
                    color: activeQuery.status === "resolved" ? "#166534" : activeQuery.status === "rejected" ? "#991b1b" : "#92400e",
                    border: `1px solid ${activeQuery.status === 'resolved' ? '#bbf7d0' : activeQuery.status === 'rejected' ? '#fecaca' : '#ffe4e6'}`
                  }}>
                    {activeQuery.status}
                  </span>

                  {activeChatTab === "client" && activeQuery.status === "open" && (
                    <button
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to resolve this client query?")) {
                          setQueryChatSending(true);
                          try {
                            await axios.put(`${import.meta.env.VITE_API_STRING}/client-queries/${activeQuery._id}/resolve`, {
                              resolvedBy: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : (user?.username || "Admin"),
                            });
                            const resp = await axios.get(`${import.meta.env.VITE_API_STRING}/client-queries`, { params: { job_no: queryChatJob.job_no } });
                            setClientQueryChatData(resp.data?.queries || []);
                          } catch (err) { console.error(err); }
                          finally { setQueryChatSending(false); }
                        }
                      }}
                      disabled={queryChatSending}
                      style={{
                        padding: "4px 10px",
                        backgroundColor: "#22c55e",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages Scrollable Body */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 16px 16px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              {chatMessages.map((msg, index) => {
                const showDateSeparator = index === 0 ||
                  getChatDateString(chatMessages[index - 1].createdAt) !== getChatDateString(msg.createdAt);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
                        <span style={{
                          backgroundColor: "#e1f3fd",
                          color: "#1c2d3a",
                          padding: "4px 12px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "600",
                          boxShadow: "0 1px 1px rgba(0,0,0,0.05)"
                        }}>
                          {getChatDateString(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div style={{
                      display: "flex",
                      justifyContent: msg.align === "right" ? "flex-end" : "flex-start",
                      width: "100%"
                    }}>
                      <div style={{
                        maxWidth: "75%",
                        backgroundColor: msg.align === "right" ? "#e7ffdb" : "#ffffff",
                        borderRadius: msg.align === "right" ? "12px 0px 12px 12px" : "0px 12px 12px 12px",
                        padding: "8px 12px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                        position: "relative"
                      }}>
                        <div style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: msg.align === "right" ? "#15803d" : "#3f51b5",
                          marginBottom: "3px"
                        }}>
                          {msg.senderName} {msg.senderEmail ? `(${msg.senderEmail})` : ""} {msg.senderUsername ? `[${msg.senderUsername}]` : ""}
                        </div>

                        {msg.subject && !msg.isReply && (
                          <div style={{
                            fontWeight: "700",
                            fontSize: "12px",
                            color: "#1a237e",
                            marginBottom: "4px",
                            borderBottom: "1px solid #f0f2f5",
                            paddingBottom: "2px"
                          }}>
                            Subject: {msg.subject}
                          </div>
                        )}

                        <div style={{
                          fontSize: "13px",
                          color: "#1f2937",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word"
                        }}>
                          {msg.message}
                        </div>

                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "4px",
                          marginTop: "4px"
                        }}>
                          <span style={{ fontSize: "10px", color: "#6b7280" }}>
                            {getChatTimeString(msg.createdAt)}
                          </span>
                          {msg.align === "right" && (
                            <span style={{ color: "#34b7f1", fontSize: "12px", fontWeight: "700", lineHeight: 1 }}>
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom reply input area */}
            {activeQuery && activeQuery.status === "open" ? (
              <div style={{
                backgroundColor: "#f0f2f5",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderTop: "1px solid #e5e7eb",
                flexShrink: 0
              }}>
                <button
                  type="button"
                  title="Add Emoji"
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b7280"
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </button>

                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "24px",
                  padding: "6px 16px",
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                  <input
                    type="text"
                    placeholder="Type your reply here..."
                    value={activeChatTab === "client" ? clientQueryChatReply : queryChatReply}
                    onChange={(e) => {
                      if (activeChatTab === "client") {
                        setClientQueryChatReply(e.target.value);
                      } else {
                        setQueryChatReply(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !queryChatSending) {
                        if (activeChatTab === "client") {
                          handleSendClientReply();
                        } else {
                          handleSendInternalReply();
                        }
                      }
                    }}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: "13px",
                      color: "#374151"
                    }}
                  />

                  <button
                    type="button"
                    title="Attach file"
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      marginLeft: "8px"
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (activeChatTab === "client") {
                      handleSendClientReply();
                    } else {
                      handleSendInternalReply();
                    }
                  }}
                  disabled={queryChatSending || (activeChatTab === "client" ? !clientQueryChatReply.trim() : !queryChatReply.trim())}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    backgroundColor: "#00a884",
                    border: "none",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity: (queryChatSending || (activeChatTab === "client" ? !clientQueryChatReply.trim() : !queryChatReply.trim())) ? 0.6 : 1,
                    transition: "all 0.15s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                  }}
                >
                  {queryChatSending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  )}
                </button>
              </div>
            ) : (
              <div style={{
                backgroundColor: "#d1fae5",
                color: "#065f46",
                padding: "10px",
                textAlign: "center",
                fontWeight: "700",
                fontSize: "13px",
                borderTop: "1px solid #a7f3d0",
                flexShrink: 0
              }}>
                This query has been marked as RESOLVED.
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
