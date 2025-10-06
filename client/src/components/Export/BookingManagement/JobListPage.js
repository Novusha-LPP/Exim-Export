import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
} from "@mui/material";
import { ChevronRight } from "@mui/icons-material";
import axios from "axios";
import BookingManagement from "./BookingManagement"; // Adjust path as needed

const JobsListPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedJobNo, setSelectedJobNo] = useState(null);

  console.log("Selected Job No in JobListPage:", selectedJobNo); // Debugging line

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/exports`,
        {
          // params: { page: page + 1, limit: rowsPerPage }
        }
      );
      if (response.data.success) {
        setJobs(response.data.data.jobs);
        setTotalCount(response.data.data.pagination.totalCount);
      }
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, rowsPerPage]);

  const handleRowClick = (jobNo) => {
    setSelectedJobNo(jobNo);
  };

  if (selectedJobNo) {
    // Render BookingManagement passing the selected jobNo
    return (
      <BookingManagement
        jobNumber={selectedJobNo}
        onBack={() => setSelectedJobNo(null)}
      />
    );
  }

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Export Jobs
      </Typography>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Job Number</TableCell>
                <TableCell>Exporter Name</TableCell>
                <TableCell>Consignee Name</TableCell>
                <TableCell align="center">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow hover key={job._id} sx={{ cursor: "pointer" }}>
                  <TableCell>{job.job_no}</TableCell>
                  <TableCell>{job.exporter_name}</TableCell>
                  <TableCell>{job.consignee_name}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Open Booking Management">
                      <IconButton
                        onClick={() => handleRowClick(job.job_no)}
                        size="small"
                        color="primary"
                      >
                        <ChevronRight />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No export jobs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};

export default JobsListPage;
