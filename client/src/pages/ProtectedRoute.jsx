// components/ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { fetchUserWithCache } from "../utils/userCache.js";

const ProtectedRoute = ({ children, requiredModule, fallbackPath = "/" }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("exim_user") || "null");
    } catch {
      return null;
    }
  });

  const [userModules, setUserModules] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("exim_user") || "null");
      return Array.isArray(u?.modules) ? u.modules : null;
    } catch {
      return null;
    }
  });

  // If we already have user info and modules (or user is Admin), no need to block with loading
  const [loading, setLoading] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("exim_user") || "null");
      return !(u && (u.role === "Admin" || (Array.isArray(u.modules) && u.modules.length > 0)));
    } catch {
      return true;
    }
  });

  const location = useLocation();

  useEffect(() => {
    const fetchUserModules = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "null");

        if (!user || Object.keys(user).length === 0) {
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        // Fetch fresh module permissions from server in background
        const userData = await fetchUserWithCache(user.username || user.id);
        const modulesFromApi = userData?.modules || user.modules || [];

        setUserModules(modulesFromApi);
      } catch (err) {
        console.warn("Could not refresh user permissions from server, using cached session:", err);
        // Keep whatever modules were already loaded in localStorage
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

  // If user is truly not logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Admins always have access to all modules
  if (currentUser.role === "Admin") {
    return children;
  }

  // Check if user has the required module permission (supports string or array of allowed modules)
  const allowedModules = Array.isArray(requiredModule) ? requiredModule : [requiredModule];
  const currentModulesList = userModules || currentUser.modules || [];
  const hasPermission = allowedModules.some((mod) => currentModulesList.includes(mod));

  if (!hasPermission) {
    const moduleNames = allowedModules.join(" or ");
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{
          from: location,
          message: `Access denied. You don't have permission to access ${moduleNames}.`,
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
