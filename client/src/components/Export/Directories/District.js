import React, { useState, useCallback, useEffect, useRef } from "react";
import { Container, Row, Col, Button, Alert, Table, Form, Card, Spinner } from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const colors = { primary: "#4f46e5", secondary: "#64748b", background: "#f8fafc", border: "#e2e8f0" };
const customStyles = {
  header: { padding: "24px 32px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", borderRadius: "12px 12px 0 0" },
  card: { borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)", overflow: "hidden" },
  input: { borderRadius: "8px", border: `1.5px solid ${colors.border}`, padding: "10px 14px", fontSize: "14px" },
  label: { fontSize: "13px", fontWeight: "600", marginBottom: "8px", display: "block" },
  btnPrimary: { background: "#10b981", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "600" }
};

const DistrictService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/districts`,
  getAll: (p) => axios.get(`${DistrictService.baseURL}/`, { params: p }).then(r => r.data),
  create: (d) => axios.post(`${DistrictService.baseURL}/`, d),
  update: (id, d) => axios.put(`${DistrictService.baseURL}/${id}`, d),
  delete: (id) => axios.delete(`${DistrictService.baseURL}/${id}`),
};

const DistrictForm = ({ districtData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ districtCode: "", districtName: "", stateName: "", stateCode: "", status: "Active" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    if (districtData) setFormData(districtData); 
    else setFormData({ districtCode: "", districtName: "", stateName: "", stateCode: "", status: "Active" }); 
  }, [districtData]);

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    try { 
      if (districtData?._id) await DistrictService.update(districtData._id, formData); 
      else await DistrictService.create(formData); 
      onSave(); 
    } catch (err) { 
      alert(err.message); 
    } finally { 
      setLoading(false); 
    } 
  };

  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.header}><h5 className="mb-0 text-white fw-bold">{districtData ? "Edit District" : "New District"}</h5></Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="mb-4 g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label style={customStyles.label}>District Code *</Form.Label>
                <Form.Control type="text" name="districtCode" value={formData.districtCode} onChange={e => setFormData(p => ({ ...p, districtCode: e.target.value.toUpperCase() }))} style={customStyles.input} required />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label style={customStyles.label}>District Name *</Form.Label>
                <Form.Control type="text" name="districtName" value={formData.districtName} onChange={e => setFormData(p => ({ ...p, districtName: e.target.value }))} style={customStyles.input} required />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label style={customStyles.label}>Status</Form.Label>
                <Form.Select name="status" value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} style={customStyles.input}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-4 g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label style={customStyles.label}>State Name</Form.Label>
                <Form.Control type="text" name="stateName" value={formData.stateName} onChange={e => setFormData(p => ({ ...p, stateName: e.target.value }))} style={customStyles.input} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label style={customStyles.label}>State Code</Form.Label>
                <Form.Control type="text" name="stateCode" value={formData.stateCode} onChange={e => setFormData(p => ({ ...p, stateCode: e.target.value.toUpperCase() }))} style={customStyles.input} />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-3">
            <Button variant="link" onClick={onCancel} style={{ color: colors.secondary, textDecoration: "none" }}>Discard</Button>
            <Button style={customStyles.btnPrimary} type="submit" disabled={loading}>{loading ? <Spinner size="sm" /> : "Save District"}</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

const DistrictList = ({ onEdit, onDelete, refresh }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ page: 1, search: "" });
  const searchTimeout = useRef(null);

  useEffect(() => { fetchDistricts(); }, [filters, refresh]);

  const fetchDistricts = async () => { 
    try { 
      setLoading(true); 
      const res = await DistrictService.getAll(filters); 
      setData(res.data || []); 
      setPagination(res.pagination || {}); 
    } catch (e) { 
      console.error(e);
    } finally { 
      setLoading(false); 
    } 
  };

  const handleFilter = (k, v) => setFilters(p => ({ ...p, [k]: v, page: k === "page" ? v : 1 }));
  const handleSearch = (v) => { 
    if (searchTimeout.current) clearTimeout(searchTimeout.current); 
    searchTimeout.current = setTimeout(() => handleFilter("search", v), 500); 
  };

  const renderPagination = () => {
    const { currentPage, totalPages } = pagination; 
    if (totalPages <= 1) return null;
    const pages = []; 
    for (let i = 1; i <= totalPages; i++) { 
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) pages.push(i); 
      else if (pages[pages.length-1] !== "...") pages.push("..."); 
    }
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
      <Card className="mb-4 border-0 shadow-sm rounded-4">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col md={12}>
              <Form.Control type="text" placeholder="Search Districts (Name or Code)..." defaultValue={filters.search} onChange={e => handleSearch(e.target.value)} style={customStyles.input} />
            </Col>
          </Row>
        </Card.Body>
      </Card>
      <div className="bg-white rounded-4 shadow-sm overflow-hidden border">
        <Table hover className="mb-0 align-middle border-0">
          <thead className="bg-light">
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              <th className="ps-4 py-3 text-muted small">CODE</th>
              <th className="py-3 text-muted small">DISTRICT</th>
              <th className="py-3 text-muted small">STATE</th>
              <th className="pe-4 py-3 text-end text-muted small">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map(item => (
              <tr key={item._id} className="border-bottom">
                <td className="ps-4 fw-bold text-success">{item.districtCode}</td>
                <td className="fw-semibold">{item.districtName}</td>
                <td>{item.stateName || item.stateCode || "-"}</td>
                <td className="pe-4 text-end">
                  <Button variant="light" size="sm" className="me-2 fw-bold text-success" onClick={() => onEdit(item)}>Edit</Button>
                  <Button variant="link" size="sm" className="text-danger p-0 fw-bold" style={{ textDecoration: "none" }} onClick={() => { if(window.confirm("Delete?")) { DistrictService.delete(item._id).then(() => fetchDistricts()); } }}>Delete</Button>
                </td>
              </tr>
            )) : <tr><td colSpan="4" className="text-center py-5">{loading ? <Spinner animation="border" /> : "No records found."}</td></tr>}
          </tbody>
        </Table>
      </div>
      {renderPagination()}
    </div>
  );
};

const District = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);

  return (
    <div style={{ background: colors.background, minHeight: "100vh" }}>
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-0 text-dark">District Master</h2>
            <p className="text-muted small mb-0">Manage districts and state mapping</p>
          </div>
          <Button onClick={() => { setShowForm(!showForm); if(!showForm) setEditing(null); }} style={customStyles.btnPrimary}>
            {showForm ? "View List" : "+ Add District"}
          </Button>
        </div>
        <div className="animate-fade-in">
          {showForm ? (
            <DistrictForm districtData={editing} onSave={() => { setShowForm(false); setRefresh(r => r+1); }} onCancel={() => setShowForm(false)} />
          ) : (
            <DistrictList onEdit={(d) => { setEditing(d); setShowForm(true); }} refresh={refresh} />
          )}
        </div>
      </Container>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .page-link { color: #10b981; border: none; background: #fff; } .page-item.active .page-link { background: #10b981 !important; color: #fff !important; }`}</style>
    </div>
  );
};

export default District;
