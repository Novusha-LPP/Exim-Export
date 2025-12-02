import React, { useState } from "react";
import { Box, Typography, TextField, Paper, MenuItem } from "@mui/material";
import { viewMasterList } from "./DirectoriesData.js";
import DirectoryComponent from "./DirectoryComponent";

function Directories() {
  const [selectedDirectory, setSelectedDirectory] = useState("");

  const handleDirectoryChange = (event) => {
    console.log("Selected value:", event.target.value);
    setSelectedDirectory(event.target.value);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
        Directory Management
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          select
          size="small"
          label="Select Directory"
          value={selectedDirectory}
          onChange={handleDirectoryChange}
          sx={{ minWidth: 250 }}
        >
          {viewMasterList.map((dir) => (
            <MenuItem key={dir} value={dir}>
              {dir}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {selectedDirectory && (
        <DirectoryComponent directoryType={selectedDirectory} />
      )}
    </Box>
  );
}

export default React.memo(Directories);
