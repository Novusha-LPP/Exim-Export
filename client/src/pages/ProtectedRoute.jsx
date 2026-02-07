// components/ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { CircularProgress, Box } from "@mui/material";

const ProtectedRoute = ({ children, requiredModule, fallbackPath = "/" }) => {
  const [userModules, setUserModules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchUserModules = async () => {
      try {
        // Get current user info - adjust this based on how you store user info
        const user = JSON.parse(localStorage.getItem("exim_user") || "null");

        // If no user is stored, bail out and send to login
        if (!user || Object.keys(user).length === 0) {
          setError(true);
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/get-user/${user.username || user.id}`
        );

        // The user document stores permissions under the 'modules' key
        const modulesFromApi = response?.data?.modules || [];

        setUserModules(modulesFromApi);
      } catch (err) {
        console.error("Error fetching user modules:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserModules();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !userModules) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required module permission
  const hasPermission = userModules.includes(requiredModule);

  if (!hasPermission) {
    // Redirect to fallback path with a message
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{
          from: location,
          message: `Access denied. You don't have permission to access ${requiredModule}.`,
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
