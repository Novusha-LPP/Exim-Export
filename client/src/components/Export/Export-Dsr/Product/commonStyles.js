// commonStyles.js

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
    color: "#1f2933",
    padding: 12,
    background: "#f5f7fb",
  },

  sectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  subSectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 6,
    borderBottom: "1px solid #dde3f0",
    paddingBottom: 3,
  },

  card: {
    background: "#ffffff",
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.02)",
  },

  cardTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 13,
    marginBottom: 8,
  },

  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 6,
    alignItems: "end",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 6,
    alignItems: "end",
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 6,
    alignItems: "end",
  },

  field: {
    marginBottom: 4,
  },

  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#25324b",
    letterSpacing: 0.4,
    marginBottom: 3,
    display: "block",
  },

  input: {
    width: "100%",
    fontSize: 12,
    padding: "3px 7px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "4px 7px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    minHeight: 40,
    background: "#f7fafc",
    resize: "vertical",
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    fontSize: 12,
    padding: "3px 7px",
    border: "1px solid #c4ccd8",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#25324b",
    textTransform: "uppercase",
    marginBottom: 6,
  },

  tableHeaderRow: {
    display: "grid",
    gridTemplateColumns: "0.7fr 1.3fr 1fr 1.1fr 0.9fr 1.1fr 1.2fr 0.6fr",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#f9fafb",
    background: "#16408f",
    padding: "5px 8px",
    marginTop: 6,
  },

  tableRow: {
    display: "grid",
    gridTemplateColumns: "0.7fr 1.3fr 1fr 1.1fr 0.9fr 1.1fr 1.2fr 0.6fr",
    gap: 6,
    padding: "5px 8px",
    alignItems: "center",
    borderBottom: "1px solid #e0e5f0",
  },

  tableContainer: {
    border: "1px solid #d2d8e4",
    borderRadius: 6,
    background: "#ffffff",
    marginBottom: 10,
    maxHeight: 300,
    overflow: "auto",
  },

  smallButton: {
    padding: "3px 9px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #16408f",
    background: "#16408f",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 600,
  },

  linkButton: {
    padding: "2px 7px",
    fontSize: 11,
    borderRadius: 4,
    border: "1px solid #e53e3e",
    background: "#fff5f5",
    color: "#c53030",
    cursor: "pointer",
    fontWeight: 600,
  },

  acWrap: {
    position: "relative",
    display: "inline-block",
    width: "100%",
  },

  acMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    background: "#ffffff",
    border: "1px solid #ccd5e3",
    borderRadius: 3,
    zIndex: 1300,
    maxHeight: 160,
    overflow: "auto",
    fontSize: 11,
  },

  acItem: (active) => ({
    padding: "4px 6px",
    cursor: "pointer",
    background: active ? "#e5edff" : "#ffffff",
    fontWeight: active ? 700 : 500,
    color: "#1f2933",
  }),

  acIcon: {
    position: "absolute",
    right: 6,
    top: 6,
    fontSize: 10,
    color: "#9aa5b5",
    pointerEvents: "none",
  },

  inlineHint: {
    fontSize: 10,
    color: "#6b7280",
    marginLeft: 4,
  },

  page: {
    fontFamily: "'Segoe UI', Roboto, Arial, sans-serif",
    fontSize: 13,
    color: "#1e2e38",
  },
  row: { display: "flex", gap: 20, alignItems: "stretch", marginBottom: 0 },
  col: { flex: 1, minWidth: 0 },
  card: {
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 7,
    padding: 13,
    marginBottom: 18,
  },
  sectionTitle: {
    fontWeight: 700,
    color: "#16408f",
    fontSize: 12,
    marginBottom: 10,
    letterSpacing: 1.3,
  },
  split: { display: "flex", gap: 8 },
  half: { flex: 1, minWidth: 0 },
  field: { marginBottom: 8 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#263046",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  input: {
    width: "100%",
    textTransform: "uppercase",
    fontWeight: 600,
    fontSize: 12,
    padding: "2.5px 8px",
    border: "1px solid #bdc7d1",
    borderRadius: 3,
    height: 26,
    background: "#f7fafc",
    outline: "none",
    boxSizing: "border-box",
  },
  acWrap: { position: "relative" },
  acIcon: {
    position: "absolute",
    right: 8,
    top: 8,
    fontSize: 11,
    color: "#bbbbbb",
    pointerEvents: "none",
  },
  acMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 28,
    background: "#fff",
    border: "1.5px solid #d3e3ea",
    borderRadius: 4,
    zIndex: 13,
    fontSize: 12,
    fontWeight: 600,
    maxHeight: 154,
    overflow: "auto",
  },
  acItem: (active) => ({
    padding: "6px 9px",
    cursor: "pointer",
    textTransform: "uppercase",
    background: active ? "#eaf2fe" : "#fff",
    color: active ? "#18427c" : "#1b2b38",
    fontWeight: active ? 700 : 600,
  }),
  textarea: {
    width: "100%",
    fontSize: 13,
    padding: "5px 8px",
    border: "1.5px solid #ccd6dd",
    borderRadius: 4,
    minHeight: 45,
    background: "#f7fafc",
    resize: "vertical",
    textTransform: "uppercase",
    fontWeight: 600,
  },
};
