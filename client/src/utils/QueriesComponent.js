import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  TextField,
  Button,
  Chip,
  IconButton,
  Tooltip,  
  Collapse,
} from "@mui/material";
import {
  Add,
  Delete,
  Check,
  Undo,
  ExpandMore,
  ExpandLess,
  QuestionAnswer,
} from "@mui/icons-material";

// Move QueryItem OUTSIDE the main component - this is crucial!
const QueryItem = React.memo(({ 
  item, 
  index, 
  localValues, 
  updateQuery, 
  modules, 
  userName, 
  showResolveButton, 
  resolveQuery, 
  unresolveQuery, 
  removeQuery 
}) => {
  const isResolved = item.resolved === true;
  
  // Get local values or fall back to props
  const queryValue = localValues[`${index}_query`] ?? item.query ?? '';
  const replyValue = localValues[`${index}_reply`] ?? item.reply ?? '';

  return (
    <div
      style={{
        padding: "16px",
        marginBottom: "12px",
        border: isResolved ? "1px solid #22c55e" : "1px solid #e2e8f0",
        borderRadius: "8px",
        backgroundColor: isResolved ? "#f0fdf4" : "#ffffff",
        position: "relative",
      }}
    >
      {/* Status indicators */}
      {isResolved && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            backgroundColor: "#22c55e",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check style={{ color: "white", fontSize: "12px" }} />
        </div>
      )}

      {/* Module indicator */}
      {item.current_module && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            backgroundColor: "#3b82f6",
            color: "white",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "4px",
            fontWeight: "500",
          }}
        >
          From: {item.current_module}
        </div>
      )}

      {/* Main content - using flexbox instead of grid for better performance */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "start",
          marginTop: item.current_module ? "20px" : "0",
          flexWrap: "wrap",
        }}
      >
        {/* Query Field - Optimized */}
        <div style={{ flex: "1 1 300px", minWidth: "200px" }}>
          <TextField
            multiline
            rows={1}
            size="small"
            label="Query"
            value={queryValue}
            onChange={(e) => {
              const newValue = e.target.value;
              updateQuery(index, "query", newValue);
            }}
            disabled={isResolved}
            variant="outlined"
            InputProps={{
              style: { transition: "none" }, // Remove transitions
            }}
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                fontSize: "14px",
                borderRadius: "6px",
              },
              "& .MuiInputBase-input": {
                transition: "none !important",
              },
            }}
          />
        </div>

        {/* Reply Field - Optimized */}
        <div style={{ flex: "1 1 300px", minWidth: "200px" }}>
          <TextField
            multiline
            rows={1}
            size="small"
            label="Reply"
            value={replyValue}
            onChange={(e) => {
              const newValue = e.target.value;
              updateQuery(index, null, { 
                reply: newValue, 
                replied_by: userName 
              });
            }}
            variant="outlined"
            InputProps={{
              style: { transition: "none" },
            }}
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                fontSize: "14px",
                borderRadius: "6px",
              },
              "& .MuiInputBase-input": {
                transition: "none !important",
              },
            }}
          />
        </div>

        {/* Module Selection */}
        <div style={{ flex: "0 0 120px" }}>
          <TextField
            select
            size="small"
            value={item.select_module || ""}
            onChange={(e) =>
              updateQuery(index, "select_module", e.target.value)
            }
            disabled={isResolved}
            SelectProps={{ native: true }}
            variant="outlined"
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                fontSize: "14px",
                borderRadius: "6px",
              },
            }}
          >
            <option value="">Select</option>
            {modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </TextField>
        </div>

        {/* Actions */}
        <div style={{ flex: "0 0 80px", display: "flex", gap: "4px" }}>
          {isResolved ? (
            showResolveButton && (
              <Tooltip title="Reopen">
                <IconButton
                  size="small"
                  onClick={() => unresolveQuery(index)}
                  style={{ color: "#f59e0b" }}
                >
                  <Undo fontSize="small" />
                </IconButton>
              </Tooltip>
            )
          ) : (
            showResolveButton && (
              <Tooltip title="Mark as Resolved">
                <IconButton
                  size="small"
                  onClick={() => resolveQuery(index)}
                  disabled={!queryValue.trim()}
                  style={{ color: "#22c55e" }}
                >
                  <Check fontSize="small" />
                </IconButton>
              </Tooltip>
            )
          )}
          <Tooltip title="Delete Query">
            <IconButton
              size="small"
              onClick={() => removeQuery(index)}
              style={{ color: "#ef4444" }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* User info badges */}
      {item.send_by && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: item.current_module ? "120px" : "8px",
            backgroundColor: "#0ea5e9",
            color: "white",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "4px",
            fontWeight: "500",
          }}
        >
          Sent by: {item.send_by}
        </div>
      )}

      {item.reply && item.replied_by && (
        <div
          style={{
            position: "absolute",
            bottom: "2px",
            right: "3px",
            backgroundColor: "#eab308",
            color: "white",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "4px",
            fontWeight: "500",
          }}
        >
          Replied by: {item.replied_by}
        </div>
      )}

      {item.resolved && item.resolved_by && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            backgroundColor: "#16a34a",
            color: "white",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "4px",
            fontWeight: "500",
          }}
        >
          By: {item.resolved_by}
        </div>
      )}

      {/* Metadata */}
      {item.created_at && (
        <div
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            marginTop: "8px",
          }}
        >
          Created: {new Date(item.created_at).toLocaleString()}
        </div>
      )}
    </div>
  );
});

// Add debounce utility
function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
}

// Main component
const QueriesComponent = ({
  queries = [],
  onQueriesChange,
  title = "Queries",
  modules = [
    "DSR",
    "DO", 
    "Documentation",
    "E-Sanchit",
    "Submission",
    "Operations",
    "Accounts",
  ],
  readOnlyReply = false,
  showResolveButton = true,
  onResolveQuery = null,
  currentModule = "DSR",
  userName = "",
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Local state for immediate UI updates
  const [localValues, setLocalValues] = useState({});
  
  // Stable debounced function
  const debouncedUpdate = useMemo(
    () => debounce((updatedQueries) => {
      onQueriesChange(updatedQueries);
    }, 300),
    [onQueriesChange]
  );

  // Update function with immediate local state update
  const updateQuery = useCallback(
    (index, field, value) => {
      // 1. Update local state immediately for UI responsiveness
      if (field === 'query' || field === 'reply') {
        setLocalValues(prev => ({
          ...prev,
          [`${index}_${field}`]: value
        }));
      }
      
      // 2. Update actual queries state
      const updated = [...queries];
      if (field === null && typeof value === 'object') {
        // Batch update multiple fields
        updated[index] = {
          ...updated[index],
          ...value,
        };
        
        // Update local state for batch updates too
        Object.keys(value).forEach(key => {
          if (key === 'query' || key === 'reply') {
            setLocalValues(prev => ({
              ...prev,
              [`${index}_${key}`]: value[key]
            }));
          }
        });
      } else {
        // Single field update
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      
      // 3. Debounced update to parent
      debouncedUpdate(updated);
    },
    [queries, debouncedUpdate]
  );

  // Other functions remain the same but memoized
  const addQuery = useCallback(() => {
    const newQuery = {
      query: "",
      reply: "",
      select_module: "",
      current_module: currentModule,
      resolved: false,
      created_at: new Date().toISOString(),
      send_by: userName,
      replied_by: "",
    };
    onQueriesChange([...queries, newQuery]);
    setExpanded(true);
  }, [queries, currentModule, userName, onQueriesChange]);

  const removeQuery = useCallback(
    (index) => {
      const updated = queries.filter((_, i) => i !== index);
      // Clean up local state for removed item
      setLocalValues(prev => {
        const newState = { ...prev };
        delete newState[`${index}_query`];
        delete newState[`${index}_reply`];
        return newState;
      });
      onQueriesChange(updated);
    },
    [queries, onQueriesChange]
  );

  const resolveQuery = useCallback(
    (index) => {
      const updated = [...queries];
      updated[index] = {
        ...updated[index],
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userName || "Unknown",
      };
      onQueriesChange(updated);

      if (onResolveQuery) {
        onResolveQuery(updated[index], index);
      }
    },
    [queries, onResolveQuery, userName, onQueriesChange]
  );

  const unresolveQuery = useCallback(
    (index) => {
      const updated = [...queries];
      updated[index] = {
        ...updated[index],
        resolved: false,
        resolved_at: null,
      };
      onQueriesChange(updated);
    },
    [queries, onQueriesChange]
  );

  // Memoized calculations
  const { resolvedCount, pendingCount } = useMemo(() => {
    const resolved = queries.filter((q) => q.resolved === true).length;
    const pending = queries.length - resolved;
    return { resolvedCount: resolved, pendingCount: pending };
  }, [queries]);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        margin: "20px 0",
      }}
    >
      {/* Header - same as before */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          height: "60px",
          cursor: queries.length > 0 ? "pointer" : "default",
        }}
        onClick={() => queries.length > 0 && setExpanded(!expanded)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
          }}
        >
          <QuestionAnswer style={{ fontSize: "20px", color: "#64748b" }} />
          <span
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#1e293b",
            }}
          >
            {title}
          </span>

          {queries.length > 0 && (
            <div style={{ display: "flex", gap: "6px" }}>
              <Chip
                label={`${queries.length} total`}
                size="small"
                style={{
                  backgroundColor: "#e2e8f0",
                  color: "#64748b",
                  fontSize: "12px",
                  height: "24px",
                }}
              />
              {pendingCount > 0 && (
                <Chip
                  label={`${pendingCount} pending`}
                  size="small"
                  style={{
                    backgroundColor: "#fef3c7",
                    color: "#d97706",
                    fontSize: "12px",
                    height: "24px",
                  }}
                />
              )}
              {resolvedCount > 0 && (
                <Chip
                  label={`${resolvedCount} resolved`}
                  size="small"
                  style={{
                    backgroundColor: "#dcfce7",
                    color: "#16a34a",
                    fontSize: "12px",
                    height: "24px",
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={(e) => {
              e.stopPropagation();
              addQuery();
            }}
            style={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "12px",
              padding: "4px 12px",
              height: "32px",
              borderColor: "#d1d5db",
              color: "#374151",
            }}
          >
            Add
          </Button>

          {queries.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ color: "#64748b" }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      <Collapse in={expanded && queries.length > 0}>
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            padding: "16px",
          }}
        >
          {queries.map((item, index) => (
            <QueryItem 
              key={`query-${index}-${item.created_at || index}`} // Stable key
              item={item}
              index={index}
              localValues={localValues}
              updateQuery={updateQuery}
              modules={modules}
              userName={userName}
              showResolveButton={showResolveButton}
              resolveQuery={resolveQuery}
              unresolveQuery={unresolveQuery}
              removeQuery={removeQuery}
            />
          ))}
        </div>
      </Collapse>

      {/* Empty State */}
      {queries.length === 0 && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          No queries yet. Click "Add" to create your first query.
        </div>
      )}
    </div>
  );
};

export default QueriesComponent;
