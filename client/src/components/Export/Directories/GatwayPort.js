import React, { useState, useCallback, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Table,
  Form,
  Card,
  Badge,
  Spinner,
} from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

const GatewayPortService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/gateway-ports`,

  getAll: async (params = {}) => {
    const res = await axios.get(`${GatewayPortService.baseURL}/`, { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await axios.get(`${GatewayPortService.baseURL}/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await axios.post(`${GatewayPortService.baseURL}/`, data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await axios.put(`${GatewayPortService.baseURL}/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${GatewayPortService.baseURL}/${id}`);
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await axios.delete(`${GatewayPortService.baseURL}/`, {
      data: { ids },
    });
    return res.data;
  },
};

// Form
const GatewayPortForm = ({ portData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    unece_code: "",
    port_type: "Sea",
    location: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (portData) {
      setFormData(portData);
    } else {
      setFormData({
        name: "",
        unece_code: "",
        port_type: "Sea",
        location: "",
        status: "Active",
      });
    }
  }, [portData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErr = {};
   
    setErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (portData?._id) {
        await GatewayPortService.update(portData._id, formData);
      } else {
        await GatewayPortService.create(formData);
      }
      onSave();
    } catch (err) {
      alert(err.message || "Error saving gateway port");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{portData ? "Edit Gateway Port" : "Add New Gateway Port"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>UNECE Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="unece_code"
                  value={formData.unece_code}
                  onChange={handleChange}
                  isInvalid={!!errors.unece_code}
                  placeholder="e.g., INCJA6"
                  style={{ textTransform: "uppercase" }}
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.unece_code}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2-10 character code (upper-case letters/numbers)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Port Type</Form.Label>
                <Form.Select
                  name="port_type"
                  value={formData.port_type}
                  onChange={handleChange}
                >
                  <option value="Sea">Sea</option>
                  <option value="Air">Air</option>
                  <option value="Rail">Rail</option>
                  <option value="Road">Road</option>
                  <option value="ICD">ICD</option>
                  <option value="CFS">CFS</option>
                  <option value="Terminal">Terminal</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Gateway Port Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  isInvalid={!!errors.name}
                  placeholder="Enter gateway port name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Location</Form.Label>
                <Form.Control
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City / State / Country"
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

// List
const GatewayPortList = ({ onEdit, onDelete, refresh }) => {
  const [ports, setPorts] = useState([]);
  const [filteredPorts, setFilteredPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ totalPages: 1, currentPage: 1 });
  const [filters, setFilters] = useState({ page: 1, status: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { fetchPorts(); }, [filters, refresh]);
  useEffect(() => { applySearch(); }, [searchTerm, ports]);

  const fetchPorts = async () => {
    try {
      setLoading(true);
      const res = await GatewayPortService.getAll({
        page: filters.page,
        status: filters.status,
        type: filters.type,
        search: "", // global search done client-side
      });
      const data = res.data || res;
      setPorts(data);
      setPagination(res.pagination || { totalPages: 1, currentPage: 1 });
    } catch (err) {
      console.error("Error fetching gateway ports:", err);
      setPorts([]);
      setPagination({ totalPages: 1, currentPage: 1 });
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchTerm.trim()) {
      setFilteredPorts(ports);
      return;
    }
    const s = searchTerm.toLowerCase();
    const filtered = ports.filter(p =>
      (p.unece_code && p.unece_code.toLowerCase().includes(s)) ||
      (p.name && p.name.toLowerCase().includes(s)) ||
      (p.location && p.location.toLowerCase().includes(s)) ||
      (p.port_type && p.port_type.toLowerCase().includes(s)) ||
      (p.status && p.status.toLowerCase().includes(s)) ||
      (p._id && p._id.toLowerCase().includes(s))
    );
    setFilteredPorts(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key === "page" ? value : 1 }));
  };

  const clearSearch = () => setSearchTerm("");

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div>
      <Row className="mb-3">
        <Col md={5}>
          <Form.Control
            type="text"
            placeholder="Search by UNECE, name, location, type, status..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Form.Text className="text-muted">
              Showing {filteredPorts.length} of {ports.length} gateway ports
            </Form.Text>
          )}
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.type}
            onChange={e => handleFilterChange("type", e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Sea">Sea</option>
            <option value="Air">Air</option>
            <option value="Rail">Rail</option>
            <option value="Road">Road</option>
            <option value="ICD">ICD</option>
            <option value="CFS">CFS</option>
            <option value="Terminal">Terminal</option>
          </Form.Select>
        </Col>
        <Col md={2}>
          <Form.Select
            value={filters.status}
            onChange={e => handleFilterChange("status", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </Form.Select>
        </Col>
        <Col md={2} className="text-center">
          <div className="border rounded p-2 bg-light">
            <div className="h6 mb-0 text-primary">{filteredPorts.length}</div>
            <div className="text-muted small">Total Gateway Ports</div>
          </div>
        </Col>
      </Row>

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>UNECE Code</th>
              <th>Name</th>
              <th>Port Type</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPorts.length ? (
              filteredPorts.map(item => (
                <tr key={item._id}>
                  <td className="font-monospace text-primary">
                    <strong>{item.unece_code}</strong>
                  </td>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.port_type}</td>
                  <td>{item.location}</td>
                  <td>
                    <Badge
                      bg={
                        item.status === "Active"
                          ? "success"
                          : item.status === "Suspended"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      className="me-2"
                      onClick={() => onEdit(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDelete([item._id])}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  <Alert variant="info">
                    {searchTerm ? (
                      <>
                        No gateway ports found matching "{searchTerm}".
                        <br />
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="mt-2"
                          onClick={clearSearch}
                        >
                          Clear Search
                        </Button>
                      </>
                    ) : (
                      "No gateway ports found."
                    )}
                  </Alert>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {!searchTerm && pagination.totalPages > 1 && (
        <nav>
          <ul className="pagination justify-content-center">
            <li className={`page-item ${pagination.currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => handleFilterChange("page", pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <li
                key={page}
                className={`page-item ${pagination.currentPage === page ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => handleFilterChange("page", page)}
                >
                  {page}
                </button>
              </li>
            ))}
            <li
              className={`page-item ${
                pagination.currentPage === pagination.totalPages ? "disabled" : ""
              }`}
            >
              <button
                className="page-link"
                onClick={() => handleFilterChange("page", pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
};

// Main wrapper
const GatewayPortDirectory = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingPort(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback(port => {
    setEditingPort(port);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (window.confirm("Delete this gateway port?")) {
            await GatewayPortService.delete(ids[0]);
            showAlert("Gateway port deleted successfully");
            setRefresh(p => p + 1);
          }
        } else {
          await GatewayPortService.bulkDelete(ids);
          showAlert(`${ids.length} gateway ports deleted successfully`);
          setRefresh(p => p + 1);
        }
      } catch (err) {
        showAlert(err.message || "Error deleting gateway port", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingPort(null);
    setRefresh(p => p + 1);
    showAlert(
      editingPort
        ? "Gateway port updated successfully"
        : "Gateway port created successfully"
    );
  }, [editingPort, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingPort(null);
  }, []);

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          {alert && (
            <Alert
              variant={alert.type}
              dismissible
              onClose={() => setAlert(null)}
              className="mb-4"
            >
              {alert.message}
            </Alert>
          )}

          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Gateway Port Directory</h1>
            <div>
              {showForm && (
                <Button
                  variant="outline-secondary"
                  className="me-2"
                  onClick={handleCancel}
                >
                  Back to List
                </Button>
              )}
              <Button variant="success" onClick={handleAddNew}>
                Add New Gateway Port
              </Button>
            </div>
          </div>

          {showForm ? (
            <GatewayPortForm
              portData={editingPort}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <GatewayPortList
              onEdit={handleEdit}
              onDelete={handleDelete}
              refresh={refresh}
            />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default GatewayPortDirectory;
