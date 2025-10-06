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
const BankDetailsService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/bankDetails`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${BankDetailsService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${BankDetailsService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${BankDetailsService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(
        `${BankDetailsService.baseURL}/${id}`,
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
        `${BankDetailsService.baseURL}/${id}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await axios.delete(`${BankDetailsService.baseURL}/`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const BankDetailsForm = ({ bankDetails, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    bankName: "",
    branch: "",
    accountNumber: "",
    ifscCode: "",
    swiftCode: "",
    bankAddress: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (bankDetails) {
      setFormData(bankDetails);
    } else {
      setFormData({
        bankName: "",
        branch: "",
        accountNumber: "",
        ifscCode: "",
        swiftCode: "",
        bankAddress: "",
        status: "Active",
      });
    }
  }, [bankDetails]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bankName?.trim()) {
      newErrors.bankName = "Bank Name is required";
    }

    if (!formData.branch?.trim()) {
      newErrors.branch = "Branch is required";
    }

    if (!formData.accountNumber?.trim()) {
      newErrors.accountNumber = "Account Number is required";
    } else if (!/^\d{9,18}$/.test(formData.accountNumber)) {
      newErrors.accountNumber = "Account Number must be 9-18 digits";
    }

    if (!formData.ifscCode?.trim()) {
      newErrors.ifscCode = "IFSC Code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      newErrors.ifscCode = "Invalid IFSC Code format (e.g., SBIN0001234)";
    }

    if (
      formData.swiftCode &&
      !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(formData.swiftCode)
    ) {
      newErrors.swiftCode = "Invalid SWIFT Code format (8 or 11 characters)";
    }

    if (!formData.bankAddress?.trim()) {
      newErrors.bankAddress = "Bank Address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (bankDetails?._id) {
        await BankDetailsService.update(bankDetails._id, formData);
      } else {
        await BankDetailsService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving bank details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{bankDetails ? "Edit Bank Details" : "Add New Bank Details"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Bank Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  isInvalid={!!errors.bankName}
                  placeholder="Enter bank name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.bankName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Branch *</Form.Label>
                <Form.Control
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  isInvalid={!!errors.branch}
                  placeholder="Enter branch name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.branch}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Account Number *</Form.Label>
                <Form.Control
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  isInvalid={!!errors.accountNumber}
                  placeholder="Enter account number"
                  maxLength={18}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.accountNumber}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  9-18 digit account number
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>IFSC Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  isInvalid={!!errors.ifscCode}
                  placeholder="e.g., SBIN0001234"
                  style={{ textTransform: "uppercase" }}
                  maxLength={11}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.ifscCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  11-character IFSC code (e.g., SBIN0001234)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>SWIFT Code</Form.Label>
                <Form.Control
                  type="text"
                  name="swiftCode"
                  value={formData.swiftCode}
                  onChange={handleChange}
                  isInvalid={!!errors.swiftCode}
                  placeholder="e.g., SBININBB123"
                  style={{ textTransform: "uppercase" }}
                  maxLength={11}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.swiftCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  8 or 11-character SWIFT/BIC code (optional)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Closed">Closed</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Bank Address *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="bankAddress"
                  value={formData.bankAddress}
                  onChange={handleChange}
                  isInvalid={!!errors.bankAddress}
                  placeholder="Enter complete bank address"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.bankAddress}
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
const BankDetailsList = ({ onEdit, onDelete, refresh }) => {
  const [bankDetails, setBankDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    bankName: "",
    status: "",
  });

  useEffect(() => {
    fetchBankDetails();
  }, [filters, refresh]);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      const response = await BankDetailsService.getAll(filters);
      setBankDetails(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching data:", error);
      setBankDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatAccountNumber = (accountNumber) => {
    if (!accountNumber) return "-";
    // Show first 4 and last 4 digits, mask middle with asterisks
    if (accountNumber.length <= 8) return accountNumber;
    const first4 = accountNumber.substring(0, 4);
    const last4 = accountNumber.substring(accountNumber.length - 4);
    const masked = "*".repeat(accountNumber.length - 8);
    return `${first4}${masked}${last4}`;
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
            placeholder="Search by bank name, branch, IFSC..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Filter by bank name"
            value={filters.bankName}
            onChange={(e) => handleFilterChange("bankName", e.target.value)}
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
            <option value="Closed">Closed</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Bank Name</th>
              <th>Branch</th>
              <th>Account Number</th>
              <th>IFSC Code</th>
              <th>SWIFT Code</th>
              <th>Bank Address</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bankDetails.map((item) => (
              <tr key={item._id}>
                <td>
                  <strong>{item.bankName}</strong>
                </td>
                <td>{item.branch}</td>
                <td>
                  <span className="font-monospace">
                    {formatAccountNumber(item.accountNumber)}
                  </span>
                </td>
                <td>
                  <span className="font-monospace text-primary">
                    {item.ifscCode}
                  </span>
                </td>
                <td>
                  <span className="font-monospace">
                    {item.swiftCode || "-"}
                  </span>
                </td>
                <td>
                  <div style={{ maxWidth: "200px" }}>
                    <small className="text-muted">
                      {item.bankAddress.length > 50
                        ? `${item.bankAddress.substring(0, 50)}...`
                        : item.bankAddress}
                    </small>
                  </div>
                </td>
                <td>
                  <Badge
                    bg={
                      item.status === "Active"
                        ? "success"
                        : item.status === "Closed"
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

      {bankDetails.length === 0 && (
        <Alert variant="info" className="text-center">
          No bank details found.
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
const BankDetails = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingBankDetails, setEditingBankDetails] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingBankDetails(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((bankDetails) => {
    setEditingBankDetails(bankDetails);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm("Are you sure you want to delete this bank details?")
          ) {
            await BankDetailsService.delete(ids[0]);
            showAlert("Bank details deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        } else {
          await BankDetailsService.bulkDelete(ids);
          showAlert(`${ids.length} bank details deleted successfully`);
          setRefresh((prev) => prev + 1);
        }
      } catch (error) {
        showAlert(error.message || "Error deleting bank details", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingBankDetails(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingBankDetails
        ? "Bank details updated successfully"
        : "Bank details created successfully"
    );
  }, [editingBankDetails, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingBankDetails(null);
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
            <h1 className="mb-0">Bank Details Directory</h1>
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
                Add New Bank Details
              </Button>
            </div>
          </div>

          {showForm ? (
            <BankDetailsForm
              bankDetails={editingBankDetails}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <BankDetailsList
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

export default BankDetails;
