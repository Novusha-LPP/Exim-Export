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
const AirlineService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/airlines`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${AirlineService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${AirlineService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${AirlineService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`${AirlineService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${AirlineService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await axios.delete(`${AirlineService.baseURL}/`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
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
    if (airlineData) {
      setFormData(airlineData);
    } else {
      setFormData({
        alphanumericCode: "",
        numericCode: "",
        airlineName: "",
        status: "Active",
      });
    }
  }, [airlineData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.alphanumericCode?.trim()) {
      newErrors.alphanumericCode = "Alphanumeric Code is required";
    } else if (!/^[A-Z0-9]{2,10}$/.test(formData.alphanumericCode)) {
      newErrors.alphanumericCode =
        "Invalid format (2-10 uppercase letters/numbers)";
    }

    if (!formData.numericCode?.trim()) {
      newErrors.numericCode = "Numeric Code is required";
    } else if (!/^\d{1,10}$/.test(formData.numericCode)) {
      newErrors.numericCode = "Must be numeric (1-10 digits)";
    }

    if (!formData.airlineName?.trim()) {
      newErrors.airlineName = "Airline Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (airlineData?._id) {
        await AirlineService.update(airlineData._id, formData);
      } else {
        await AirlineService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving airline code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{airlineData ? "Edit Airline Code" : "Add New Airline Code"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Alphanumeric Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="alphanumericCode"
                  value={formData.alphanumericCode}
                  onChange={handleChange}
                  isInvalid={!!errors.alphanumericCode}
                  placeholder="e.g., AI, 6E"
                  style={{ textTransform: "uppercase" }}
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.alphanumericCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2-10 character airline code (e.g., AI, 6E)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Numeric Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="numericCode"
                  value={formData.numericCode}
                  onChange={handleChange}
                  isInvalid={!!errors.numericCode}
                  placeholder="e.g., 098, 323"
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.numericCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Numeric airline code (1-10 digits)
                </Form.Text>
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
                <Form.Label>Airline Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="airlineName"
                  value={formData.airlineName}
                  onChange={handleChange}
                  isInvalid={!!errors.airlineName}
                  placeholder="Enter airline name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.airlineName}
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
const AirlineCodeList = ({ onEdit, onDelete, refresh }) => {
  const [airlines, setAirlines] = useState([]);
  const [filteredAirlines, setFilteredAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all airlines
  useEffect(() => {
    fetchAirlines();
  }, [filters, refresh]);

  // Filter airlines whenever searchTerm or airlines change
  useEffect(() => {
    filterAirlines();
  }, [searchTerm, airlines]);

  const fetchAirlines = async () => {
    try {
      setLoading(true);
      const response = await AirlineService.getAll(filters);
      const airlinesData = response.data || response;
      setAirlines(airlinesData);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      setAirlines([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAirlines = () => {
    if (!searchTerm.trim()) {
      setFilteredAirlines(airlines);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = airlines.filter(
      (airline) =>
        (airline.alphanumericCode &&
          airline.alphanumericCode.toLowerCase().includes(searchLower)) ||
        (airline.numericCode &&
          airline.numericCode.toLowerCase().includes(searchLower)) ||
        (airline.airlineName &&
          airline.airlineName.toLowerCase().includes(searchLower)) ||
        (airline.status &&
          airline.status.toLowerCase().includes(searchLower)) ||
        (airline._id && airline._id.toLowerCase().includes(searchLower))
    );
    setFilteredAirlines(filtered);
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
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by code, airline name, or status..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <Form.Text className="text-muted">
              Showing {filteredAirlines.length} of {airlines.length} airlines
              {searchTerm && ` matching "${searchTerm}"`}
            </Form.Text>
          )}
        </Col>
        <Col md={3}>
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
        <Col md={3} className="text-center">
          <div className="border rounded p-2 bg-light">
            <div className="h6 mb-0 text-primary">
              {filteredAirlines.length}
            </div>
            <div className="text-muted small">Total Airlines</div>
          </div>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Alphanumeric Code</th>
              <th>Numeric Code</th>
              <th>Airline Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAirlines.length > 0 ? (
              filteredAirlines.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span className="font-monospace text-primary">
                      <strong>{item.alphanumericCode}</strong>
                    </span>
                  </td>
                  <td>
                    <span className="font-monospace">{item.numericCode}</span>
                  </td>
                  <td>
                    <strong>{item.airlineName}</strong>
                  </td>
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
                        No airline codes found matching "{searchTerm}".
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
                      "No airline codes found."
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
const AirlineCodeDirectory = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingAirline, setEditingAirline] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingAirline(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((airline) => {
    setEditingAirline(airline);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm("Are you sure you want to delete this airline code?")
          ) {
            await AirlineService.delete(ids[0]);
            showAlert("Airline code deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        } else {
          await AirlineService.bulkDelete(ids);
          showAlert(`${ids.length} airline codes deleted successfully`);
          setRefresh((prev) => prev + 1);
        }
      } catch (error) {
        showAlert(error.message || "Error deleting airline code", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingAirline(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingAirline
        ? "Airline code updated successfully"
        : "Airline code created successfully"
    );
  }, [editingAirline, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingAirline(null);
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
            <h1 className="mb-0">Airline Code Directory</h1>
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
                Add New Airline Code
              </Button>
            </div>
          </div>

          {showForm ? (
            <AirlineForm
              airlineData={editingAirline}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <AirlineCodeList
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

export default AirlineCodeDirectory;
