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

const colors = {
  primary: "#4f46e5",
  secondary: "#64748b",
  success: "#10b981",
  danger: "#ef4444",
  background: "#f8fafc",
  border: "#e2e8f0",
  textMain: "#1e293b",
  textMuted: "#64748b",
};

const customStyles = {
  header: { padding: "24px 32px", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", color: "white", borderRadius: "12px 12px 0 0", border: "none" },
  card: { borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)", overflow: "hidden" },
  input: { borderRadius: "8px", border: `1.5px solid ${colors.border}`, padding: "10px 14px", fontSize: "14px", background: "#fff" },
  label: { fontSize: "13px", fontWeight: "600", color: colors.textMain, marginBottom: "8px", display: "block" },
  btnPrimary: { background: colors.primary, border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "600" },
  badge: { padding: "6px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }
};

const CountryService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/countries`,
  getAll: (p) => axios.get(`${CountryService.baseURL}/`, { params: p }).then(r => r.data),
  create: (d) => axios.post(`${CountryService.baseURL}/`, d),
  update: (id, d) => axios.put(`${CountryService.baseURL}/${id}`, d),
  delete: (id) => axios.delete(`${CountryService.baseURL}/${id}`),
};

const CountryForm = ({ countryData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ countryCode: "", countryName: "", status: "Active" });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (countryData) setFormData(countryData); else setFormData({ countryCode: "", countryName: "", status: "Active" }); }, [countryData]);
  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.name === "countryCode" ? e.target.value.toUpperCase() : e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { if (countryData?._id) await CountryService.update(countryData._id, formData); else await CountryService.create(formData); onSave(); }
    catch (err) { alert(err.message); } finally { setLoading(false); }
  };
  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.header}><h5 className="mb-0 text-white fw-bold">{countryData ? "Edit Country" : "Add New Country"}</h5></Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="mb-4 g-3">
            <Col md={4}><Form.Group><Form.Label style={customStyles.label}>Country Code (ISO) *</Form.Label><Form.Control type="text" name="countryCode" value={formData.countryCode} onChange={handleChange} placeholder="e.g. US, IND" maxLength={3} style={customStyles.input} /></Form.Group></Col>
            <Col md={5}><Form.Group><Form.Label style={customStyles.label}>Country Name *</Form.Label><Form.Control type="text" name="countryName" value={formData.countryName} onChange={handleChange} placeholder="Enter full name" style={customStyles.input} /></Form.Group></Col>
            <Col md={3}><Form.Group><Form.Label style={customStyles.label}>Status</Form.Label><Form.Select name="status" value={formData.status} onChange={handleChange} style={customStyles.input}><option value="Active">Active</option><option value="Inactive">Inactive</option></Form.Select></Form.Group></Col>
          </Row>
          <div className="d-flex justify-content-end gap-3 pt-2">
            <Button variant="link" onClick={onCancel} style={{ color: colors.secondary, textDecoration: "none", fontWeight: 600 }}>Discard</Button>
            <Button variant="primary" type="submit" disabled={loading} style={customStyles.btnPrimary}>{loading ? <Spinner size="sm" /> : "Save Country"}</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

const CountryList = ({ onEdit, onDelete, refresh }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ page: 1, status: "", search: "" });
  const searchTimeout = useRef(null);
  useEffect(() => { fetchCountries(); }, [filters, refresh]);
  const fetchCountries = async () => {
    try { setLoading(true); const res = await CountryService.getAll(filters); setData(res.data || res); setPagination(res.pagination || {}); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const handleFilter = (k, v) => setFilters(p => ({ ...p, [k]: v, page: k === "page" ? v : 1 }));
  const handleSearch = (v) => { if (searchTimeout.current) clearTimeout(searchTimeout.current); searchTimeout.current = setTimeout(() => handleFilter("search", v), 500); };
  const renderPagination = () => {
    const { currentPage, totalPages } = pagination; if (totalPages <= 1) return null;
    const pages = []; for (let i = 1; i <= totalPages; i++) { if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) pages.push(i); else if (pages[pages.length-1] !== "...") pages.push("..."); }
    return (
      <nav className="d-flex justify-content-center mt-4">
        <ul className="pagination pagination-sm gap-2">
          {pages.map((p, idx) => (
            <li key={idx} className={`page-item ${p === currentPage ? "active" : ""} ${p === "..." ? "disabled" : ""}`}>
              {p === "..." ? <span className="page-link border-0">...</span> : <button className="page-link rounded-circle" style={{ width: 35, height: 35, display: "flex", alignItems: "center", justifyContent: "center", border: "none", fontWeight: 600 }} onClick={() => handleFilter("page", p)}>{p}</button>}
            </li>
          ))}
        </ul>
      </nav>
    );
  };
  return (
    <div>
      <Card className="mb-4 border-0 shadow-sm rounded-4"><Card.Body className="p-3"><Row className="g-3"><Col md={8}><Form.Control type="text" placeholder="Global Search Country..." defaultValue={filters.search} onChange={e => handleSearch(e.target.value)} style={customStyles.input} /></Col><Col md={4}><Form.Select value={filters.status} onChange={e => handleFilter("status", e.target.value)} style={customStyles.input}><option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></Form.Select></Col></Row></Card.Body></Card>
      <div className="bg-white rounded-4 shadow-sm overflow-hidden border">
        <Table hover className="mb-0 align-middle border-0">
          <thead className="bg-light"><tr style={{ borderBottom: `2px solid ${colors.border}` }}><th className="ps-4 py-3 text-muted small">CODE</th><th className="py-3 text-muted small">COUNTRY NAME</th><th className="py-3 text-muted small">STATUS</th><th className="pe-4 py-3 text-end text-muted small">ACTIONS</th></tr></thead>
          <tbody>
            {data.length > 0 ? data.map(item => (
              <tr key={item._id} className="border-bottom"><td className="ps-4 fw-bold text-primary">{item.countryCode}</td><td className="fw-semibold">{item.countryName}</td><td><span style={{ ...customStyles.badge, background: item.status === "Active" ? "#ecfdf5" : "#f1f5f9", color: item.status === "Active" ? "#059669" : "#64748b" }}>{item.status}</span></td><td className="pe-4 text-end"><Button variant="light" size="sm" className="me-2 fw-bold text-primary" onClick={() => onEdit(item)}>Edit</Button><Button variant="link" size="sm" className="text-danger p-0 fw-bold" style={{ textDecoration: "none" }} onClick={() => onDelete([item._id])}>Delete</Button></td></tr>
            )) : <tr><td colSpan="4" className="text-center py-5 text-muted">No countries found.</td></tr>}
          </tbody>
        </Table>
      </div>
      {renderPagination()}
    </div>
  );
};

const Country = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);
  const handleAddNew = () => { setEditing(null); setShowForm(true); };
  const handleEdit = (d) => { setEditing(d); setShowForm(true); };
  const handleSave = () => { setShowForm(false); setEditing(null); setRefresh(r => r + 1); setAlert({ m: editing ? "Updated" : "Created", t: "success" }); setTimeout(() => setAlert(null), 5000); };
  const handleDelete = async (ids) => { if (window.confirm("Delete?")) { await CountryService.delete(ids[0]); setRefresh(r => r + 1); } };
  return (
    <div style={{ background: colors.background, minHeight: "100vh" }}>
      <Container className="py-4">
        {alert && <Alert variant={alert.t} dismissible className="shadow-sm border-0">{alert.m}</Alert>}
        <div className="d-flex justify-content-between align-items-center mb-4"><div><h2 className="fw-bold mb-0 text-dark">Country Master</h2><p className="text-muted small mb-0">Global region database</p></div><Button onClick={showForm ? () => setShowForm(false) : handleAddNew} style={customStyles.btnPrimary}>{showForm ? "Back" : "+ Add Country"}</Button></div>
        <div className="animate-fade-in">{showForm ? <CountryForm countryData={editing} onSave={handleSave} onCancel={() => setShowForm(false)} /> : <CountryList onEdit={handleEdit} onDelete={handleDelete} refresh={refresh} />}</div>
      </Container>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .page-link { color: ${colors.primary}; border: none; background: #fff; } .page-item.active .page-link { background: ${colors.primary} !important; color: #fff !important; }`}</style>
    </div>
  );
};
export default Country;
