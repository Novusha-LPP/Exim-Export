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
const ShippingLineService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/shippingLines`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${ShippingLineService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${ShippingLineService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(
        `${ShippingLineService.baseURL}/`,
        data
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(
        `${ShippingLineService.baseURL}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(
        `${ShippingLineService.baseURL}/${id}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const ShippingLineForm = ({ shippingLineData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    shippingLineCode: "",
    shippingName: "",
    location: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (shippingLineData) {
      setFormData(shippingLineData);
    } else {
      setFormData({
        shippingLineCode: "",
        shippingName: "",
        location: "",
        status: "Active",
      });
    }
  }, [shippingLineData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "shippingLineCode" ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.shippingLineCode?.trim()) {
      newErrors.shippingLineCode = "Shipping Line Code is required";
    } else if (!/^[A-Z0-9]{2,10}$/.test(formData.shippingLineCode)) {
      newErrors.shippingLineCode =
        "Code must be 2-10 uppercase alphanumeric characters";
    }

    if (!formData.shippingName?.trim()) {
      newErrors.shippingName = "Shipping Name is required";
    }

    if (!formData.location?.trim()) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (shippingLineData?._id) {
        await ShippingLineService.update(shippingLineData._id, formData);
      } else {
        await ShippingLineService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving shipping line");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>
          {shippingLineData ? "Edit Shipping Line" : "Add New Shipping Line"}
        </h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Shipping Line Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="shippingLineCode"
                  value={formData.shippingLineCode}
                  onChange={handleChange}
                  isInvalid={!!errors.shippingLineCode}
                  placeholder="e.g., MSK, COSCO"
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.shippingLineCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2-10 character code (e.g., MSK, COSCO)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Shipping Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="shippingName"
                  value={formData.shippingName}
                  onChange={handleChange}
                  isInvalid={!!errors.shippingName}
                  placeholder="Enter shipping line name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.shippingName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={3}>
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
                <Form.Label>Location *</Form.Label>
                <Form.Control
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  isInvalid={!!errors.location}
                  placeholder="Enter headquarters/main location"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.location}
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
// List Component
const ShippingLineList = ({ onEdit, onDelete, refresh }) => {
  const [shippingLines, setShippingLines] = useState([]);
  const [filteredShippingLines, setFilteredShippingLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    location: "",
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all shipping lines
  useEffect(() => {
    fetchShippingLines();
  }, [filters, refresh]);

  // Filter shipping lines whenever searchTerm or shippingLines change
  useEffect(() => {
    filterShippingLines();
  }, [searchTerm, shippingLines]);

  const fetchShippingLines = async () => {
    try {
      setLoading(true);
      const response = await ShippingLineService.getAll(filters);
      const shippingLinesData = response.data || response;
      setShippingLines(shippingLinesData);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      setShippingLines([]);
    } finally {
      setLoading(false);
    }
  };

  const filterShippingLines = () => {
    if (!searchTerm.trim()) {
      setFilteredShippingLines(shippingLines);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = shippingLines.filter(
      (shippingLine) =>
        (shippingLine.shippingLineCode &&
          shippingLine.shippingLineCode.toLowerCase().includes(searchLower)) ||
        (shippingLine.shippingName &&
          shippingLine.shippingName.toLowerCase().includes(searchLower)) ||
        (shippingLine.location &&
          shippingLine.location.toLowerCase().includes(searchLower)) ||
        (shippingLine.status &&
          shippingLine.status.toLowerCase().includes(searchLower)) ||
        (shippingLine._id &&
          shippingLine._id.toLowerCase().includes(searchLower))
    );
    setFilteredShippingLines(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
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
      {/* Filters - Enhanced with global search */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Search by code, name, location, or status..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <Form.Text className="text-muted">
              Showing {filteredShippingLines.length} of {shippingLines.length}{" "}
              shipping lines
              {searchTerm && ` matching "${searchTerm}"`}
            </Form.Text>
          )}
        </Col>
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Filter by location"
            value={filters.location}
            onChange={(e) => handleFilterChange("location", e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Results Counter */}
      <Row className="mb-3">
        <Col md={4}>
          <div className="border rounded p-2 bg-light">
            <div className="h6 mb-0 text-primary">
              {filteredShippingLines.length}
            </div>
            <div className="text-muted small">Total Shipping Lines</div>
          </div>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: "150px" }}>Shipping Line Code</th>
              <th>Shipping Name</th>
              <th style={{ width: "200px" }}>Location</th>
              <th style={{ width: "100px" }}>Status</th>
              <th style={{ width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShippingLines.length > 0 ? (
              filteredShippingLines.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span className="font-monospace text-primary">
                      <strong>{item.shippingLineCode}</strong>
                    </span>
                  </td>
                  <td>
                    <strong>{item.shippingName}</strong>
                  </td>
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
                <td colSpan="5" className="text-center py-4">
                  <Alert variant="info" className="text-center">
                    {searchTerm ? (
                      <>
                        No shipping lines found matching "{searchTerm}".
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
                      "No shipping lines found."
                    )}
                  </Alert>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Pagination - Only show if not searching */}
      {!searchTerm && pagination.totalPages > 1 && (
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
const ShippingLine = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingShippingLine, setEditingShippingLine] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingShippingLine(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((shippingLine) => {
    setEditingShippingLine(shippingLine);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm(
              "Are you sure you want to delete this shipping line?"
            )
          ) {
            await ShippingLineService.delete(ids[0]);
            showAlert("Shipping Line deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting shipping line", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingShippingLine(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingShippingLine
        ? "Shipping Line updated successfully"
        : "Shipping Line created successfully"
    );
  }, [editingShippingLine, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingShippingLine(null);
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
            <h1 className="mb-0">Shipping Line Directory</h1>
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
                Add New Shipping Line
              </Button>
            </div>
          </div>

          {showForm ? (
            <ShippingLineForm
              shippingLineData={editingShippingLine}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <ShippingLineList
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

export default ShippingLine;
