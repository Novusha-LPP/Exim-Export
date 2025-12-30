// commonStyles.js - Shared styles for Product tabs to ensure UI consistency

export const toUpperVal = (val) =>
  typeof val === "string" ? val.toUpperCase() : "";

export const handleUpperChange = (handler, field, value) => {
  const upperValue = toUpperVal(value);
  handler(field, upperValue);
};

export const styles = {
  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 12,
    color: "#1e293b",
    padding: 12,
    background: "#f8fafc",
  },

  sectionTitle: {
    fontWeight: 700,
    color: "#1e3a8a",
    fontSize: 10,
    marginBottom: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  subSectionTitle: {
    fontWeight: 700,
    color: "#1e3a8a",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 8,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 4,
    textTransform: "uppercase",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },

  cardTitle: {
    fontWeight: 700,
    color: "#1e3a8a",
    fontSize: 13,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  },

  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 8,
    alignItems: "end",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 8,
    alignItems: "end",
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 8,
    alignItems: "end",
  },

  field: {
    marginBottom: 6,
    display: "flex",
    flexDirection: "column",
  },

  label: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 3,
    display: "block",
    textTransform: "uppercase",
  },

  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 7px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    height: 25,
    background: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
    color: "#1e293b",
    fontWeight: 600,
    transition: "border-color 0.15s ease-in-out",
  },

  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "5px 7px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    minHeight: 45,
    background: "#ffffff",
    resize: "vertical",
    boxSizing: "border-box",
    color: "#1e293b",
    fontWeight: 600,
  },

  select: {
    width: "100%",
    fontSize: 12,
    padding: "2px 7px",
    border: "1px solid #cbd5e1",
    borderRadius: 3,
    height: 25,
    background: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
    color: "#1e293b",
    fontWeight: 600,
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    cursor: "pointer",
    userSelect: "none",
  },

  inlineCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 8,
    cursor: "pointer",
  },

  checkbox: {
    cursor: "pointer",
    width: 14,
    height: 14,
  },

  tableContainer: {
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#ffffff",
    marginBottom: 12,
    maxHeight: 320,
    overflow: "auto",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1000,
  },

  tableHeaderRow: {
    display: "grid",
    gap: 8,
    fontSize: 10,
    fontWeight: 700,
    color: "#ffffff",
    background: "#1e3a8a",
    padding: "6px 10px",
    textTransform: "uppercase",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },

  tableRow: {
    display: "grid",
    gap: 8,
    padding: "4px 10px",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.15s ease",
  },

  th: {
    background: "#1e3a8a",
    color: "white",
    fontWeight: 700,
    fontSize: 10,
    padding: "6px 10px",
    textAlign: "left",
    position: "sticky",
    top: 0,
    zIndex: 10,
    whiteSpace: "nowrap",
    textTransform: "uppercase",
  },

  td: {
    padding: "4px 10px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
    fontSize: 12,
    color: "#1e293b",
  },

  smallButton: {
    padding: "4px 12px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #1e3a8a",
    background: "#1e3a8a",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.025em",
    transition: "all 0.15s ease",
  },

  linkButton: {
    padding: "2px 8px",
    fontSize: 10,
    borderRadius: 3,
    border: "1px solid #ef4444",
    background: "#fef2f2",
    color: "#b91c1c",
    cursor: "pointer",
    fontWeight: 700,
    textTransform: "uppercase",
    transition: "all 0.15s ease",
  },

  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px",
    background: "#1e3a8a",
    color: "white",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    marginTop: 8,
  },

  chip: {
    background: "#f1f5f9",
    color: "#475569",
    fontSize: 9,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 12,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    textTransform: "uppercase",
    border: "1px solid #e2e8f0",
  },

  acWrap: {
    position: "relative",
    width: "100%",
  },

  acMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 2px)",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 4,
    zIndex: 1300,
    maxHeight: 180,
    overflow: "auto",
    fontSize: 11,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },

  acItem: (active) => ({
    padding: "7px 10px",
    cursor: "pointer",
    background: active ? "#f1f5f9" : "#ffffff",
    fontWeight: active ? 700 : 600,
    color: active ? "#1e3a8a" : "#334155",
    borderBottom: "1px solid #f8fafc",
  }),

  acIcon: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 10,
    color: "#94a3b8",
    pointerEvents: "none",
  },
};
