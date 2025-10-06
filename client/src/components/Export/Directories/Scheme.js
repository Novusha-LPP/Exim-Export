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
const SchemeService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/schemes`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${SchemeService.baseURL}/`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${SchemeService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${SchemeService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`${SchemeService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${SchemeService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const SchemeForm = ({ schemeData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    schemeCode: "",
    schemeDescription: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (schemeData) {
      setFormData(schemeData);
    } else {
      setFormData({
        schemeCode: "",
        schemeDescription: "",
      });
    }
  }, [schemeData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "schemeCode" ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.schemeCode?.trim()) {
      newErrors.schemeCode = "Scheme Code is required";
    } else if (!/^[A-Z0-9]{1,10}$/.test(formData.schemeCode)) {
      newErrors.schemeCode =
        "Code must be 1-10 uppercase alphanumeric characters";
    }

    if (!formData.schemeDescription?.trim()) {
      newErrors.schemeDescription = "Scheme Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (schemeData?._id) {
        await SchemeService.update(schemeData._id, formData);
      } else {
        await SchemeService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving scheme");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{schemeData ? "Edit Scheme" : "Add New Scheme"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Scheme Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="schemeCode"
                  value={formData.schemeCode}
                  onChange={handleChange}
                  isInvalid={!!errors.schemeCode}
                  placeholder="e.g., 01, RD, EPCG"
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.schemeCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  1-10 character alphanumeric code
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={9}>
              <Form.Group className="mb-3">
                <Form.Label>Scheme Description *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="schemeDescription"
                  value={formData.schemeDescription}
                  onChange={handleChange}
                  isInvalid={!!errors.schemeDescription}
                  placeholder="Enter detailed description of the scheme"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.schemeDescription}
                </Form.Control.Feedback>
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
const SchemeList = ({ onEdit, onDelete, refresh }) => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
  });

  useEffect(() => {
    fetchSchemes();
  }, [filters, refresh]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const response = await SchemeService.getAll(filters);
      setSchemes(response.data || response);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const truncateDescription = (text, maxLength = 150) => {
    return text && text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by scheme code or description..."
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
              <th style={{ width: "150px" }}>Scheme Code</th>
              <th>Scheme Description</th>
              <th style={{ width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {schemes.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="font-monospace text-primary">
                    <strong>{item.schemeCode}</strong>
                  </span>
                </td>
                <td>
                  <div title={item.schemeDescription}>
                    {truncateDescription(item.schemeDescription)}
                  </div>
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

      {schemes.length === 0 && (
        <Alert variant="info" className="text-center">
          No schemes found.
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
const Scheme = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingScheme(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((scheme) => {
    setEditingScheme(scheme);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (window.confirm("Are you sure you want to delete this scheme?")) {
            await SchemeService.delete(ids[0]);
            showAlert("Scheme deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting scheme", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingScheme(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingScheme
        ? "Scheme updated successfully"
        : "Scheme created successfully"
    );
  }, [editingScheme, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingScheme(null);
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
            <h1 className="mb-0">Scheme Code</h1>
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
                Add New Scheme
              </Button>
            </div>
          </div>

          {showForm ? (
            <SchemeForm
              schemeData={editingScheme}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <SchemeList
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

export default Scheme;
