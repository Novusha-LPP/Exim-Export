// ContainerTab.jsx
import React, { useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";

const containerTypes = [
  "20 Standard Dry",
  "20 Flat Rack",
  "20 Collapsible Flat Rack ",
  "20 Reefer",
  "20 Tank",
  "20 Open Top",
  "20 Hard Top",
  "20 Platform",
  "40 Standard Dry",
  "40 Flat Rack",
  "40 Collapsible Flat Rack ",
  "40 Reefer",
  "40 Tank",
  "40 Open Top",
  "40 Hard Top",
  "40 High Cube",
  "40 Reefer High Cube",
  "40 Platform",
];
const sealTypes = [
  "BTSL - Bottle",
  "ES - Electronic Seal",
  "RFID - Radio Frequency Identifier",
];

const ContainerTab = ({ formik }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  // Handle inline field change
  const handleFieldChange = (index, field, value) => {
    const containers = [...formik.values.containers];
    containers[index][field] = value;
    formik.setFieldValue("containers", containers);
  };

  // Add new container
  const handleAdd = () => {
    const newContainer = {
      serialNumber: (formik.values.containers?.length || 0) + 1,
      containerNo: "",
      sealNo: "",
      sealDate: "",
      type: "",
      pkgsStuffed: 0,
      grossWeight: 0,
      sealType: "",
      grWtPlusTrWt: 0,
      sealDeviceId: "",
      rfid: "",
    };

    const containers = [...(formik.values.containers || []), newContainer];
    formik.setFieldValue("containers", containers);

    // Set the new row to edit mode
    setEditingIndex(containers.length - 1);
  };

  // Delete container
  const handleDelete = (idx) => {
    const containers = formik.values.containers.filter((_, i) => i !== idx);
    formik.setFieldValue("containers", containers);
    if (editingIndex === idx) {
      setEditingIndex(null);
    } else if (editingIndex > idx) {
      setEditingIndex(editingIndex - 1);
    }
  };

  // Edit container
  const handleEdit = (idx) => {
    setEditingIndex(idx);
  };

  // Save container changes
  const handleSave = (idx) => {
    setEditingIndex(null);
    // You can add validation or API call here if needed
  };

  // Cancel editing
  const handleCancel = (idx) => {
    setEditingIndex(null);
    // If you want to revert changes, you might need to maintain a backup state
  };

  // Check if a field is editable
  const isEditable = (index) => {
    return editingIndex === index;
  };

  return (
    <Box>
      {/* Add New Button */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ minWidth: 120 }}
        >
          New Container
        </Button>
      </Box>

      {/* Scrollable Table */}
      <TableContainer
        component={Paper}
        sx={{
          mb: 2,
          maxHeight: 600,
          overflow: "auto",
          "& .MuiTable-root": {
            minWidth: 1000,
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  width: "60px",
                  position: "sticky",
                  left: 0,

                  zIndex: 2,
                }}
              >
                Sr No
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "120px" }}>
                Container No
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "120px" }}>
                Seal No
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Seal Date
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "120px" }}>
                Type
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Pkgs Stuffed
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Gross Weight
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Seal Type
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Seal Device ID
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Gr-Wt + Tr-wt
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  width: "150px",
                  position: "sticky",
                  right: 0,
                  // backgroundColor: "#f5f5f5",
                  zIndex: 2,
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(formik.values.containers || []).map((row, idx) => (
              <TableRow key={idx} hover>
                {/* Serial Number - Always Readonly */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    backgroundColor: "white",
                    zIndex: 1,
                  }}
                >
                  {row.serialNumber}
                </TableCell>

                {/* Container No */}
                <TableCell>
                  <TextField
                    value={row.containerNo}
                    onChange={(e) =>
                      handleFieldChange(idx, "containerNo", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  />
                </TableCell>

                {/* Seal No */}
                <TableCell>
                  <TextField
                    value={row.sealNo || ""}
                    onChange={(e) =>
                      handleFieldChange(idx, "sealNo", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  />
                </TableCell>

                {/* Seal Date */}
                <TableCell>
                  <TextField
                    type="date"
                    value={row.sealDate ? row.sealDate.substr(0, 10) : ""}
                    onChange={(e) =>
                      handleFieldChange(idx, "sealDate", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    disabled={!isEditable(idx)}
                  />
                </TableCell>

                {/* Type */}
                <TableCell>
                  <TextField
                    select
                    value={row.type}
                    onChange={(e) =>
                      handleFieldChange(idx, "type", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  >
                    {containerTypes.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>

                {/* Pkgs Stuffed */}
                <TableCell>
                  <TextField
                    type="number"
                    value={row.pkgsStuffed}
                    onChange={(e) =>
                      handleFieldChange(idx, "pkgsStuffed", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  />
                </TableCell>

                {/* Gross Weight */}
                <TableCell>
                  <TextField
                    type="number"
                    value={row.grossWeight}
                    onChange={(e) =>
                      handleFieldChange(idx, "grossWeight", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  />
                </TableCell>

                {/* Seal Type */}
                <TableCell>
                  <TextField
                    select
                    value={row.sealType}
                    onChange={(e) =>
                      handleFieldChange(idx, "sealType", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  >
                    {sealTypes.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>

                {/* Seal Device ID */}
                <TableCell>
                  <TextField
                    value={row.sealDeviceId || ""}
                    onChange={(e) =>
                      handleFieldChange(idx, "sealDeviceId", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  />
                </TableCell>

                {/* Gr-Wt + Tr-wt */}
                <TableCell>
                  <TextField
                    type="number"
                    value={row.grWtPlusTrWt}
                    onChange={(e) =>
                      handleFieldChange(idx, "grWtPlusTrWt", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                    disabled={!isEditable(idx)}
                  />
                </TableCell>

                {/* Actions - Sticky on right */}
                <TableCell
                  sx={{
                    position: "sticky",
                    right: 0,
                    backgroundColor: "white",
                    zIndex: 1,
                  }}
                >
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "nowrap" }}>
                    {isEditable(idx) ? (
                      <>
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleSave(idx)}
                          title="Save"
                        >
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="secondary"
                          size="small"
                          onClick={() => handleCancel(idx)}
                          title="Cancel"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleEdit(idx)}
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(idx)}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Empty State */}
      {(!formik.values.containers || formik.values.containers.length === 0) && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No containers added yet. Click "New Container" to add one.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ContainerTab;
