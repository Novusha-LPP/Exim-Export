import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../contexts/UserContext";

function useFetchJobList(
  detailedStatus,
  selectedYearState,
  status,
  selectedICD,
  searchQuery,
  selectedImporter,
  unresolvedOnly = false // NEW: unresolvedOnly toggle
) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userImporters, setUserImporters] = useState([]);
  const { user } = useContext(UserContext);

  // Accept unresolvedOnly as an argument to fetchJobs
  const fetchJobs = async (page, unresolved = unresolvedOnly) => {
    setLoading(true);
    try {
      // Validate if user can access the selected importer
      if (
        user &&
        user.role !== "Admin" &&
        selectedImporter &&
        selectedImporter.toLowerCase() !== "select importer"
      ) {
        const userAssignedImporters = user.assigned_importer_name || [];
        const hasAllAccess = userAssignedImporters.some(
          (imp) => imp.toUpperCase() === "ALL"
        );

        if (!hasAllAccess) {
          const canAccessImporter = userAssignedImporters.some(
            (imp) => imp.toLowerCase() === selectedImporter.toLowerCase()
          );

          if (!canAccessImporter) {
            console.warn(
              `User ${user.username} cannot access importer: ${selectedImporter}`
            );
            // Still proceed with API call - let backend handle the filtering
          }
        }
      }

      // Properly encode importer
      const formattedImporter =
        selectedImporter && selectedImporter.toLowerCase() !== "select importer"
          ? encodeURIComponent(selectedImporter)
          : "all";

      // Properly encode search query
      const formattedSearchQuery = searchQuery
        ? encodeURIComponent(searchQuery)
        : "";

      // Construct API URL
      let apiUrl = `${
        import.meta.env.VITE_API_STRING
      }/${selectedYearState}/jobs/${status}/${detailedStatus}/${selectedICD}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}`;
      if (unresolved) {
        apiUrl += `&unresolvedOnly=true`;
      }

      const response = await axios.get(apiUrl, {
        headers: {
          ...(user?.username ? { "x-username": user.username } : {}),
        },
      });

      const {
        data,
        total,
        totalPages,
        currentPage,
        userImporters: responseUserImporters,
      } = response.data;
      setRows(data);
      setTotal(total);
      setTotalPages(totalPages);
      setCurrentPage(currentPage);

      // Store user's allowed importers from response
      if (responseUserImporters) {
        setUserImporters(responseUserImporters);
      }
    } catch (error) {
      console.error("Error fetching job list:", error);
      if (error.response?.status === 404) {
        console.error("User not found");
      } else if (error.response?.status === 403) {
        console.error("Access denied");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearState && user) {
      fetchJobs(currentPage, unresolvedOnly);
    }
  }, [
    detailedStatus,
    selectedYearState,
    status,
    selectedICD,
    currentPage,
    searchQuery,
    selectedImporter,
    user, // Add user to dependencies
    unresolvedOnly, // Add unresolvedOnly to dependencies
  ]);

  const handlePageChange = (newPage) => setCurrentPage(newPage);

  // Helper function to check if user can access an importer
  const canAccessImporter = (importerName) => {
    if (!user || !importerName) return false;
    if (user.role === "Admin") return true;

    const userAssignedImporters = user.assigned_importer_name || [];
    const hasAllAccess = userAssignedImporters.some(
      (imp) => imp.toUpperCase() === "ALL"
    );

    if (hasAllAccess) return true;

    return userAssignedImporters.some(
      (imp) => imp.toLowerCase() === importerName.toLowerCase()
    );
  };

  return {
    rows,
    setRows,
    total,
    totalPages,
    currentPage,
    loading,
    handlePageChange,
    fetchJobs,
    userImporters, // Available importers for current user
    canAccessImporter, // Helper function to check access
  };
}

export default useFetchJobList;
