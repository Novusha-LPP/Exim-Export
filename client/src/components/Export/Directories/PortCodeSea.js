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
  primary: "#4f46e5", // Indigo 600
  primaryHover: "#4338ca", // Indigo 700
  secondary: "#64748b", // Slate 500
  success: "#10b981", // Emerald 500
  danger: "#ef4444", // Red 500
  background: "#f8fafc", // Slate 50
  cardBg: "#ffffff",
  border: "#e2e8f0", // Slate 200
  textMain: "#1e293b", // Slate 800
  textMuted: "#64748b", // Slate 500
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
    transition: "transform 0.2s ease",
  },
  input: {
    borderRadius: "8px",
    border: `1.5px solid ${colors.border}`,
    padding: "10px 14px",
    fontSize: "14px",
    transition: "all 0.2s ease",
    background: "#fff",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: colors.textMain,
    marginBottom: "8px",
    display: "block",
    whiteSpace: "nowrap",
    height: "20px",
  },
  btnPrimary: {
    background: colors.primary,
    border: "none",
    padding: "10px 24px",
    borderRadius: "8px",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  btnSecondary: {
    background: "#fff",
    color: colors.secondary,
    border: `1.5px solid ${colors.border}`,
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
    letterSpacing: "0.5px",
  }
};

// API Service
const PortService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/seaPorts`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${PortService.baseURL}/`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${PortService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${PortService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`${PortService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${PortService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const PortForm = ({ portData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    portCode: "",
    portName: "",
    uneceCode: "",
    portDetails: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (portData) {
      setFormData(portData);
    } else {
      setFormData({
        portCode: "",
        portName: "",
        uneceCode: "",
        portDetails: "",
        country: "",
      });
    }
  }, [portData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: (name === "portCode" || name === "uneceCode") ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.portCode?.trim()) newErrors.portCode = "Required";
    if (!formData.portName?.trim()) newErrors.portName = "Required";
    if (!formData.country?.trim()) newErrors.country = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (portData?._id) await PortService.update(portData._id, formData);
      else await PortService.create(formData);
      onSave();
    } catch (error) {
      alert(error.message || "Error saving port");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={customStyles.card}>
      <Card.Header style={customStyles.header}>
        <h5 className="mb-0 text-white font-weight-bold">
          {portData ? "Modify Port Details" : "Register New Sea Port"}
        </h5>
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit}>
          <Row className="mb-4 g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label style={customStyles.label}>Port Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="portCode"
                  value={formData.portCode}
                  onChange={handleChange}
                  isInvalid={!!errors.portCode}
                  placeholder="e.g. INMAA"
                  maxLength={10}
                  style={customStyles.input}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label style={customStyles.label}>Port Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="portName"
                  value={formData.portName}
                  onChange={handleChange}
                  isInvalid={!!errors.portName}
                  placeholder="Enter name"
                  style={customStyles.input}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label style={customStyles.label}>UNECE Code</Form.Label>
                <Form.Control
                  type="text"
                  name="uneceCode"
                  value={formData.uneceCode}
                  onChange={handleChange}
                  placeholder="e.g. TRKUM"
                  style={customStyles.input}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label style={customStyles.label}>Country *</Form.Label>
                <Form.Control
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  isInvalid={!!errors.country}
                  placeholder="Enter country"
                  style={customStyles.input}
                />
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col md={12}>
              <Form.Group>
                <Form.Label style={customStyles.label}>Port Infrastructure & Details</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="portDetails"
                  value={formData.portDetails}
                  onChange={handleChange}
                  placeholder="Describe port facilities..."
                  style={{ ...customStyles.input, minHeight: "100px" }}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-3 pt-2">
            <Button variant="link" onClick={onCancel} disabled={loading} style={{ color: colors.secondary, textDecoration: "none", fontWeight: "600" }}>
              Discard Changes
            </Button>
            <Button variant="primary" type="submit" disabled={loading} style={customStyles.btnPrimary}>
              {loading ? <Spinner size="sm" /> : (portData ? "Update Record" : "Save Record")}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

// List Component
const PortList = ({ onEdit, onDelete, refresh }) => {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [availableCountries, setAvailableCountries] = useState([]);
  const [filters, setFilters] = useState({ page: 1, country: "", search: "" });
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchPorts();
  }, [filters, refresh]);

  const fetchPorts = async () => {
    try {
      setLoading(true);
      const response = await PortService.getAll(filters);
      const data = response.data || response;
      setPorts(Array.isArray(data) ? data : []);
      setPagination(response.pagination || {});
      if (!filters.country) {
         const countries = [...new Set((Array.isArray(data) ? data : []).map((item) => item.country))].sort();
         setAvailableCountries(countries);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setPorts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? value : 1 }));
  };

  const handleSearchChange = (val) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      handleFilterChange("search", val);
    }, 500);
  };

  const renderPagination = () => {
    const { currentPage, totalPages } = pagination;
    if (totalPages <= 1) return null;

    const pages = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== "...") {
            pages.push("...");
        }
    }

    return (
      <div className="d-flex justify-content-center mt-4 pb-3">
        <nav>
          <ul className="pagination pagination-sm gap-2">
            {pages.map((p, idx) => (
              <li key={idx} className={`page-item ${p === currentPage ? "active" : ""} ${p === "..." ? "disabled" : ""}`}>
                {p === "..." ? (
                  <span className="page-link border-0 bg-transparent text-muted">...</span>
                ) : (
                  <button 
                    className="page-link rounded-circle shadow-sm" 
                    style={{ width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", border: "none", fontSize: "13px", fontWeight: "600" }}
                    onClick={() => handleFilterChange("page", p)}
                  >
                    {p}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    );
  };

  if (loading && !ports.length) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" style={{ color: colors.primary }} />
        <p className="mt-3 text-muted fw-bold">Connecting to Master Database...</p>
      </div>
    );
  }

  return (
    <div>
      <Card className="mb-4 border-0 shadow-sm" style={{ borderRadius: "12px" }}>
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col md={7}>
                <Form.Control
                  type="text"
                  placeholder="Global Search (Name, Code, UNECE...)"
                  defaultValue={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  style={customStyles.input}
                />
            </Col>
            <Col md={5}>
              <Form.Select
                value={filters.country}
                onChange={(e) => handleFilterChange("country", e.target.value)}
                style={customStyles.input}
              >
                <option value="">All Countries</option>
                {availableCountries.map((c) => (<option key={c} value={c}>{c}</option>))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="shadow-sm rounded-4 overflow-hidden border bg-white">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle border-0">
            <thead className="bg-light">
              <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                <th className="ps-4 py-3" style={{ fontSize: "11px", color: colors.textMuted, letterSpacing: "1px" }}>PORT CODE</th>
                <th className="py-3" style={{ fontSize: "11px", color: colors.textMuted, letterSpacing: "1px" }}>UNECE CODE</th>
                <th className="py-3" style={{ fontSize: "11px", color: colors.textMuted, letterSpacing: "1px" }}>PORT NAME</th>
                <th className="py-3" style={{ fontSize: "11px", color: colors.textMuted, letterSpacing: "1px" }}>COUNTRY</th>
                <th className="pe-4 py-3 text-end" style={{ fontSize: "11px", color: colors.textMuted, letterSpacing: "1px" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {ports.length > 0 ? (
                ports.map((item) => (
                  <tr key={item._id} className="border-bottom">
                    <td className="ps-4"><div className="fw-bold" style={{ color: colors.primary }}>{item.portCode}</div></td>
                    <td><div className="font-monospace text-muted small">{item.uneceCode || "—"}</div></td>
                    <td><div className="fw-semibold">{item.portName}</div></td>
                    <td><span style={{ ...customStyles.badge, background: "#e0e7ff", color: "#4338ca" }}>{item.country}</span></td>
                    <td className="pe-4 text-end">
                      <Button variant="light" size="sm" className="me-2" style={{ borderRadius: "6px", color: colors.primary, fontWeight: 600 }} onClick={() => onEdit(item)}>Edit</Button>
                      <Button variant="link" size="sm" className="text-danger p-0 fw-bold" style={{ textDecoration: "none", fontSize: "12px" }} onClick={() => onDelete([item._id])}>Delete</Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center py-5 text-muted">No maritime ports found.</td></tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>
      {renderPagination()}
    </div>
  );
};

// Main Component
const PortCodeSea = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = () => { setEditingPort(null); setShowForm(true); };
  const handleEdit = (p) => { setEditingPort(p); setShowForm(true); };
  const handleSave = () => { setShowForm(false); setEditingPort(null); setRefresh((p) => p + 1); showAlert(editingPort ? "Port updated" : "Port created"); };
  const handleCancel = () => { setShowForm(false); setEditingPort(null); };

  const handleDelete = async (ids) => {
    if (window.confirm("Delete record?")) {
      try {
        await PortService.delete(ids[0]);
        showAlert("Record deleted");
        setRefresh((p) => p + 1);
      } catch (e) { showAlert(e.message, "danger"); }
    }
  };

  return (
    <div style={{ background: colors.background, minHeight: "100vh" }}>
      <Container className="py-4">
        {alert && <Alert variant={alert.type} dismissible onClose={() => setAlert(null)} className="shadow-sm border-0">{alert.message}</Alert>}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-900 mb-0" style={{ color: colors.textMain, letterSpacing: "-0.5px" }}>Maritime Port Master</h2>
            <p className="text-muted small mb-0">Manage global terminal and UNECE codes</p>
          </div>
          <Button onClick={showForm ? handleCancel : handleAddNew} style={customStyles.btnPrimary}>{showForm ? "View All Ports" : "+ Register Port"}</Button>
        </div>
        <div className="animate-fade-in">
          {showForm ? <PortForm portData={editingPort} onSave={handleSave} onCancel={handleCancel} /> : <PortList onEdit={handleEdit} onDelete={handleDelete} refresh={refresh} />}
        </div>
      </Container>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } } .page-link { color: ${colors.primary}; border: none; background: #fff; } .page-item.active .page-link { background: ${colors.primary} !important; color: #fff !important; }`}</style>
    </div>
  );
};

export default PortCodeSea;
