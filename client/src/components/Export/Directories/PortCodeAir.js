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
const AirPortService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/airPorts`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${AirPortService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${AirPortService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${AirPortService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`${AirPortService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${AirPortService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const AirPortForm = ({ airPortData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    portCode: "",
    portName: "",
    portDetails: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (airPortData) {
      setFormData(airPortData);
    } else {
      setFormData({
        portCode: "",
        portName: "",
        portDetails: "",
      });
    }
  }, [airPortData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "portCode" ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.portCode?.trim()) {
      newErrors.portCode = "Port Code is required";
    } else if (!/^[A-Z0-9]{2,10}$/.test(formData.portCode)) {
      newErrors.portCode =
        "Code must be 2-10 uppercase alphanumeric characters";
    }

    if (!formData.portName?.trim()) {
      newErrors.portName = "Port Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (airPortData?._id) {
        await AirPortService.update(airPortData._id, formData);
      } else {
        await AirPortService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving air port");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{airPortData ? "Edit Air Port" : "Add New Air Port"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Port Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="portCode"
                  value={formData.portCode}
                  onChange={handleChange}
                  isInvalid={!!errors.portCode}
                  placeholder="e.g., DEL, BOM, MAA"
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.portCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2-10 character airport code
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={9}>
              <Form.Group className="mb-3">
                <Form.Label>Port Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="portName"
                  value={formData.portName}
                  onChange={handleChange}
                  isInvalid={!!errors.portName}
                  placeholder="Enter airport name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.portName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Port Details</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="portDetails"
                  value={formData.portDetails}
                  onChange={handleChange}
                  placeholder="Enter airport details, facilities, services, etc."
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
const AirPortList = ({ onEdit, onDelete, refresh }) => {
  const [airPorts, setAirPorts] = useState([]);
  const [filteredAirPorts, setFilteredAirPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAirPorts();
  }, [filters, refresh]);

  useEffect(() => {
    filterAirPorts();
  }, [searchTerm, airPorts]);

  const fetchAirPorts = async () => {
    try {
      setLoading(true);
      const response = await AirPortService.getAll(filters);
      const airPortsData = response.data || response;
      setAirPorts(airPortsData);
      setFilteredAirPorts(airPortsData);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      setAirPorts([]);
      setFilteredAirPorts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAirPorts = () => {
    if (!searchTerm.trim()) {
      setFilteredAirPorts(airPorts);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = airPorts.filter(
      (airPort) =>
        (airPort.portCode &&
          airPort.portCode.toLowerCase().includes(searchLower)) ||
        (airPort.portName &&
          airPort.portName.toLowerCase().includes(searchLower)) ||
        (airPort.portDetails &&
          airPort.portDetails.toLowerCase().includes(searchLower)) ||
        (airPort._id && airPort._id.toLowerCase().includes(searchLower))
    );
    setFilteredAirPorts(filtered);
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

  const truncateDetails = (text, maxLength = 150) => {
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
            placeholder="Search by port code, name, or details..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <Form.Text className="text-muted">
              Showing {filteredAirPorts.length} of {airPorts.length} air ports
              {searchTerm && ` matching "${searchTerm}"`}
            </Form.Text>
          )}
        </Col>
      </Row>

      {/* Results Counter */}
      <Row className="mb-3">
        <Col md={6}>
          <div className="border rounded p-2 bg-light">
            <div className="h6 mb-0 text-primary">
              {filteredAirPorts.length}
            </div>
            <div className="text-muted small">Total Air Ports</div>
          </div>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: "120px" }}>Port Code</th>
              <th style={{ width: "250px" }}>Port Name</th>
              <th>Port Details</th>
              <th style={{ width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAirPorts.length > 0 ? (
              filteredAirPorts.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span className="font-monospace text-primary">
                      <strong>{item.portCode}</strong>
                    </span>
                  </td>
                  <td>
                    <strong>{item.portName}</strong>
                  </td>
                  <td>
                    <div title={item.portDetails}>
                      {truncateDetails(item.portDetails) || "-"}
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
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  <Alert variant="info" className="text-center">
                    {searchTerm ? (
                      <>
                        No air ports found matching "{searchTerm}".
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
                      "No air ports found."
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
            {(() => {
              const total = pagination.totalPages;
              const current = pagination.currentPage;
              const delta = 2;
              let pages = [];

              // Always show first page
              pages.push(1);

              // Add dots if needed before window
              if (current - delta > 2) {
                pages.push("...");
              }

              // Add window around current
              for (
                let i = Math.max(2, current - delta);
                i <= Math.min(total - 1, current + delta);
                i++
              ) {
                pages.push(i);
              }

              // Add dots if needed after window
              if (current + delta < total - 1) {
                pages.push("...");
              }

              // Always show last page if > 1
              if (total > 1) {
                pages.push(total);
              }

              return pages.map((page, index) => (
                <li
                  key={index}
                  className={`page-item ${page === current ? "active" : ""} ${
                    page === "..." ? "disabled" : ""
                  }`}
                >
                  {page === "..." ? (
                    <span className="page-link">...</span>
                  ) : (
                    <button
                      className="page-link"
                      onClick={() => handleFilterChange("page", page)}
                    >
                      {page}
                    </button>
                  )}
                </li>
              ));
            })()}
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
const PortCodeAir = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingAirPort, setEditingAirPort] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingAirPort(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((airPort) => {
    setEditingAirPort(airPort);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm("Are you sure you want to delete this air port?")
          ) {
            await AirPortService.delete(ids[0]);
            showAlert("Air Port deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting air port", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingAirPort(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingAirPort
        ? "Air Port updated successfully"
        : "Air Port created successfully"
    );
  }, [editingAirPort, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingAirPort(null);
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
            <h1 className="mb-0">Port Code-Air Directory</h1>
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
                Add New Air Port
              </Button>
            </div>
          </div>

          {showForm ? (
            <AirPortForm
              airPortData={editingAirPort}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <AirPortList
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

export default PortCodeAir;
