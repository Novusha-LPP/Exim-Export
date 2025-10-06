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
const StateService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/states`,

  getAll: async (params = {}) => {
    try {
      const response = await axios.get(`${StateService.baseURL}/`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getById: async (id) => {
    try {
      const response = await axios.get(`${StateService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  create: async (data) => {
    try {
      const response = await axios.post(`${StateService.baseURL}/`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await axios.put(`${StateService.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  delete: async (id) => {
    try {
      const response = await axios.delete(`${StateService.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await axios.delete(`${StateService.baseURL}/`, {
        data: { ids },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// --- FORM COMPONENT ---
const StateForm = ({ stateData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    stateName: "",
    tinNumber: "",
    stateCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (stateData) {
      setFormData(stateData);
    } else {
      setFormData({
        stateName: "",
        tinNumber: "",
        stateCode: "",
      });
    }
  }, [stateData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.stateName?.trim())
      newErrors.stateName = "State Name is required";
    if (!formData.tinNumber?.trim() || formData.tinNumber.length !== 2)
      newErrors.tinNumber = "TIN must be 2 digits";
    if (!formData.stateCode?.trim() || formData.stateCode.length !== 2)
      newErrors.stateCode = "Code must be 2 chars";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (stateData?._id) {
        await StateService.update(stateData._id, formData);
      } else {
        await StateService.create(formData);
      }
      onSave();
    } catch (error) {
      alert(error.message || "Error saving state");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{stateData ? "Edit State" : "Add New State"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>State Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="stateName"
                  value={formData.stateName}
                  onChange={handleChange}
                  isInvalid={!!errors.stateName}
                  placeholder="Enter State Name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.stateName}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>TIN Number *</Form.Label>
                <Form.Control
                  type="text"
                  name="tinNumber"
                  value={formData.tinNumber}
                  onChange={handleChange}
                  isInvalid={!!errors.tinNumber}
                  placeholder="e.g., 24"
                  maxLength={2}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.tinNumber}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2 digit TIN (e.g., 24)
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>State Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleChange}
                  isInvalid={!!errors.stateCode}
                  placeholder="e.g., GJ"
                  maxLength={2}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.stateCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  2 letter code (e.g., GJ)
                </Form.Text>
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

// --- LIST COMPONENT ---
const StateList = ({ onEdit, onDelete, refresh }) => {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    stateName: "",
  });

  useEffect(() => {
    fetchStates();
  }, [filters, refresh]);

  const fetchStates = async () => {
    try {
      setLoading(true);
      const allStates = await StateService.getAll();
      let filtered = allStates;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            (s.stateName && s.stateName.toLowerCase().includes(q)) ||
            (s.tinNumber && s.tinNumber.toLowerCase().includes(q)) ||
            (s.stateCode && s.stateCode.toLowerCase().includes(q))
        );
      }
      if (filters.stateName) {
        filtered = filtered.filter(
          (s) =>
            s.stateName &&
            s.stateName.toLowerCase().includes(filters.stateName.toLowerCase())
        );
      }
      setStates(filtered);
    } catch (error) {
      setStates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
      <Row className="mb-3">
        <Col md={6}>
          <Form.Control
            type="text"
            placeholder="Search by state, TIN or code..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </Col>
      </Row>
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>State Name</th>
              <th>TIN Number</th>
              <th>State Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {states.map((item) => (
              <tr key={item._id}>
                <td>
                  <strong>{item.stateName}</strong>
                </td>
                <td>{item.tinNumber}</td>
                <td>{item.stateCode}</td>
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
      {states.length === 0 && (
        <Alert variant="info" className="text-center">
          No state records found.
        </Alert>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
const StateDirectory = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingState, setEditingState] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingState(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((state) => {
    setEditingState(state);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (window.confirm("Are you sure you want to delete this state?")) {
            await StateService.delete(ids[0]);
            showAlert("State deleted successfully");
            setRefresh((prev) => prev + 1);
          }
        } else {
          await StateService.bulkDelete(ids);
          showAlert(`${ids.length} states deleted successfully`);
          setRefresh((prev) => prev + 1);
        }
      } catch (error) {
        showAlert(error.message || "Error deleting state", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditingState(null);
    setRefresh((prev) => prev + 1);
    showAlert(
      editingState ? "State updated successfully" : "State created successfully"
    );
  }, [editingState, showAlert]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingState(null);
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
            <h1 className="mb-0">State Code Directory</h1>
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
                Add New State
              </Button>
            </div>
          </div>

          {showForm ? (
            <StateForm
              stateData={editingState}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <StateList
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

export default StateDirectory;
