import React, { useState, useEffect } from "react";
import axios from "axios";

const THEME = {
  blue: "#2563eb",
  border: "#e2e8f0",
  text: "#1e293b",
  textMuted: "#64748b",
  white: "#ffffff",
  bg: "#fafaffff",
};

const s = {
  wrapper: { padding: "0px" },
  card: { background: "#fff", border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "20px", marginBottom: "20px", boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  row: { display: "flex", gap: "12px", marginBottom: "15px", alignItems: "flex-end", flexWrap: 'wrap' },
  col: { flex: 1, display: "flex", flexDirection: "column", minWidth: '200px' },
  label: { fontSize: "11px", fontWeight: 800, color: THEME.textMuted, marginBottom: "6px", textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { height: "32px", border: `1px solid ${THEME.border}`, borderRadius: "6px", padding: "0 12px", fontSize: "12px", backgroundColor: '#f9fafb' },
  btn: { padding: "0 16px", height: '32px', borderRadius: "6px", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "12px", transition: 'all 0.2s' },
  btnPrimary: { backgroundColor: THEME.blue, color: "#fff", boxShadow: '0 2px 4px rgba(37,99,235,0.2)' },
  btnDanger: { backgroundColor: "#ef4444", color: "#fff", padding: "0 10px", height: '24px', fontSize: '10px', fontWeight: 800 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 10px", backgroundColor: "#19448aff", color: "#fff", fontSize: "12px", fontWeight: 700 },
  td: { padding: "12px 10px", borderBottom: `1px solid #f1f5f9`, fontSize: "12px", color: '#334155' },
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
        <h3 style={{ margin: "0 0 15px 0", fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Add New Forwarder</h3>
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
          <div style={{ ...s.col, flex: 'none', minWidth: 'auto' }}>
            <button style={{ ...s.btn, ...s.btnPrimary }} disabled={loading}>
              {loading ? "Adding..." : "+ Add Forwarder"}
            </button>
          </div>
        </form>
      </div>

      <div style={{ ...s.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9' }}>
           <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>Forwarder List</h3>
        </div>
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
                <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: THEME.textMuted, fontSize: '13px' }}>
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
