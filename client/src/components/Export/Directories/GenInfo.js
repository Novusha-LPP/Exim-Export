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
const GenInfoService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/genInfo`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${GenInfoService.baseURL}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${GenInfoService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${GenInfoService.baseURL}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`${GenInfoService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${GenInfoService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await axios.delete(`${GenInfoService.baseURL}/`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// Form Component
const GenInfoForm = ({ genInfo, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    organizationName: "",
    shortName: "",
    type: "",
    panNo: "",
    gstin: "",
    ieCode: "",
    branchCode: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (genInfo) {
      setFormData(genInfo);
    } else {
      setFormData({
        organizationName: "",
        shortName: "",
        type: "",
        panNo: "",
        gstin: "",
        ieCode: "",
        branchCode: "",
        status: "Active",
      });
    }
  }, [genInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.organizationName?.trim()) {
      newErrors.organizationName = "Organization name is required";
    }
    if (!formData.shortName?.trim()) {
      newErrors.shortName = "Short name is required";
    }
    if (!formData.type) {
      newErrors.type = "Type is required";
    }
    if (formData.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNo)) {
      newErrors.panNo = "Invalid PAN format";
    }
    if (
      formData.gstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        formData.gstin
      )
    ) {
      newErrors.gstin = "Invalid GSTIN format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (genInfo?._id) {
        await GenInfoService.update(genInfo._id, formData);
      } else {
        await GenInfoService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{genInfo ? "Edit Organization" : "Add New Organization"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Organization Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  isInvalid={!!errors.organizationName}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.organizationName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Short Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="shortName"
                  value={formData.shortName}
                  onChange={handleChange}
                  isInvalid={!!errors.shortName}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.shortName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Type *</Form.Label>
                <Form.Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  isInvalid={!!errors.type}
                >
                  <option value="">Select Type</option>
                  <option value="Shipper">Shipper</option>
                  <option value="Consignee">Consignee</option>
                  <option value="Agent">Agent</option>
                  <option value="Carrier">Carrier</option>
                  <option value="Other">Other</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {errors.type}
                </Form.Control.Feedback>
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
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>PAN No.</Form.Label>
                <Form.Control
                  type="text"
                  name="panNo"
                  value={formData.panNo}
                  onChange={handleChange}
                  isInvalid={!!errors.panNo}
                  placeholder="e.g., ABCTY1234D"
                  style={{ textTransform: "uppercase" }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.panNo}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>GSTIN</Form.Label>
                <Form.Control
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  isInvalid={!!errors.gstin}
                  placeholder="e.g., 29ABCTY1234D1Z5"
                  style={{ textTransform: "uppercase" }}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.gstin}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>IE Code</Form.Label>
                <Form.Control
                  type="text"
                  name="ieCode"
                  value={formData.ieCode}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Branch Code</Form.Label>
                <Form.Control
                  type="text"
                  name="branchCode"
                  value={formData.branchCode}
                  onChange={handleChange}
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
const GenInfoList = ({ onEdit, onDelete, refresh }) => {
  const [genInfos, setGenInfos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    type: "",
    status: "",
  });

  useEffect(() => {
    fetchGenInfos();
  }, [filters, refresh]);

  const fetchGenInfos = async () => {
    try {
      setLoading(true);
      const response = await GenInfoService.getAll(filters);
      setGenInfos(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching data:", error);
      setGenInfos([]);
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
        <Col md={4}>
          <Form.Control
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Shipper">Shipper</option>
            <option value="Consignee">Consignee</option>
            <option value="Agent">Agent</option>
            <option value="Carrier">Carrier</option>
            <option value="Other">Other</option>
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
          </Form.Select>
        </Col>
      </Row>

      {/* Table */}
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Organization Name</th>
              <th>Short Name</th>
              <th>Type</th>
              <th>PAN No.</th>
              <th>GSTIN</th>
              <th>IE Code</th>
              <th>Branch Code</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {genInfos.map((item) => (
              <tr key={item._id}>
                <td>{item.organizationName}</td>
                <td>{item.shortName}</td>
                <td>{item.type}</td>
                <td>{item.panNo || "-"}</td>
                <td>{item.gstin || "-"}</td>
                <td>{item.ieCode || "-"}</td>
                <td>{item.branchCode || "-"}</td>
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
const GenInfo = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingGenInfo, setEditingGenInfo] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingGenInfo(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((genInfo) => {
    setEditingGenInfo(genInfo);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (
            window.confirm("Are you sure you want to delete this organization?")
          ) {
            await GenInfoService.delete(ids[0]);
            showAlert("Organization deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        } else {
          await GenInfoService.bulkDelete(ids);
          showAlert(`${ids.length} organizations deleted successfully`);
          setRefresh((prev) => prev + 1);
        }
      } catch (error) {
        showAlert(error.message || "Error deleting organization(s)", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingGenInfo(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingGenInfo
        ? "Organization updated successfully"
        : "Organization created successfully"
    );
  }, [editingGenInfo, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingGenInfo(null);
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
            <h1 className="mb-0">General Infromation Directory</h1>
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
                Add New Organization
              </Button>
            </div>
          </div>

          {showForm ? (
            <GenInfoForm
              genInfo={editingGenInfo}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <GenInfoList
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

export default GenInfo;

// API Routes (for reference - use in your backend)
/*
import express from 'express';
import GenInfo from '../../model/Directories/GenInfo.mjs';

const router = express.Router();

// Your existing API routes go here...
// (Keep your existing API code as is)

export default router;
*/
