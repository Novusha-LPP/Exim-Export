import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Autocomplete,
} from "@mui/material";
import AssignModule from "./AssignModule";
import AssignRole from "./AssignRole/AssignRole";
import ChangePasswordByAdmin from "./AssignRole/ChangePasswordByAdmin";
import SelectIcdCode from "./AssignRole/SelectIcdCode";
import AssignImporters from "./AssignImporters";

function Assign() {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [masterType, setMasterType] = useState("Assign Module");

  // New state to hold selected category tab - default 'Transport'
  const [category, setCategory] = useState("Transport");

  const handleMasterChange = (e) => {
    setMasterType(e.target.value);
  };

  const handleCategoryChange = (event, newValue) => {
    setCategory(newValue);
  };

  useEffect(() => {
    async function getUsers() {
      try {
        const res = await axios(
          `${import.meta.env.VITE_API_STRING}/get-all-users`
        );
        setUserList(res.data.map((user) => user.username));
      } catch (error) {
        console.error("Error fetching user list:", error);
      }
    }

    getUsers();
    // eslint-disable-next-line
  }, [selectedUser]);

  const masterComponent = () => {
    switch (masterType) {
      case "Assign Module":
        // Pass selected category as prop
        return <AssignModule selectedUser={selectedUser} category={category} />;
      case "Assign Role":
        return <AssignRole selectedUser={selectedUser} />;
      case "Change Password":
        return <ChangePasswordByAdmin selectedUser={selectedUser} />;
      case "Assign ICD Code":
        return <SelectIcdCode selectedUser={selectedUser} />;
      case "Assign Importers":
        return <AssignImporters selectedUser={selectedUser} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="flex-div"
        style={{ marginTop: "20px", marginBottom: "10px" }}
      >
        <div style={{ flex: 1 }}>
          <Autocomplete
            value={selectedUser}
            onChange={(event, newValue) => {
              setSelectedUser(newValue);
            }}
            options={userList}
            getOptionLabel={(option) => option}
            sx={{ width: 200, marginBottom: "20px" }}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Select User" />
            )}
          />
        </div>
        <TextField
          select
          size="small"
          label={!selectedUser ? "First select user" : "Select"}
          sx={{ width: "200px", marginBottom: "20px" }}
          value={masterType}
          onChange={handleMasterChange}
          disabled={!selectedUser}
        >
          <MenuItem value="Assign Module">Assign Module</MenuItem>
          <MenuItem value="Assign Role">Assign Role</MenuItem>
          <MenuItem value="Change Password">Change Password</MenuItem>
          <MenuItem value="Assign ICD Code">Assign ICD Code</MenuItem>
          <MenuItem value="Assign Importers">Assign Importers</MenuItem>
        </TextField>
      </div>

      {/* Only show category tabs when 'Assign Module' is active */}
      {masterType === "Assign Module" && (
        <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: 2 }}>
          <Tabs
            value={category}
            onChange={handleCategoryChange}
            aria-label="module category tabs"
          >
            <Tab label="Transport" value="Transport" />
            <Tab label="Export" value="Export" />
            <Tab label="Import" value="Import" />
          </Tabs>
        </Box>
      )}

      {masterComponent()}
    </>
  );
}

export default React.memo(Assign);
