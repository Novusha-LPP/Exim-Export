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
const CurrencyService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/currencies`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${CurrencyService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${CurrencyService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${CurrencyService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(
        `${CurrencyService.baseURL}/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${CurrencyService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const CurrencyForm = ({ currencyData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    currencyCode: "",
    currencyDescription: "",
    countryCode: "",
    schNo: "",
    standardCurrency: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (currencyData) {
      setFormData(currencyData);
    } else {
      setFormData({
        currencyCode: "",
        currencyDescription: "",
        countryCode: "",
        schNo: "",
        standardCurrency: false,
      });
    }
  }, [currencyData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "currencyCode" || name === "countryCode"
          ? value.toUpperCase()
          : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currencyCode?.trim()) {
      newErrors.currencyCode = "Currency Code is required";
    } else if (!/^[A-Z]{3}$/.test(formData.currencyCode)) {
      newErrors.currencyCode = "Code must be 3 uppercase letters (e.g., USD)";
    }

    if (!formData.currencyDescription?.trim()) {
      newErrors.currencyDescription = "Currency Description is required";
    }

    if (!formData.countryCode?.trim()) {
      newErrors.countryCode = "Country Code is required";
    } else if (!/^[A-Z]{2}$/.test(formData.countryCode)) {
      newErrors.countryCode = "Code must be 2 uppercase letters (e.g., US)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (currencyData?._id) {
        await CurrencyService.update(currencyData._id, formData);
      } else {
        await CurrencyService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving currency");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{currencyData ? "Edit Currency" : "Add New Currency"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Currency Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="currencyCode"
                  value={formData.currencyCode}
                  onChange={handleChange}
                  isInvalid={!!errors.currencyCode}
                  placeholder="e.g., USD, EUR, INR"
                  maxLength={3}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.currencyCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  3-letter ISO 4217 code
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Country Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  isInvalid={!!errors.countryCode}
                  placeholder="e.g., US, IN, DE"
                  maxLength={2}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.countryCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2-letter ISO 3166-1 code
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>SCH NO</Form.Label>
                <Form.Control
                  type="text"
                  name="schNo"
                  value={formData.schNo}
                  onChange={handleChange}
                  placeholder="Schedule Number"
                  maxLength={20}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Standard Currency</Form.Label>
                <Form.Check
                  type="checkbox"
                  name="standardCurrency"
                  checked={formData.standardCurrency}
                  onChange={handleChange}
                  label="Is Standard Currency"
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Currency Description *</Form.Label>
                <Form.Control
                  type="text"
                  name="currencyDescription"
                  value={formData.currencyDescription}
                  onChange={handleChange}
                  isInvalid={!!errors.currencyDescription}
                  placeholder="e.g., United States Dollar, Euro, Indian Rupee"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.currencyDescription}
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
const CurrencyList = ({ onEdit, onDelete, refresh }) => {
  const [currencies, setCurrencies] = useState([]);
  const [filteredCurrencies, setFilteredCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [availableCountries, setAvailableCountries] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    countryCode: "",
    standardCurrency: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCurrencies();
  }, [filters, refresh]);

  useEffect(() => {
    filterCurrencies();
  }, [searchTerm, currencies]);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await CurrencyService.getAll(filters);
      const currenciesData = response.data || response;
      setCurrencies(currenciesData);
      setFilteredCurrencies(currenciesData);
      setPagination(response.pagination || {});

      // Extract unique countries for filtering
      const countries = [
        ...new Set((response.data || []).map((item) => item.countryCode)),
      ].sort();
      setAvailableCountries(countries);
    } catch (error) {
      console.error("Error fetching data:", error);
      setCurrencies([]);
      setFilteredCurrencies([]);
    } finally {
      setLoading(false);
    }
  };

  const filterCurrencies = () => {
    if (!searchTerm.trim()) {
      setFilteredCurrencies(currencies);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = currencies.filter(
      (currency) =>
        (currency.currencyCode &&
          currency.currencyCode.toLowerCase().includes(searchLower)) ||
        (currency.currencyDescription &&
          currency.currencyDescription.toLowerCase().includes(searchLower)) ||
        (currency.countryCode &&
          currency.countryCode.toLowerCase().includes(searchLower)) ||
        (currency.schNo &&
          currency.schNo.toLowerCase().includes(searchLower)) ||
        (currency._id && currency._id.toLowerCase().includes(searchLower))
    );
    setFilteredCurrencies(filtered);
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
      {/* Filters */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Search by currency code, description, or country..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <Form.Text className="text-muted">
              Showing {filteredCurrencies.length} of {currencies.length}{" "}
              currencies
              {searchTerm && ` matching "${searchTerm}"`}
            </Form.Text>
          )}
        </Col>
        <Col md={4}>
          <Form.Select
            value={filters.countryCode}
            onChange={(e) => handleFilterChange("countryCode", e.target.value)}
          >
            <option value="">All Countries</option>
            {availableCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Select
            value={filters.standardCurrency}
            onChange={(e) =>
              handleFilterChange("standardCurrency", e.target.value)
            }
          >
            <option value="">All Types</option>
            <option value="true">Standard Currency</option>
            <option value="false">Non-Standard</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Results Counter */}
      <Row className="mb-3">
        <Col md={4}>
          <div className="border rounded p-2 bg-light">
            <div className="h6 mb-0 text-primary">
              {filteredCurrencies.length}
            </div>
            <div className="text-muted small">Total Currencies</div>
          </div>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: "100px" }}>Currency Code</th>
              <th>Currency Description</th>
              <th style={{ width: "120px" }}>Country Code</th>
              <th style={{ width: "100px" }}>SCH NO</th>
              <th style={{ width: "120px" }}>Standard</th>
              <th style={{ width: "150px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCurrencies.length > 0 ? (
              filteredCurrencies.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span className="font-monospace text-primary">
                      <strong>{item.currencyCode}</strong>
                    </span>
                  </td>
                  <td>
                    <strong>{item.currencyDescription}</strong>
                  </td>
                  <td>
                    <span className="font-monospace">{item.countryCode}</span>
                  </td>
                  <td>
                    <span className="text-muted">{item.schNo || "-"}</span>
                  </td>
                  <td>
                    <Badge bg={item.standardCurrency ? "success" : "secondary"}>
                      {item.standardCurrency ? "Yes" : "No"}
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
                  <Alert variant="info" className="text-center">
                    {searchTerm ? (
                      <>
                        No currencies found matching "{searchTerm}".
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
                      "No currencies found."
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
const Currency = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingCurrency(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((currency) => {
    setEditingCurrency(currency);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm("Are you sure you want to delete this currency?")
          ) {
            await CurrencyService.delete(ids[0]);
            showAlert("Currency deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        }
      } catch (error) {
        showAlert(error.message || "Error deleting currency", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingCurrency(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingCurrency
        ? "Currency updated successfully"
        : "Currency created successfully"
    );
  }, [editingCurrency, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingCurrency(null);
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
            <h1 className="mb-0">Currency Directory</h1>
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
                Add New Currency
              </Button>
            </div>
          </div>

          {showForm ? (
            <CurrencyForm
              currencyData={editingCurrency}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <CurrencyList
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

export default Currency;
