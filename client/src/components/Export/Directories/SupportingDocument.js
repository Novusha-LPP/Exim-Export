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
  Spinner,
} from "react-bootstrap";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

// API Service
const DocCodeService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/supportingDocumentCodes`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${DocCodeService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  getById: async (id) => {
    try {
      const response = await axios.get(`${DocCodeService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  create: async (data) => {
    try {
      const response = await axios.post(`${DocCodeService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  update: async (id, data) => {
    try {
      const response = await axios.put(`${DocCodeService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  delete: async (id) => {
    try {
      const response = await axios.delete(`${DocCodeService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const DocCodeForm = ({ docCodeData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (docCodeData) {
      setFormData(docCodeData);
    } else {
      setFormData({ code: "", name: "", description: "" });
    }
  }, [docCodeData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.code?.trim()) newErrors.code = "Code is required";
    else if (!/^[A-Z0-9_-]{1,20}$/.test(formData.code))
      newErrors.code = "1-20 uppercase letters, numbers, hyphens, underscores";
    if (!formData.name?.trim()) newErrors.name = "Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (docCodeData?._id)
        await DocCodeService.update(docCodeData._id, formData);
      else await DocCodeService.create(formData);
      onSave();
    } catch (error) {
      alert(error.message || "Error saving code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>
          {docCodeData
            ? "Edit Supporting Document Code"
            : "Add New Supporting Document Code"}
        </h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  isInvalid={!!errors.code}
                  placeholder="e.g. INV123, DOC01"
                  maxLength={20}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.code}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  isInvalid={!!errors.name}
                  placeholder="Document name"
                  maxLength={200}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={5}>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  maxLength={1000}
                  placeholder="Optional document description"
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

// List Component
const DocCodeList = ({ onEdit, onDelete, refresh }) => {
  const [docCodes, setDocCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ page: 1, search: "" });

  useEffect(() => {
    fetchDocCodes();
  }, [filters, refresh]);

  const fetchDocCodes = async () => {
    try {
      setLoading(true);
      const response = await DocCodeService.getAll(filters);
      setDocCodes(response.data || response);
      setPagination(response.pagination || {});
    } catch (error) {
      setDocCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  if (loading)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );

  return (
    <div>
      {/* Filters */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by code, name or description..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
      </Row>
      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: "140px" }}>Code</th>
              <th>Name</th>
              <th>Description</th>
              <th style={{ width: "160px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docCodes.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="font-monospace text-primary">
                    <strong>{item.code}</strong>
                  </span>
                </td>
                <td>{item.name}</td>
                <td>
                  <span title={item.description}>
                    {item.description || "-"}
                  </span>
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
            ))}
          </tbody>
        </Table>
      </div>
      {docCodes.length === 0 && (
        <Alert variant="info" className="text-center">
          No codes found.
        </Alert>
      )}
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <nav>
          <ul className="pagination justify-content-center">
            <li
              className={`page-item ${
                pagination.currentPage === 1 ? "disabled" : ""
              }`}
            >
              <button
                className="page-link"
                onClick={() =>
                  handleFilterChange("page", pagination.currentPage - 1)
                }
                disabled={pagination.currentPage === 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <li
                  key={page}
                  className={`page-item ${
                    pagination.currentPage === page ? "active" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => handleFilterChange("page", page)}
                  >
                    {page}
                  </button>
                </li>
              )
            )}
            <li
              className={`page-item ${
                pagination.currentPage === pagination.totalPages
                  ? "disabled"
                  : ""
              }`}
            >
              <button
                className="page-link"
                onClick={() =>
                  handleFilterChange("page", pagination.currentPage + 1)
                }
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

// Main Component
const SupportingDocument = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingDocCode, setEditingDocCode] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingDocCode(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((doc) => {
    setEditingDocCode(doc);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (window.confirm("Are you sure you want to delete this code?")) {
            await DocCodeService.delete(ids[0]);
            showAlert("Code deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting code", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingDocCode(null);
    setRefresh((prev) => prev + 1);
    showAlert(editingDocCode ? "Updated successfully" : "Created successfully");
  }, [editingDocCode, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingDocCode(null);
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
            <h1 className="mb-0">Supporting Document Code Directory</h1>
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
                Add New Code
              </Button>
            </div>
          </div>
          {showForm ? (
            <DocCodeForm
              docCodeData={editingDocCode}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <DocCodeList
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

export default SupportingDocument;
