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
const CountryService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/countries`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${CountryService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${CountryService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${CountryService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`${CountryService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${CountryService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const CountryForm = ({ countryData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    countryCode: "",
    countryName: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (countryData) {
      setFormData(countryData);
    } else {
      setFormData({
        countryCode: "",
        countryName: "",
        status: "Active",
      });
    }
  }, [countryData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "countryCode" ? value.toUpperCase() : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.countryCode?.trim()) {
      newErrors.countryCode = "Country Code is required";
    } else if (!/^[A-Z]{2,3}$/.test(formData.countryCode)) {
      newErrors.countryCode = "Country Code must be 2-3 uppercase letters";
    }

    if (!formData.countryName?.trim()) {
      newErrors.countryName = "Country Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (countryData?._id) {
        await CountryService.update(countryData._id, formData);
      } else {
        await CountryService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving country");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{countryData ? "Edit Country" : "Add New Country"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Country Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  isInvalid={!!errors.countryCode}
                  placeholder="e.g., US, IND"
                  maxLength={3}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.countryCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2-3 letter ISO code (e.g., US, UK, IND)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Country Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="countryName"
                  value={formData.countryName}
                  onChange={handleChange}
                  isInvalid={!!errors.countryName}
                  placeholder="Enter country name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.countryName}
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
                </Form.Select>
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
const CountryList = ({ onEdit, onDelete, refresh }) => {
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all countries
  useEffect(() => {
    fetchCountries();
  }, [filters, refresh]);

  // Filter countries whenever searchTerm or countries change
  useEffect(() => {
    filterCountries();
  }, [searchTerm, countries]);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      const response = await CountryService.getAll(filters);
      const countriesData = response.data || response;
      setCountries(countriesData);
      setPagination(response.pagination || {});
    } catch (error) {
      console.error("Error fetching data:", error);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCountries = () => {
    if (!searchTerm.trim()) {
      setFilteredCountries(countries);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = countries.filter(
      (country) =>
        (country.countryCode &&
          country.countryCode.toLowerCase().includes(searchLower)) ||
        (country.countryName &&
          country.countryName.toLowerCase().includes(searchLower)) ||
        (country.status &&
          country.status.toLowerCase().includes(searchLower)) ||
        (country._id && country._id.toLowerCase().includes(searchLower))
    );
    setFilteredCountries(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
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
            placeholder="Search by country code, name, or status..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <Form.Text className="text-muted">
              Showing {filteredCountries.length} of {countries.length} countries
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
          </Form.Select>
        </Col>
        <Col md={3} className="text-center">
          <div className="border rounded p-2 bg-light">
            <div className="h6 mb-0 text-primary">
              {filteredCountries.length}
            </div>
            <div className="text-muted small">Total Countries</div>
          </div>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Country Code</th>
              <th>Country Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCountries.length > 0 ? (
              filteredCountries.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span className="font-monospace text-primary">
                      <strong>{item.countryCode}</strong>
                    </span>
                  </td>
                  <td>
                    <strong>{item.countryName}</strong>
                  </td>
                  <td>
                    <Badge
                      bg={item.status === "Active" ? "success" : "secondary"}
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
                <td colSpan="4" className="text-center py-4">
                  <Alert variant="info" className="text-center">
                    {searchTerm ? (
                      <>
                        No countries found matching "{searchTerm}".
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
                      "No countries found."
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
const Country = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingCountry(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((country) => {
    setEditingCountry(country);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (window.confirm("Are you sure you want to delete this country?")) {
            await CountryService.delete(ids[0]);
            showAlert("Country deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting country", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingCountry(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingCountry
        ? "Country updated successfully"
        : "Country created successfully"
    );
  }, [editingCountry, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingCountry(null);
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
            <h1 className="mb-0">Country Directory</h1>
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
                Add New Country
              </Button>
            </div>
          </div>

          {showForm ? (
            <CountryForm
              countryData={editingCountry}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <CountryList
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

export default Country;
