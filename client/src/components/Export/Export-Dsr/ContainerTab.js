// ContainerTab.jsx
import React from "react";
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
} from "@mui/material";

const containerTypes = [
  "20 Standard Dry",
  "40 Standard Dry",
  "40 High Cube",
  "20 Reefer",
  "40 Reefer",
];
const sealTypes = ["BTSL - Bottle", "WIRE", "PLASTIC", "METAL", "RFID"];

const ContainerTab = ({ formik }) => {
  // Handle inline field change
  const handleFieldChange = (index, field, value) => {
    const containers = [...formik.values.containers];
    containers[index][field] = value;
    formik.setFieldValue("containers", containers);
  };

  // Add/Remove functions
  const handleAdd = () => {
    const containers = [
      ...formik.values.containers,
      {
        serialNumber: (formik.values.containers.length || 0) + 1,
        containerNo: "",
        sealNo: "",
        sealDate: "",
        type: "",
        pkgsStuffed: 0,
        grossWeight: 0,
        sealType: "",
        moveDocType: "",
        location: "",
        grWtPlusTrWt: 0,
        sealDeviceId: "",
        rfid: "",
      },
    ];
    formik.setFieldValue("containers", containers);
  };

  const handleDelete = (idx) => {
    const containers = formik.values.containers.filter((_, i) => i !== idx);
    formik.setFieldValue("containers", containers);
  };

  const handleEdit = (idx) => {
    // Implement edit logic if needed
    console.log("Edit container:", idx);
  };

  const handleUpdate = (idx) => {
    // Implement update logic if needed
    console.log("Update container:", idx);
  };

  return (
    <Box>
      {/* Main Table */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold", width: "60px" }}>
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
              <TableCell sx={{ fontWeight: "bold", width: "80px" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(formik.values.containers || []).map((row, idx) => (
              <TableRow key={idx} hover>
                <TableCell>{row.serialNumber}</TableCell>
                <TableCell>
                  <TextField
                    value={row.containerNo}
                    onChange={(e) =>
                      handleFieldChange(idx, "containerNo", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={row.sealNo || ""}
                    onChange={(e) =>
                      handleFieldChange(idx, "sealNo", e.target.value)
                    }
                    size="small"
                    fullWidth
                    variant="outlined"
                  />
                </TableCell>
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
                  />
                </TableCell>
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
                  >
                    {containerTypes.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
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
                  />
                </TableCell>
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
                  />
                </TableCell>
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
                  >
                    {sealTypes.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <Button
                    color="error"
                    size="small"
                    onClick={() => handleDelete(idx)}
                    variant="outlined"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Additional Fields Section */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Container No
            </Typography>
            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Container No"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Seal No
            </Typography>
            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Seal No"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Move Doc. Type
            </Typography>
            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Move Doc. Type"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Type
            </Typography>
            <TextField
              select
              size="small"
              fullWidth
              variant="outlined"
              defaultValue="20 Standard Dry"
            >
              {containerTypes.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Seal Date
            </Typography>
            <TextField
              type="date"
              size="small"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Pkgs Stuffed
            </Typography>
            <TextField
              type="number"
              size="small"
              fullWidth
              variant="outlined"
              defaultValue={0}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Seal Type
            </Typography>
            <TextField select size="small" fullWidth variant="outlined">
              {sealTypes.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Location
            </Typography>
            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Location"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Gross Weight
            </Typography>
            <TextField
              type="number"
              size="small"
              fullWidth
              variant="outlined"
              defaultValue={0.0}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Seal Device ID
            </Typography>
            <TextField
              size="small"
              fullWidth
              variant="outlined"
              placeholder="Seal Device ID"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="subtitle2" gutterBottom>
              Gr-Wt + Tr-wt
            </Typography>
            <TextField
              type="number"
              size="small"
              fullWidth
              variant="outlined"
              defaultValue={0.0}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Action Buttons */}
      <Grid container spacing={1} sx={{ mt: 1 }}>
        <Grid item>
          <Button variant="outlined" size="small" onClick={handleAdd}>
            New
          </Button>
        </Grid>
        <Grid item>
          <Button variant="outlined" size="small" onClick={() => handleEdit(0)}>
            Edit
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleUpdate(0)}
          >
            Update
          </Button>
        </Grid>
        <Grid item>
          <Button variant="outlined" size="small" onClick={handleAdd}>
            New Delete
          </Button>
        </Grid>
        <Grid item>
          <Button variant="outlined" size="small">
            VGM / Form13 Info
          </Button>
        </Grid>
      </Grid>

      {/* Packing Details Section */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Packing Details
        </Typography>
        {/* Add packing details component here */}
      </Box>
    </Box>
  );
};

export default ContainerTab;
