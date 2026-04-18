import React, { useState, useEffect } from "react";
import axios from "axios";

const THEME = {
  blue: "#2563eb",
  border: "#e5e7eb",
  text: "#111827",
  textMuted: "#6b7280",
  white: "#ffffff",
  bg: "#fafaff",
};

const s = {
  wrapper: { padding: "20px" },
  card: { background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "20px", marginBottom: "20px" },
  row: { display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-end" },
  col: { flex: 1, display: "flex", flexDirection: "column" },
  label: { fontSize: "12px", fontWeight: 700, color: THEME.textMuted, marginBottom: "5px" },
  input: { height: "36px", border: `1px solid ${THEME.border}`, borderRadius: "6px", padding: "0 10px", fontSize: "13px" },
  btn: { padding: "8px 16px", borderRadius: "6px", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "13px" },
  btnPrimary: { backgroundColor: THEME.blue, color: "#fff" },
  btnDanger: { backgroundColor: "#ef4444", color: "#fff", padding: "4px 8px", fontSize: "11px" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
  th: { textAlign: "left", padding: "10px", borderBottom: `1px solid ${THEME.border}`, color: THEME.textMuted, fontSize: "12px" },
  td: { padding: "10px", borderBottom: `1px solid ${THEME.border}`, fontSize: "13px" },
};

function ForwarderDirectory() {
  const [forwarders, setForwarders] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", contact_person: "", phone: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchForwarders();
  }, []);

  const fetchForwarders = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/forwarders`);
      if (res.data.success) setForwarders(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/forwarders`, formData);
      if (res.data.success) {
        setForwarders([...forwarders, res.data.data]);
        setFormData({ name: "", email: "", contact_person: "", phone: "" });
      }
    } catch (err) {
      alert("Error adding forwarder. Email might be duplicate.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this forwarder?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_STRING}/forwarders/${id}`);
      setForwarders(forwarders.filter((f) => f._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <h3 style={{ margin: "0 0 15px 0" }}>Add New Forwarder</h3>
        <form onSubmit={handleAdd} style={s.row}>
          <div style={s.col}>
            <label style={s.label}>Forwarder Name *</label>
            <input
              style={s.input}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="e.g. MAERSK"
            />
          </div>
          <div style={s.col}>
            <label style={s.label}>Email Address *</label>
            <input
              style={s.input}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              placeholder="rates@forwarder.com"
            />
          </div>
          <div style={s.col}>
            <label style={s.label}>Contact Person</label>
            <input
              style={s.input}
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value.toUpperCase() })}
            />
          </div>
          <div style={s.col}>
            <button style={{ ...s.btn, ...s.btnPrimary }} disabled={loading}>
              {loading ? "Adding..." : "+ Add Forwarder"}
            </button>
          </div>
        </form>
      </div>

      <div style={s.card}>
        <h3 style={{ margin: "0 0 15px 0" }}>Forwarder List</h3>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Forwarder Name</th>
              <th style={s.th}>Email</th>
              <th style={s.th}>Contact Person</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forwarders.map((f) => (
              <tr key={f._id}>
                <td style={s.td}>{f.name}</td>
                <td style={s.td}>{f.email}</td>
                <td style={s.td}>{f.contact_person || "-"}</td>
                <td style={s.td}>
                  <button onClick={() => handleDelete(f._id)} style={{ ...s.btn, ...s.btnDanger }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!forwarders.length && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: THEME.textMuted }}>
                  No forwarders in directory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ForwarderDirectory;
