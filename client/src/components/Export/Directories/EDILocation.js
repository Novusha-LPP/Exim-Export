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
const EDILocationService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/ediLocations`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${EDILocationService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${EDILocationService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${EDILocationService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(
        `${EDILocationService.baseURL}/${id}`,
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
        `${EDILocationService.baseURL}/${id}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component with Custom Category Support
const EDILocationForm = ({ ediLocationData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    locationCode: "",
    category: "",
    locationName: "",
    ediOnlineDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Predefined category options
  const predefinedCategories = [
    "Seaport",
    "Airport",
    "Inland Container Depot",
    "Border Crossing",
    "Warehouse",
    "Container Freight Station",
    "Railway Station",
    "Road Transport Hub",
    "Manufacturing Hub",
    "Free Trade Zone",
    "Dry Port",
    "Logistics Park",
  ];

  useEffect(() => {
    if (ediLocationData) {
      setFormData({
        ...ediLocationData,
        ediOnlineDate: ediLocationData.ediOnlineDate
          ? new Date(ediLocationData.ediOnlineDate).toISOString().split("T")[0]
          : "",
      });
      // Check if category is custom (not in predefined list)
      setShowCustomCategory(
        !predefinedCategories.includes(ediLocationData.category)
      );
    } else {
      setFormData({
        locationCode: "",
        category: "",
        locationName: "",
        ediOnlineDate: "",
      });
      setShowCustomCategory(false);
    }
  }, [ediLocationData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "locationCode" ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCategorySelect = (e) => {
    const value = e.target.value;
    if (value === "CUSTOM") {
      setShowCustomCategory(true);
      setFormData((prev) => ({ ...prev, category: "" }));
    } else {
      setShowCustomCategory(false);
      setFormData((prev) => ({ ...prev, category: value }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.locationCode?.trim()) {
      newErrors.locationCode = "Location Code is required";
    } else if (!/^[A-Z0-9]{2,10}$/.test(formData.locationCode)) {
      newErrors.locationCode =
        "Code must be 2-10 uppercase alphanumeric characters";
    }

    if (!formData.category?.trim()) {
      newErrors.category = "Category is required";
    }

    if (!formData.locationName?.trim()) {
      newErrors.locationName = "Location Name is required";
    }

    if (!formData.ediOnlineDate?.trim()) {
      newErrors.ediOnlineDate = "EDI Online Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        ediOnlineDate: new Date(formData.ediOnlineDate),
      };

      if (ediLocationData?._id) {
        await EDILocationService.update(ediLocationData._id, submitData);
      } else {
        await EDILocationService.create(submitData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving EDI location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>
          {ediLocationData ? "Edit EDI Location" : "Add New EDI Location"}
        </h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Location Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="locationCode"
                  value={formData.locationCode}
                  onChange={handleChange}
                  isInvalid={!!errors.locationCode}
                  placeholder="e.g., INMAA, DEHAM"
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.locationCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2-10 character location code
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Category *</Form.Label>
                {!showCustomCategory ? (
                  <Form.Select
                    value={formData.category}
                    onChange={handleCategorySelect}
                    isInvalid={!!errors.category}
                  >
                    <option value="">Select Category</option>
                    {predefinedCategories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    <option value="CUSTOM">🔧 Add Custom Category</option>
                  </Form.Select>
                ) : (
                  <div>
                    <Form.Control
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      isInvalid={!!errors.category}
                      placeholder="Enter custom category"
                      maxLength={100}
                    />
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 mt-1"
                      onClick={() => {
                        setShowCustomCategory(false);
                        setFormData((prev) => ({ ...prev, category: "" }));
                      }}
                    >
                      ← Back to predefined categories
                    </Button>
                  </div>
                )}
                <Form.Control.Feedback type="invalid">
                  {errors.category}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>EDI Online Date *</Form.Label>
                <Form.Control
                  type="date"
                  name="ediOnlineDate"
                  value={formData.ediOnlineDate}
                  onChange={handleChange}
                  isInvalid={!!errors.ediOnlineDate}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.ediOnlineDate}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Location Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="locationName"
                  value={formData.locationName}
                  onChange={handleChange}
                  isInvalid={!!errors.locationName}
                  placeholder="Enter full location name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.locationName}
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

// List Component with Dynamic Category Filter
const EDILocationList = ({ onEdit, onDelete, refresh }) => {
  const [ediLocations, setEdiLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [availableCategories, setAvailableCategories] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    category: "",
  });

  useEffect(() => {
    fetchEDILocations();
  }, [filters, refresh]);

  const fetchEDILocations = async () => {
    try {
      setLoading(true);
      const response = await EDILocationService.getAll(filters);
      setEdiLocations(response.data || response);
      setPagination(response.pagination || {});

      // Extract unique categories from the data for dynamic filtering
      const categories = [
        ...new Set((response.data || []).map((item) => item.category)),
      ].sort();
      setAvailableCategories(categories);
    } catch (error) {
      console.error("Error fetching data:", error);
      setEdiLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      Seaport: "primary",
      Airport: "info",
      "Inland Container Depot": "success",
      "Border Crossing": "warning",
      Warehouse: "secondary",
      "Container Freight Station": "dark",
      "Railway Station": "danger",
      "Road Transport Hub": "info",
      "Manufacturing Hub": "success",
      "Free Trade Zone": "warning",
      "Dry Port": "primary",
      "Logistics Park": "info",
    };
    return colors[category] || "secondary";
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
      {/* Dynamic Filters */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by location code or name..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
        <Col md={6}>
          <Form.Select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
          >
            <option value="">All Categories</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: "120px" }}>Location Code</th>
              <th style={{ width: "200px" }}>Category</th>
              <th>Location Name</th>
              <th style={{ width: "140px" }}>EDI Online Date</th>
              <th style={{ width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ediLocations.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="font-monospace text-primary">
                    <strong>{item.locationCode}</strong>
                  </span>
                </td>
                <td>
                  <Badge bg={getCategoryColor(item.category)}>
                    {item.category}
                  </Badge>
                </td>
                <td>
                  <strong>{item.locationName}</strong>
                </td>
                <td>
                  <span className="font-monospace">
                    {formatDate(item.ediOnlineDate)}
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

      {ediLocations.length === 0 && (
        <Alert variant="info" className="text-center">
          No EDI locations found.
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
const EDILocation = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingEDILocation, setEditingEDILocation] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingEDILocation(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((ediLocation) => {
    setEditingEDILocation(ediLocation);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm("Are you sure you want to delete this EDI location?")
          ) {
            await EDILocationService.delete(ids[0]);
            showAlert("EDI Location deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting EDI location", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingEDILocation(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingEDILocation
        ? "EDI Location updated successfully"
        : "EDI Location created successfully"
    );
  }, [editingEDILocation, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingEDILocation(null);
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
            <h1 className="mb-0">Custom EDI Location Directory</h1>
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
                Add New EDI Location
              </Button>
            </div>
          </div>

          {showForm ? (
            <EDILocationForm
              ediLocationData={editingEDILocation}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <EDILocationList
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

export default EDILocation;
