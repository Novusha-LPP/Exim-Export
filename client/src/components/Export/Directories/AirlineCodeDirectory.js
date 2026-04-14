import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Table,
  Form,
  Card,
  Spinner,
} from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

// Modern Design Tokens
const colors = {
  primary: "#4f46e5",
  primaryHover: "#4338ca",
  secondary: "#64748b",
  success: "#10b981",
  danger: "#ef4444",
  background: "#f8fafc",
  cardBg: "#ffffff",
  border: "#e2e8f0",
  textMain: "#1e293b",
  textMuted: "#64748b",
};

const customStyles = {
  header: {
    padding: "24px 32px",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "white",
    borderRadius: "12px 12px 0 0",
    border: "none",
  },
  card: {
    borderRadius: "12px",
    border: "none",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
  },
  input: {
    borderRadius: "8px",
    border: `1.5px solid ${colors.border}`,
    padding: "10px 14px",
    fontSize: "14px",
    background: "#fff",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: colors.textMain,
    marginBottom: "8px",
    display: "block",
    whiteSpace: "nowrap",
  },
  btnPrimary: {
    background: colors.primary,
    border: "none",
    padding: "10px 24px",
    borderRadius: "8px",
    fontWeight: "600",
  },
  table: {
    background: "white",
    borderRadius: "8px",
    overflow: "hidden",
  },
  badge: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
  }
};

// API Service
const AirlineService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/airlines`,
  getAll: async (params = {}) => {
    const res = await axios.get(`${AirlineService.baseURL}/`, { params });
    return res.data;
  },
  create: async (data) => axios.post(`${AirlineService.baseURL}/`, data),
  update: async (id, data) => axios.put(`${AirlineService.baseURL}/${id}`, data),
  delete: async (id) => axios.delete(`${AirlineService.baseURL}/${id}`),
};

// Form Component
const AirlineForm = ({ airlineData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    alphanumericCode: "",
    numericCode: "",
    airlineName: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (airlineData) setFormData(airlineData);
    else setFormData({ alphanumericCode: "", numericCode: "", airlineName: "", status: "Active" });
  }, [airlineData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: (name === "alphanumericCode") ? value.toUpperCase() : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (airlineData?._id) await AirlineService.update(airlineData._id, formData);
      else await AirlineService.create(formData);
      onSave();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.header}><h5 className="mb-0 text-white fw-bold">{airlineData ? "Edit Air Carrier" : "Register New Airline"}</h5></Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="mb-4 g-3">
            <Col md={4}><Form.Group><Form.Label style={customStyles.label}>Carrier Code (IATA) *</Form.Label><Form.Control type="text" name="alphanumericCode" value={formData.alphanumericCode} onChange={handleChange} placeholder="e.g. AI, 6E" style={customStyles.input} /></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label style={customStyles.label}>Numeric Code *</Form.Label><Form.Control type="text" name="numericCode" value={formData.numericCode} onChange={handleChange} placeholder="098" style={customStyles.input} /></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label style={customStyles.label}>Status</Form.Label><Form.Select name="status" value={formData.status} onChange={handleChange} style={customStyles.input}><option value="Active">Active</option><option value="Inactive">Inactive</option></Form.Select></Form.Group></Col>
          </Row>
          <Form.Group className="mb-4"><Form.Label style={customStyles.label}>Legal Airline Name *</Form.Label><Form.Control type="text" name="airlineName" value={formData.airlineName} onChange={handleChange} placeholder="Enter full name" style={customStyles.input} /></Form.Group>
          <div className="d-flex justify-content-end gap-3 pt-2">
            <Button variant="link" onClick={onCancel} style={{ color: colors.secondary, textDecoration: "none", fontWeight: 600 }}>Discard</Button>
            <Button variant="primary" type="submit" disabled={loading} style={customStyles.btnPrimary}>{loading ? <Spinner size="sm" /> : "Save Carrier"}</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

// List Component
const AirlineList = ({ onEdit, onDelete, refresh }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ page: 1, status: "", search: "" });
  const searchTimeout = useRef(null);

  useEffect(() => { fetchAirlines(); }, [filters, refresh]);

  const fetchAirlines = async () => {
    try {
      setLoading(true);
      const res = await AirlineService.getAll(filters);
      setData(res.data || res);
      setPagination(res.pagination || {});
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleFilterChange = (k, v) => setFilters(p => ({ ...p, [k]: v, page: k === "page" ? v : 1 }));
  const handleSearch = (v) => { if (searchTimeout.current) clearTimeout(searchTimeout.current); searchTimeout.current = setTimeout(() => handleFilterChange("search", v), 500); };

  const renderPagination = () => {
    const { currentPage, totalPages } = pagination;
    if (totalPages <= 1) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) pages.push(i);
        else if (pages[pages.length-1] !== "...") pages.push("...");
    }
    return (
      <div className="d-flex justify-content-center mt-4">
        <ul className="pagination pagination-sm gap-2">
          {pages.map((p, idx) => (
            <li key={idx} className={`page-item ${p === currentPage ? "active" : ""} ${p === "..." ? "disabled" : ""}`}>
              {p === "..." ? <span className="page-link border-0 bg-transparent">...</span> : <button className="page-link rounded-circle shadow-sm" style={{ width: 35, height: 35, display: "flex", alignItems: "center", justifyContent: "center", border: "none", fontWeight: 600 }} onClick={() => handleFilterChange("page", p)}>{p}</button>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <Card className="mb-4 border-0 shadow-sm rounded-4">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col md={8}><Form.Control type="text" placeholder="Global Search Carrier..." defaultValue={filters.search} onChange={e => handleSearch(e.target.value)} style={customStyles.input} /></Col>
            <Col md={4}><Form.Select value={filters.status} onChange={e => handleFilterChange("status", e.target.value)} style={customStyles.input}><option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></Form.Select></Col>
          </Row>
        </Card.Body>
      </Card>
      <div className="bg-white rounded-4 shadow-sm overflow-hidden border">
        <Table hover className="mb-0 align-middle border-0">
          <thead className="bg-light">
            <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
              <th className="ps-4 py-3 text-muted small px-1">IATA CODE</th>
              <th className="py-3 text-muted small px-1">NUMERIC</th>
              <th className="py-3 text-muted small px-1">CARRIER NAME</th>
              <th className="py-3 text-muted small px-1">STATUS</th>
              <th className="pe-4 py-3 text-end text-muted small px-1">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map(item => (
              <tr key={item._id} className="border-bottom">
                <td className="ps-4 fw-bold text-primary">{item.alphanumericCode}</td>
                <td className="font-monospace text-muted">{item.numericCode}</td>
                <td className="fw-semibold">{item.airlineName}</td>
                <td><span style={{ ...customStyles.badge, background: item.status === "Active" ? "#ecfdf5" : "#f1f5f9", color: item.status === "Active" ? "#059669" : "#64748b" }}>{item.status}</span></td>
                <td className="pe-4 text-end">
                   <Button variant="light" size="sm" className="me-2 fw-bold text-primary" onClick={() => onEdit(item)}>Edit</Button>
                   <Button variant="link" size="sm" className="text-danger p-0 fw-bold" style={{ textDecoration: "none", fontSize: "12px" }} onClick={() => onDelete([item._id])}>Delete</Button>
                </td>
              </tr>
            )) : <tr><td colSpan="5" className="text-center py-5 text-muted">No carriers found.</td></tr>}
          </tbody>
        </Table>
      </div>
      {renderPagination()}
    </div>
  );
};

const AirlineCodeDirectory = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = (m, t = "success") => { setAlert({ m, t }); setTimeout(() => setAlert(null), 5000); };
  const handleAddNew = () => { setEditing(null); setShowForm(true); };
  const handleEdit = (d) => { setEditing(d); setShowForm(true); };
  const handleSave = () => { setShowForm(false); setEditing(null); setRefresh(r => r + 1); showAlert(editing ? "Carrier updated" : "Carrier created"); };
  const handleCancel = () => { setShowForm(false); setEditing(null); };

  const handleDelete = async (ids) => {
    if (window.confirm("Delete record?")) {
      try { await AirlineService.delete(ids[0]); showAlert("Record deleted"); setRefresh(r => r + 1); }
      catch (e) { showAlert(e.message, "danger"); }
    }
  };

  return (
    <div style={{ background: colors.background, minHeight: "100vh" }}>
      <Container className="py-4">
        {alert && <Alert variant={alert.t} dismissible onClose={() => setAlert(null)} className="shadow-sm border-0">{alert.m}</Alert>}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div><h2 className="fw-bold mb-0 text-dark">Airline Directory</h2><p className="text-muted small mb-0">Manage global air carrier codes and status</p></div>
          <Button onClick={showForm ? handleCancel : handleAddNew} style={customStyles.btnPrimary}>{showForm ? "View List" : "+ Register Carrier"}</Button>
        </div>
        <div className="animate-fade-in">{showForm ? <AirlineForm airlineData={editing} onSave={handleSave} onCancel={handleCancel} /> : <AirlineList onEdit={handleEdit} onDelete={handleDelete} refresh={refresh} />}</div>
      </Container>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .page-link { color: ${colors.primary}; border: none; background: #fff; } .page-item.active .page-link { background: ${colors.primary} !important; color: #fff !important; }`}</style>
    </div>
  );
};

export default AirlineCodeDirectory;
