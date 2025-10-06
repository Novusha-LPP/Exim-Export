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

// API Service
const TariffHeadService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/tariffHeads`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${TariffHeadService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${TariffHeadService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${TariffHeadService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(
        `${TariffHeadService.baseURL}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${TariffHeadService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const TariffHeadForm = ({ tariffHeadData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    tariffHead: "",
    description: "",
    uqc: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Common UQC options
  const uqcOptions = [
    "NOS",
    "KGS",
    "PCS",
    "LTR",
    "MTR",
    "SQM",
    "CBM",
    "PAI",
    "SET",
    "DOZ",
    "GRS",
    "BAG",
    "BOX",
    "BTL",
    "CAN",
    "CTN",
    "PKT",
    "ROL",
    "SHT",
    "TUB",
  ];

  useEffect(() => {
    if (tariffHeadData) {
      setFormData(tariffHeadData);
    } else {
      setFormData({
        tariffHead: "",
        description: "",
        uqc: "",
        status: "Active",
      });
    }
  }, [tariffHeadData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "uqc" ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.tariffHead?.trim()) {
      newErrors.tariffHead = "Tariff Head is required";
    } else if (!/^\d{4,8}(\.\d{2})?$/.test(formData.tariffHead)) {
      newErrors.tariffHead = "Invalid format (e.g., 8708.80, 84821000)";
    }

    if (!formData.description?.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.uqc?.trim()) {
      newErrors.uqc = "UQC is required";
    } else if (!/^[A-Z]{2,10}$/.test(formData.uqc)) {
      newErrors.uqc = "UQC must be 2-10 uppercase letters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (tariffHeadData?._id) {
        await TariffHeadService.update(tariffHeadData._id, formData);
      } else {
        await TariffHeadService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving tariff head");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{tariffHeadData ? "Edit Tariff Head" : "Add New Tariff Head"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Tariff Head *</Form.Label>
                <Form.Control
                  type="text"
                  name="tariffHead"
                  value={formData.tariffHead}
                  onChange={handleChange}
                  isInvalid={!!errors.tariffHead}
                  placeholder="e.g., 8708.80"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.tariffHead}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  8-digit code (e.g., 8708.80, 84821000)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>UQC *</Form.Label>
                <Form.Select
                  name="uqc"
                  value={formData.uqc}
                  onChange={handleChange}
                  isInvalid={!!errors.uqc}
                >
                  <option value="">Select UQC</option>
                  {uqcOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.uqc}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Obsolete">Obsolete</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Description of Tariff *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  isInvalid={!!errors.description}
                  placeholder="Enter detailed description of the tariff"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.description}
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
const TariffHeadList = ({ onEdit, onDelete, refresh }) => {
  const [tariffHeads, setTariffHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    uqc: "",
    status: "",
  });

  useEffect(() => {
    fetchTariffHeads();
  }, [filters, refresh]);

  const fetchTariffHeads = async () => {
    try {
      setLoading(true);
      const response = await TariffHeadService.getAll(filters);
      setTariffHeads(response.data || response);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      setTariffHeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const truncateDescription = (text, maxLength = 100) => {
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
      {/* Filters */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by tariff head or description..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.uqc}
            onChange={(e) => handleFilterChange("uqc", e.target.value)}
          >
            <option value="">All UQC</option>
            <option value="NOS">NOS</option>
            <option value="KGS">KGS</option>
            <option value="PCS">PCS</option>
            <option value="LTR">LTR</option>
            <option value="MTR">MTR</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Obsolete">Obsolete</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: "120px" }}>Tariff Head</th>
              <th>Description</th>
              <th style={{ width: "80px" }}>UQC</th>
              <th style={{ width: "100px" }}>Status</th>
              <th style={{ width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tariffHeads.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="font-monospace text-primary">
                    <strong>{item.tariffHead}</strong>
                  </span>
                </td>
                <td>
                  <div title={item.description}>
                    {truncateDescription(item.description)}
                  </div>
                </td>
                <td>
                  <Badge bg="info" className="font-monospace">
                    {item.uqc}
                  </Badge>
                </td>
                <td>
                  <Badge
                    bg={
                      item.status === "Active"
                        ? "success"
                        : item.status === "Obsolete"
                        ? "danger"
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
            ))}
          </tbody>
        </Table>
      </div>

      {tariffHeads.length === 0 && (
        <Alert variant="info" className="text-center">
          No tariff heads found.
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
const TarrifHead = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingTariffHead, setEditingTariffHead] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingTariffHead(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((tariffHead) => {
    setEditingTariffHead(tariffHead);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm("Are you sure you want to delete this tariff head?")
          ) {
            await TariffHeadService.delete(ids[0]);
            showAlert("Tariff Head deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting tariff head", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingTariffHead(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingTariffHead
        ? "Tariff Head updated successfully"
        : "Tariff Head created successfully"
    );
  }, [editingTariffHead, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingTariffHead(null);
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
            <h1 className="mb-0">Tariff Head Directory</h1>
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
                Add New Tariff Head
              </Button>
            </div>
          </div>

          {showForm ? (
            <TariffHeadForm
              tariffHeadData={editingTariffHead}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <TariffHeadList
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

export default TarrifHead;
