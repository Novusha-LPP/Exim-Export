import React, { useState, useCallback, useEffect, useRef } from "react";
import { Container, Row, Col, Button, Alert, Table, Form, Card, Spinner } from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const colors = { primary: "#4f46e5", secondary: "#64748b", background: "#f8fafc", border: "#e2e8f0" };
const customStyles = {
  header: { padding: "24px 32px", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", color: "white", borderRadius: "12px 12px 0 0" },
  card: { borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)", overflow: "hidden" },
  input: { borderRadius: "8px", border: `1.5px solid ${colors.border}`, padding: "10px 14px", fontSize: "14px" },
  label: { fontSize: "13px", fontWeight: "600", marginBottom: "8px", display: "block" },
  btnPrimary: { background: colors.primary, border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "600" }
};

const GatewayPortService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/gateway-ports`,
  getAll: (p) => axios.get(`${GatewayPortService.baseURL}/`, { params: p }).then(r => r.data),
  create: (d) => axios.post(`${GatewayPortService.baseURL}/`, d),
  update: (id, d) => axios.put(`${GatewayPortService.baseURL}/${id}`, d),
  delete: (id) => axios.delete(`${GatewayPortService.baseURL}/${id}`),
};

const GatewayPortForm = ({ portData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ name: "", unece_code: "", port_type: "Sea", location: "", status: "Active" });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (portData) setFormData(portData); else setFormData({ name: "", unece_code: "", port_type: "Sea", location: "", status: "Active" }); }, [portData]);
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); try { if (portData?._id) await GatewayPortService.update(portData._id, formData); else await GatewayPortService.create(formData); onSave(); } catch (err) { alert(err.message); } finally { setLoading(false); } };
  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.header}><h5 className="mb-0 text-white fw-bold">{portData ? "Edit Gateway" : "New Gateway Port"}</h5></Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="mb-4 g-3">
            <Col md={4}><Form.Group><Form.Label style={customStyles.label}>UNECE Code *</Form.Label><Form.Control type="text" name="unece_code" value={formData.unece_code} onChange={e => setFormData(p => ({ ...p, unece_code: e.target.value.toUpperCase() }))} style={customStyles.input} /></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label style={customStyles.label}>Port Type</Form.Label><Form.Select name="port_type" value={formData.port_type} onChange={e => setFormData(p => ({ ...p, port_type: e.target.value }))} style={customStyles.input}><option value="Sea">Sea</option><option value="Air">Air</option><option value="Rail">Rail</option><option value="Road">Road</option><option value="ICD">ICD</option></Form.Select></Form.Group></Col>
            <Col md={4}><Form.Group><Form.Label style={customStyles.label}>Status</Form.Label><Form.Select name="status" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} style={customStyles.input}><option value="Active">Active</option><option value="Inactive">Inactive</option></Form.Select></Form.Group></Col>
          </Row>
          <Form.Group className="mb-4"><Form.Label style={customStyles.label}>Gateway Name *</Form.Label><Form.Control type="text" name="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Major transshipment hub name" style={customStyles.input} /></Form.Group>
          <Form.Group className="mb-4"><Form.Label style={customStyles.label}>Location</Form.Label><Form.Control type="text" name="location" value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="City / Country" style={customStyles.input} /></Form.Group>
          <div className="d-flex justify-content-end gap-3"><Button variant="link" onClick={onCancel} style={{ color: colors.secondary, textDecoration: "none" }}>Discard</Button><Button style={customStyles.btnPrimary} type="submit" disabled={loading}>{loading ? <Spinner size="sm" /> : "Save Gateway"}</Button></div>
        </Form>
      </Card.Body>
    </Card>
  );
};

const GatewayPortList = ({ onEdit, onDelete, refresh }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ page: 1, type: "", search: "" });
  const searchTimeout = useRef(null);
  useEffect(() => { fetchPorts(); }, [filters, refresh]);
  const fetchPorts = async () => { try { setLoading(true); const res = await GatewayPortService.getAll(filters); setData(res.data || res); setPagination(res.pagination || {}); } catch (e) { } finally { setLoading(false); } };
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
              {p === "..." ? <span className="page-link border-0">...</span> : <button className="page-link rounded-circle shadow-sm" style={{ width: 35, height: 35, display: "flex", alignItems: "center", justifyContent: "center", border: "none", fontWeight: 600 }} onClick={() => handleFilter("page", p)}>{p}</button>}
            </li>
          ))}
        </ul>
      </nav>
    );
  };
  return (
    <div>
      <Card className="mb-4 border-0 shadow-sm rounded-4"><Card.Body className="p-3"><Row className="g-3"><Col md={8}><Form.Control type="text" placeholder="Global Search Gateway..." defaultValue={filters.search} onChange={e => handleSearch(e.target.value)} style={customStyles.input} /></Col><Col md={4}><Form.Select value={filters.type} onChange={e => handleFilter("type", e.target.value)} style={customStyles.input}><option value="">All Types</option><option value="Sea">Sea</option><option value="Air">Air</option><option value="ICD">ICD</option></Form.Select></Col></Row></Card.Body></Card>
      <div className="bg-white rounded-4 shadow-sm overflow-hidden border">
        <Table hover className="mb-0 align-middle border-0">
          <thead className="bg-light"><tr style={{ borderBottom: "2px solid #e2e8f0" }}><th className="ps-4 py-3 text-muted small">UNECE</th><th className="py-3 text-muted small">GATEWAY</th><th className="py-3 text-muted small">TYPE</th><th className="pe-4 py-3 text-end text-muted small">ACTIONS</th></tr></thead>
          <tbody>
            {data.length > 0 ? data.map(item => (
              <tr key={item._id} className="border-bottom"><td className="ps-4 fw-bold text-primary">{item.unece_code}</td><td className="fw-semibold">{item.name}</td><td><span className="badge bg-light text-dark border px-2 py-1">{item.port_type}</span></td><td className="pe-4 text-end"><Button variant="light" size="sm" className="me-2 fw-bold text-primary" onClick={() => onEdit(item)}>Edit</Button><Button variant="link" size="sm" className="text-danger p-0 fw-bold" style={{ textDecoration: "none" }} onClick={() => onDelete([item._id])}>Delete</Button></td></tr>
            )) : <tr><td colSpan="4" className="text-center py-5">No records found.</td></tr>}
          </tbody>
        </Table>
      </div>
      {renderPagination()}
    </div>
  );
};

const GatewayPortDirectory = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  return (
    <div style={{ background: colors.background, minHeight: "100vh" }}>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4"><div><h2 className="fw-bold mb-0 text-dark">Gateway Port Master</h2><p className="text-muted small mb-0">Manage key transshipment gateways</p></div><Button onClick={() => setShowForm(!showForm)} style={customStyles.btnPrimary}>{showForm ? "View List" : "+ Add Gateway"}</Button></div>
        <div className="animate-fade-in">{showForm ? <GatewayPortForm portData={editing} onSave={() => { setShowForm(false); setRefresh(r => r+1); }} onCancel={() => setShowForm(false)} /> : <GatewayPortList onEdit={(d) => { setEditing(d); setShowForm(true); }} onDelete={async (ids) => { if (window.confirm("Delete?")) { await GatewayPortService.delete(ids[0]); setRefresh(r => r+1); } }} refresh={refresh} />}</div>
      </Container>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .page-link { color: ${colors.primary}; border: none; background: #fff; } .page-item.active .page-link { background: ${colors.primary} !important; color: #fff !important; }`}</style>
    </div>
  );
};
export default GatewayPortDirectory;
