// DistrictCodeDirectory.jsx
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

// SERVICE
const DistrictService = {
  baseURL: `${import.meta.env.VITE_API_STRING}/districts`,

  getAll: async (params = {}) => {
    const res = await axios.get(`${DistrictService.baseURL}/`, { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await axios.get(`${DistrictService.baseURL}/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await axios.post(`${DistrictService.baseURL}/`, data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await axios.put(`${DistrictService.baseURL}/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${DistrictService.baseURL}/${id}`);
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await axios.delete(`${DistrictService.baseURL}/`, {
      data: { ids },
    });
    return res.data;
  },
};

// FORM
const DistrictForm = ({ districtData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    stateCode: "",
    districtCode: "",
    districtName: "",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (districtData) {
      setFormData({
        stateCode: districtData.stateCode || "",
        districtCode: districtData.districtCode || "",
        districtName: districtData.districtName || "",
        status: districtData.status || "Active",
      });
    } else {
      setFormData({
        stateCode: "",
        districtCode: "",
        districtName: "",
        status: "Active",
      });
    }
  }, [districtData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const v = name === "stateCode" ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: v }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!formData.stateCode.trim()) {
      e.stateCode = "State code is required";
    } else if (!/^\d{1,2}$/.test(formData.stateCode.trim())) {
      // ICES uses numeric state codes 1..38 etc. [attached_file:47]
      e.stateCode = "State code must be 1–2 digit numeric";
    }

    if (!formData.districtCode.trim()) {
      e.districtCode = "District code is required";
    } else if (!/^\d{1,3}$/.test(formData.districtCode.trim())) {
      e.districtCode = "District code must be 1–3 digit numeric";
    }

    if (!formData.districtName.trim()) {
      e.districtName = "District name is required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (districtData?._id) {
        await DistrictService.update(districtData._id, formData);
      } else {
        await DistrictService.create(formData);
      }
      onSave();
    } catch (err) {
      alert(err.message || "Error saving district");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <h5>{districtData ? "Edit District" : "Add New District"}</h5>
      </Card.Header>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>State Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleChange}
                  isInvalid={!!errors.stateCode}
                  maxLength={2}
                  placeholder="e.g., 24"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.stateCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Numeric state code as per ICES Annexure. [attached_file:47]
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>District Code *</Form.Label>
                <Form.Control
                  type="text"
                  name="districtCode"
                  value={formData.districtCode}
                  onChange={handleChange}
                  isInvalid={!!errors.districtCode}
                  maxLength={3}
                  placeholder="e.g., 438"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.districtCode}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Numeric district code within the state. [attached_file:47]
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
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>District Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="districtName"
                  value={formData.districtName}
                  onChange={handleChange}
                  isInvalid={!!errors.districtName}
                  placeholder="Enter district name"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.districtName}
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

// LIST
const DistrictCodeList = ({ onEdit, onDelete, refresh }) => {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ stateCode: "", status: "" });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, [filters, refresh]);

  useEffect(() => {
    applySearch();
  }, [searchTerm, items]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await DistrictService.getAll(filters);
      setItems(data);
      setFiltered(data);
    } catch (err) {
      console.error(err);
      setItems([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  const applySearch = () => {
    if (!searchTerm.trim()) {
      setFiltered(items);
      return;
    }
    const q = searchTerm.toLowerCase();
    setFiltered(
      items.filter(
        (d) =>
          d.stateCode?.toString().toLowerCase().includes(q) ||
          d.districtCode?.toString().toLowerCase().includes(q) ||
          d.districtName?.toLowerCase().includes(q) ||
          d.status?.toLowerCase().includes(q) ||
          d._id?.toLowerCase().includes(q)
      )
    );
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value || "", page: 1 }));
  };

  const clearSearch = () => setSearchTerm("");

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
        <Col md={5}>
          <Form.Control
            type="text"
            placeholder="Search by state code, district code, name, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Form.Text className="text-muted">
              Showing {filtered.length} of {items.length} districts
            </Form.Text>
          )}
        </Col>
        <Col md={3}>
          <Form.Control
            type="text"
            placeholder="Filter by State Code"
            value={filters.stateCode}
            onChange={(e) => handleFilterChange("stateCode", e.target.value)}
          />
        </Col>
        <Col md={2}>
          <Form.Select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Form.Select>
        </Col>
        <Col md={2} className="text-center">
          <div className="border rounded p-2 bg-light">
            <div className="h6 mb-0 text-primary">{filtered.length}</div>
            <div className="text-muted small">Total Districts</div>
          </div>
        </Col>
      </Row>

      <div className="table-responsive">
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>State Code</th>
              <th>District Code</th>
              <th>District Name</th>
              <th>Status</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((d) => (
                <tr key={d._id}>
                  <td>
                    <span className="font-monospace text-primary">
                      <strong>{d.stateCode}</strong>
                    </span>
                  </td>
                  <td>
                    <span className="font-monospace">{d.districtCode}</span>
                  </td>
                  <td>
                    <strong>{d.districtName}</strong>
                  </td>
                  <td>
                    <Badge bg={d.status === "Active" ? "success" : "secondary"}>
                      {d.status}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      className="me-2"
                      onClick={() => onEdit(d)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDelete([d._id])}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  <Alert variant="info">
                    {searchTerm ? (
                      <>
                        No districts found matching "{searchTerm}".{" "}
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
                      "No districts found."
                    )}
                  </Alert>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

// MAIN DIRECTORY
const DistrictCodeDirectory = () => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [alert, setAlert] = useState(null);

  const showAlert = useCallback((message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  }, []);

  const handleAddNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (d) => {
    setEditing(d);
    setShowForm(true);
  };

  const handleDelete = useCallback(
    async (ids) => {
      try {
        if (ids.length === 1) {
          if (window.confirm("Delete this district?")) {
            await DistrictService.delete(ids[0]);
            showAlert("District deleted successfully");
            setRefresh((p) => p + 1);
          }
        } else {
          await DistrictService.bulkDelete(ids);
          showAlert(`${ids.length} districts deleted successfully`);
          setRefresh((p) => p + 1);
        }
      } catch (err) {
        showAlert(err.message || "Error deleting districts", "danger");
      }
    },
    [showAlert]
  );

  const handleSave = useCallback(() => {
    setShowForm(false);
    setEditing(null);
    setRefresh((p) => p + 1);
    showAlert(
      editing ? "District updated successfully" : "District created successfully"
    );
  }, [editing, showAlert]);

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

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
            <h1 className="mb-0">District Code Directory</h1>
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
                Add New District
              </Button>
            </div>
          </div>

          {showForm ? (
            <DistrictForm
              districtData={editing}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <DistrictCodeList
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

export default DistrictCodeDirectory;
