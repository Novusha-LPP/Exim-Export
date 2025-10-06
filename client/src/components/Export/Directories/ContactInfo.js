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
const ContactInfoService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/contactInfo`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${ContactInfoService.baseURL}/`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${ContactInfoService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${ContactInfoService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(
        `${ContactInfoService.baseURL}/${id}`,
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
        `${ContactInfoService.baseURL}/${id}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await axios.delete(`${ContactInfoService.baseURL}/`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const ContactInfoForm = ({ contactInfo, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    contactPerson: "",
    phoneNo: "",
    mobileNo: "",
    emailId: "",
    website: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contactInfo) {
      setFormData(contactInfo);
    } else {
      setFormData({
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
        contactPerson: "",
        phoneNo: "",
        mobileNo: "",
        emailId: "",
        website: "",
        status: "Active",
      });
    }
  }, [contactInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.addressLine1?.trim()) {
      newErrors.addressLine1 = "Address Line 1 is required";
    }

    if (!formData.city?.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state?.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.country?.trim()) {
      newErrors.country = "Country is required";
    }

    if (!formData.pincode?.trim()) {
      newErrors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    if (!formData.contactPerson?.trim()) {
      newErrors.contactPerson = "Contact Person is required";
    }

    if (
      formData.phoneNo &&
      !/^\d{10,15}$/.test(formData.phoneNo.replace(/[\s\-\(\)]/g, ""))
    ) {
      newErrors.phoneNo = "Invalid phone number format";
    }

    if (formData.mobileNo && !/^\d{10}$/.test(formData.mobileNo)) {
      newErrors.mobileNo = "Mobile number must be 10 digits";
    }

    if (
      formData.emailId &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)
    ) {
      newErrors.emailId = "Invalid email format";
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Website must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (contactInfo?._id) {
        await ContactInfoService.update(contactInfo._id, formData);
      } else {
        await ContactInfoService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving contact information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>
          {contactInfo
            ? "Edit Contact Information"
            : "Add New Contact Information"}
        </h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Address Line 1 *</Form.Label>
                <Form.Control
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  isInvalid={!!errors.addressLine1}
                  placeholder="Enter address line 1"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.addressLine1}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Address Line 2</Form.Label>
                <Form.Control
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Enter address line 2 (optional)"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>City *</Form.Label>
                <Form.Control
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  isInvalid={!!errors.city}
                  placeholder="Enter city"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.city}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>State *</Form.Label>
                <Form.Control
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  isInvalid={!!errors.state}
                  placeholder="Enter state"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.state}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Country *</Form.Label>
                <Form.Control
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  isInvalid={!!errors.country}
                  placeholder="Enter country"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.country}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Pincode *</Form.Label>
                <Form.Control
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  isInvalid={!!errors.pincode}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.pincode}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Contact Person *</Form.Label>
                <Form.Control
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  isInvalid={!!errors.contactPerson}
                  placeholder="Enter contact person name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.contactPerson}
                </Form.Control.Feedback>
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
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Phone No.</Form.Label>
                <Form.Control
                  type="tel"
                  name="phoneNo"
                  value={formData.phoneNo}
                  onChange={handleChange}
                  isInvalid={!!errors.phoneNo}
                  placeholder="Enter phone number"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.phoneNo}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Mobile No.</Form.Label>
                <Form.Control
                  type="tel"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleChange}
                  isInvalid={!!errors.mobileNo}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.mobileNo}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email ID</Form.Label>
                <Form.Control
                  type="email"
                  name="emailId"
                  value={formData.emailId}
                  onChange={handleChange}
                  isInvalid={!!errors.emailId}
                  placeholder="Enter email address"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.emailId}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Website</Form.Label>
                <Form.Control
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  isInvalid={!!errors.website}
                  placeholder="https://example.com"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.website}
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
const ContactInfoList = ({ onEdit, onDelete, refresh }) => {
  const [contactInfos, setContactInfos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    city: "",
    state: "",
    status: "",
  });

  useEffect(() => {
    fetchContactInfos();
  }, [filters, refresh]);

  const fetchContactInfos = async () => {
    try {
      setLoading(true);
      const response = await ContactInfoService.getAll(filters);
      setContactInfos(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching data:", error);
      setContactInfos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
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
            placeholder="Search by contact person, address..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Control
            type="text"
            placeholder="Filter by city"
            value={filters.city}
            onChange={(e) => handleFilterChange("city", e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Control
            type="text"
            placeholder="Filter by state"
            value={filters.state}
            onChange={(e) => handleFilterChange("state", e.target.value)}
          />
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
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Contact Person</th>
              <th>Address</th>
              <th>City</th>
              <th>State</th>
              <th>Pincode</th>
              <th>Mobile No.</th>
              <th>Email ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contactInfos.map((item) => (
              <tr key={item._id}>
                <td>{item.contactPerson}</td>
                <td>
                  <div>
                    <div>{item.addressLine1}</div>
                    {item.addressLine2 && (
                      <div className="text-muted">{item.addressLine2}</div>
                    )}
                  </div>
                </td>
                <td>{item.city}</td>
                <td>{item.state}</td>
                <td>{item.pincode}</td>
                <td>{item.mobileNo || "-"}</td>
                <td>{item.emailId || "-"}</td>
                <td>
                  <Badge bg={item.status === "Active" ? "success" : "danger"}>
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

      {contactInfos.length === 0 && (
        <Alert variant="info" className="text-center">
          No contact information found.
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
const ContactInfo = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingContactInfo, setEditingContactInfo] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingContactInfo(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((contactInfo) => {
    setEditingContactInfo(contactInfo);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm(
              "Are you sure you want to delete this contact information?"
            )
          ) {
            await ContactInfoService.delete(ids[0]);
            showAlert("Contact information deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        } else {
          await ContactInfoService.bulkDelete(ids);
          showAlert(`${ids.length} contact information deleted successfully`);
          setRefresh((prev) => prev + 1);
        }
      } catch (error) {
        showAlert(
          error.message || "Error deleting contact information",
          "danger"
        );
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingContactInfo(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingContactInfo
        ? "Contact information updated successfully"
        : "Contact information created successfully"
    );
  }, [editingContactInfo, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingContactInfo(null);
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
            <h1 className="mb-0">Contact Information Directory</h1>
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
                Add New Contact
              </Button>
            </div>
          </div>

          {showForm ? (
            <ContactInfoForm
              contactInfo={editingContactInfo}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <ContactInfoList
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

export default ContactInfo;
