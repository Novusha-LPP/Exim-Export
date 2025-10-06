// ContainerTab.jsx
import React, { useRef, useCallback } from "react";
import { 
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, TextField, MenuItem, Grid 
} from "@mui/material";

const containerTypes = [
  "20 Standard Dry", "40 Standard Dry", "40 High Cube", "20 Reefer", "40 Reefer"
];
const sealTypes = [
  "BTSL - Bottle", "WIRE", "PLASTIC", "METAL"
];

const ContainerTab = ({ formik }) => {
  const saveTimeoutRef = useRef(null);

  // Handle inline field change
  const handleFieldChange = (index, field, value) => {
    const containers = [...formik.values.containers];
    containers[index][field] = value;

    formik.setFieldValue('containers', containers);

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
        moveDocNo: "",
        location: "",
        grWtPlusTrWt: 0,
        sealDeviceId: "",
        rfid: ""
      }
    ];
    formik.setFieldValue('containers', containers);
  };

  const handleDelete = (idx) => {
    const containers = formik.values.containers.filter((_, i) => i !== idx);
    formik.setFieldValue('containers', containers);
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sr No</TableCell>
              <TableCell>Container No</TableCell>
              <TableCell>Seal No</TableCell>
              <TableCell>Seal Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Pkgs Stuffed</TableCell>
              <TableCell>Gross Weight</TableCell>
              <TableCell>Seal Type</TableCell>
              <TableCell>Move Doc. Type</TableCell>
              <TableCell>Move Doc. No</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Gr-Wt + Tr-Wt</TableCell>
              <TableCell>Seal Device ID</TableCell>
              <TableCell>RFID</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(formik.values.containers || []).map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.serialNumber}</TableCell>
                <TableCell>
                  <TextField 
                    value={row.containerNo}
                    onChange={e => handleFieldChange(idx, "containerNo", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField 
                    value={row.sealNo || ""}
                    onChange={e => handleFieldChange(idx, "sealNo", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField 
                    type="date"
                    value={row.sealDate ? row.sealDate.substr(0,10) : ""}
                    onChange={e => handleFieldChange(idx, "sealDate", e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={row.type}
                    onChange={e => handleFieldChange(idx, "type", e.target.value)}
                    size="small"
                  >
                    {containerTypes.map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.pkgsStuffed}
                    onChange={e => handleFieldChange(idx, "pkgsStuffed", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.grossWeight}
                    onChange={e => handleFieldChange(idx, "grossWeight", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    value={row.sealType}
                    onChange={e => handleFieldChange(idx, "sealType", e.target.value)}
                    size="small"
                  >
                    {sealTypes.map(opt => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell>
                  <TextField
                    value={row.moveDocType || ""}
                    onChange={e => handleFieldChange(idx, "moveDocType", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={row.moveDocNo || ""}
                    onChange={e => handleFieldChange(idx, "moveDocNo", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={row.location || ""}
                    onChange={e => handleFieldChange(idx, "location", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number" 
                    value={row.grWtPlusTrWt}
                    onChange={e => handleFieldChange(idx, "grWtPlusTrWt", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={row.sealDeviceId || ""}
                    onChange={e => handleFieldChange(idx, "sealDeviceId", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={row.rfid || ""}
                    onChange={e => handleFieldChange(idx, "rfid", e.target.value)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    color="error" 
                    size="small" 
                    onClick={() => handleDelete(idx)}
                  >Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Grid container spacing={1} sx={{ mt: 2 }}>
        <Grid item>
          <Button variant="outlined" size="small" onClick={handleAdd}>
            New
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContainerTab;
