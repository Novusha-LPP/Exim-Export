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
const AccountInfoService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/accountInfo`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${AccountInfoService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${AccountInfoService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${AccountInfoService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(
        `${AccountInfoService.baseURL}/${id}`,
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
        `${AccountInfoService.baseURL}/${id}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await axios.delete(`${AccountInfoService.baseURL}/`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const AccountInfoForm = ({ accountInfo, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    accountGroup: "",
    creditLimit: "",
    paymentTerms: "",
    currency: "USD",
    ledgerCode: "",
    accountManager: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const accountGroups = [
    "Assets",
    "Liabilities",
    "Equity",
    "Revenue",
    "Expenses",
    "Accounts Receivable",
    "Accounts Payable",
    "Inventory",
    "Fixed Assets",
    "Current Assets",
    "Other",
  ];

  const currencies = [
    "USD",
    "EUR",
    "INR",
    "GBP",
    "JPY",
    "CAD",
    "AUD",
    "CHF",
    "CNY",
    "SGD",
  ];

  const paymentTermsOptions = [
    "Net 30",
    "Net 15",
    "Net 7",
    "Due on Receipt",
    "2/10 Net 30",
    "Net 60",
    "Net 90",
    "COD",
    "Prepaid",
    "Custom",
  ];

  useEffect(() => {
    if (accountInfo) {
      setFormData(accountInfo);
    } else {
      setFormData({
        accountGroup: "",
        creditLimit: "",
        paymentTerms: "",
        currency: "USD",
        ledgerCode: "",
        accountManager: "",
        status: "Active",
      });
    }
  }, [accountInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.accountGroup?.trim()) {
      newErrors.accountGroup = "Account Group is required";
    }

    if (!formData.creditLimit?.trim()) {
      newErrors.creditLimit = "Credit Limit is required";
    } else if (
      isNaN(formData.creditLimit) ||
      parseFloat(formData.creditLimit) < 0
    ) {
      newErrors.creditLimit = "Credit Limit must be a valid positive number";
    }

    if (!formData.paymentTerms?.trim()) {
      newErrors.paymentTerms = "Payment Terms is required";
    }

    if (!formData.currency?.trim()) {
      newErrors.currency = "Currency is required";
    }

    if (!formData.ledgerCode?.trim()) {
      newErrors.ledgerCode = "Ledger Code is required";
    } else if (!/^[A-Z0-9-]+$/.test(formData.ledgerCode)) {
      newErrors.ledgerCode =
        "Ledger Code must contain only uppercase letters, numbers, and hyphens";
    }

    if (!formData.accountManager?.trim()) {
      newErrors.accountManager = "Account Manager is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        creditLimit: parseFloat(formData.creditLimit),
      };

      if (accountInfo?._id) {
        await AccountInfoService.update(accountInfo._id, dataToSubmit);
      } else {
        await AccountInfoService.create(dataToSubmit);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving account information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>
          {accountInfo
            ? "Edit Account Information"
            : "Add New Account Information"}
        </h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Account Group *</Form.Label>
                <Form.Select
                  name="accountGroup"
                  value={formData.accountGroup}
                  onChange={handleChange}
                  isInvalid={!!errors.accountGroup}
                >
                  <option value="">Select Account Group</option>
                  {accountGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.accountGroup}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Credit Limit *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  name="creditLimit"
                  value={formData.creditLimit}
                  onChange={handleChange}
                  isInvalid={!!errors.creditLimit}
                  placeholder="Enter credit limit"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.creditLimit}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Payment Terms *</Form.Label>
                <Form.Select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  isInvalid={!!errors.paymentTerms}
                >
                  <option value="">Select Payment Terms</option>
                  {paymentTermsOptions.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.paymentTerms}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Currency *</Form.Label>
                <Form.Select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  isInvalid={!!errors.currency}
                >
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.currency}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Ledger Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="ledgerCode"
                  value={formData.ledgerCode}
                  onChange={handleChange}
                  isInvalid={!!errors.ledgerCode}
                  placeholder="e.g., AC-001, REV-100"
                  style={{ textTransform: "uppercase" }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.ledgerCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Use uppercase letters, numbers, and hyphens only
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Account Manager *</Form.Label>
                <Form.Control
                  type="text"
                  name="accountManager"
                  value={formData.accountManager}
                  onChange={handleChange}
                  isInvalid={!!errors.accountManager}
                  placeholder="Enter account manager name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.accountManager}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={12}>
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
const AccountInfoList = ({ onEdit, onDelete, refresh }) => {
  const [accountInfos, setAccountInfos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    accountGroup: "",
    currency: "",
    status: "",
  });

  useEffect(() => {
    fetchAccountInfos();
  }, [filters, refresh]);

  const fetchAccountInfos = async () => {
    try {
      setLoading(true);
      const response = await AccountInfoService.getAll(filters);
      setAccountInfos(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAccountInfos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
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
        <Col md={3}>
          <Form.Control
            type="text"
            placeholder="Search by ledger code, account manager..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.accountGroup}
            onChange={(e) => handleFilterChange("accountGroup", e.target.value)}
          >
            <option value="">All Account Groups</option>
            <option value="Assets">Assets</option>
            <option value="Liabilities">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Revenue">Revenue</option>
            <option value="Expenses">Expenses</option>
            <option value="Accounts Receivable">Accounts Receivable</option>
            <option value="Accounts Payable">Accounts Payable</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.currency}
            onChange={(e) => handleFilterChange("currency", e.target.value)}
          >
            <option value="">All Currencies</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="INR">INR</option>
            <option value="GBP">GBP</option>
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
            <option value="Suspended">Suspended</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Ledger Code</th>
              <th>Account Group</th>
              <th>Credit Limit</th>
              <th>Payment Terms</th>
              <th>Currency</th>
              <th>Account Manager</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accountInfos.map((item) => (
              <tr key={item._id}>
                <td>
                  <strong>{item.ledgerCode}</strong>
                </td>
                <td>{item.accountGroup}</td>
                <td>{formatCurrency(item.creditLimit, item.currency)}</td>
                <td>{item.paymentTerms}</td>
                <td>{item.currency}</td>
                <td>{item.accountManager}</td>
                <td>
                  <Badge
                    bg={
                      item.status === "Active"
                        ? "success"
                        : item.status === "Suspended"
                        ? "warning"
                        : "danger"
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

      {accountInfos.length === 0 && (
        <Alert variant="info" className="text-center">
          No account information found.
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
const AccountInfo = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingAccountInfo, setEditingAccountInfo] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingAccountInfo(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((accountInfo) => {
    setEditingAccountInfo(accountInfo);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm(
              "Are you sure you want to delete this account information?"
            )
          ) {
            await AccountInfoService.delete(ids[0]);
            showAlert("Account information deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        } else {
          await AccountInfoService.bulkDelete(ids);
          showAlert(`${ids.length} account information deleted successfully`);
          setRefresh((prev) => prev + 1);
        }
      } catch (error) {
        showAlert(
          error.message || "Error deleting account information",
          "danger"
        );
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingAccountInfo(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingAccountInfo
        ? "Account information updated successfully"
        : "Account information created successfully"
    );
  }, [editingAccountInfo, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingAccountInfo(null);
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
            <h1 className="mb-0">Account Information Directory</h1>
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
                Add New Account
              </Button>
            </div>
          </div>

          {showForm ? (
            <AccountInfoForm
              accountInfo={editingAccountInfo}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <AccountInfoList
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

export default AccountInfo;
