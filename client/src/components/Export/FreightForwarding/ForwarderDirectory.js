import React, { useState, useEffect } from "react";
import axios from "axios";

const THEME = {
  blue: "#16408f",
  border: "#cbd5e1",
  text: "#0f172a",
  textMuted: "#64748b",
  white: "#ffffff",
  bg: "#f8fafc",
};

const s = {
  wrapper: { padding: "0px" },
  card: { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 3, padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  row: { display: "flex", gap: "16px", marginBottom: "15px", alignItems: "flex-end", flexWrap: "wrap" },
  col: { flex: 1, display: "flex", flexDirection: "column", minWidth: "200px" },
  label: { fontSize: "11.5px", fontWeight: 600, color: THEME.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { height: "34px", border: `1px solid ${THEME.border}`, borderRadius: "3px", padding: "0 12px", fontSize: "12.5px", backgroundColor: "#fff", color: "#0f172a", outline: "none", transition: "all 0.15s ease" },
  btn: { padding: "0 20px", height: "34px", borderRadius: "3px", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "12.5px", transition: "all 0.15s ease" },
  btnPrimary: { backgroundColor: THEME.blue, color: "#fff" },
  btnDanger: { backgroundColor: "#ef4444", color: "#fff", padding: "0 12px", height: "28px", borderRadius: "3px", fontSize: "11px", fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "14px 16px", backgroundColor: "#19448aff", color: "#fff", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" },
  td: { padding: "10px 16px", borderBottom: "1px solid #cbd5e1", fontSize: "12px", color: "#1e293b", verticalAlign: "middle" },
};

function ForwarderDirectory() {
  const [forwarders, setForwarders] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", contact_person: "", phone: "", mobile_no: "" });
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
        setFormData({ name: "", email: "", contact_person: "", phone: "", mobile_no: "" });
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
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              placeholder="e.g. rates@fwd.com, info@fwd.com"
            />
          </div>
          <div style={s.col}>
            <label style={s.label}>Mobile No</label>
            <input
              style={s.input}
              value={formData.mobile_no}
              onChange={(e) => setFormData({ ...formData, mobile_no: e.target.value })}
              placeholder="Mobile No"
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
              <th style={s.th}>Mobile No</th>
              <th style={s.th}>Contact Person</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forwarders.map((f) => (
              <tr key={f._id} style={{ transition: "background-color 0.15s ease" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                <td style={s.td}>{f.name}</td>
                <td style={s.td}>{f.email}</td>
                <td style={s.td}>{f.mobile_no || "-"}</td>
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
                <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: THEME.textMuted, fontSize: '13px' }}>
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
