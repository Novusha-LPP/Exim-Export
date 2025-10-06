import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  TextField,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import { importerOptions } from "../../MasterLists/MasterLists"; // Import importerOptions

function ExecutiveRoleModal({
  open,
  onClose,
  initialSelectedImporters = [],
  onSave,
  userDetails,
}) {
  const [selectedOptions, setSelectedOptions] = useState([]);

  // Transform importerOptions into objects with { id, name } for compatibility
  const transformedImporterOptions = importerOptions.map((name, index) => ({
    id: index + 1,
    name,
  }));

  // When the modal opens, set selectedOptions with matching transformed objects
  useEffect(() => {
    if (open) {
      const formattedImporters = initialSelectedImporters.map(
        (importerName) => {
          const match = transformedImporterOptions.find(
            (option) => option.name === importerName
          );
          return match || { id: null, name: importerName };
        }
      );
      setSelectedOptions(formattedImporters);
    }
  }, [open, initialSelectedImporters, transformedImporterOptions]);

  // Handle selection changes in Autocomplete
  const handleSelect = (event, value) => {
    setSelectedOptions(value);
  };

  // Save selected importers
  const handleSave = async () => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_STRING}/users/${
          userDetails?._id
        }/importers`,
        { importers: selectedOptions.map((option) => option.name) }
      );
      onSave(selectedOptions.map((option) => option.name)); // Pass names back to parent
      onClose();
    } catch (error) {
      console.error("Error saving importers:", error);
      alert("Failed to assign importers. Please try again.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {userDetails?.role || "Unknown Role"} Role - Assign Importers for{" "}
        {userDetails?.username || "Unknown User"}
      </DialogTitle>
      <DialogContent>
        {userDetails && (
          <div style={{ marginBottom: "20px" }}>
            <Typography variant="body1">
              <strong>Name:</strong> {userDetails?.username || "N/A"}
            </Typography>
            <Typography variant="body1">
              <strong>Role:</strong> {userDetails?.role || "N/A"}
            </Typography>
            <Typography variant="body1">
              <strong>Importers Count:</strong>{" "}
              {userDetails?.assigned_importer_name?.length || 0}
            </Typography>
          </div>
        )}

        <Autocomplete
          multiple
          options={transformedImporterOptions}
          getOptionLabel={(option) => option.name}
          value={selectedOptions}
          isOptionEqualToValue={(option, value) => option.name === value.name}
          onChange={handleSelect}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Importers"
              variant="outlined"
            />
          )}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox checked={selected} style={{ marginRight: 8 }} />
              {option.name}
            </li>
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExecutiveRoleModal;
