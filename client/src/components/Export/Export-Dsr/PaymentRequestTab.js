import React, { useState } from "react";
import {
  Grid,
  Card,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog
} from "@mui/material";
import PaymentRequestForm from "./PaymentRequestForm";

const PaymentRequestTab = ({ formik, directories, params }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const paymentRequests = formik.values.payment_requests || [];

  const handleNewRequest = () => {
    setSelectedRequest({
      date: new Date().toISOString().split('T')[0],
      no: `PR-${Date.now()}`,
      mode: "Electronic",
      payeeName: "",
      amount: 0,
      status: "Pending",
      remarks: "",
      payTo: "Vendor",
      against: "Expense",
      jobExpenses: true,
      nonJobExpenses: false,
      jobNo: formik.values.job_no || "",
      requestTo: "AHMEDABAD",
      referenceNo: "",
      modeOfPayment: "Cheque No.",
      markAsUrgent: false,
      narration: "",
      charges: [{
        chargeName: "EDI CHARGES",
        amountTC: 1.00,
        curr: "INR",
        amountHC: 1.00,
        payableTo: ""
      }],
      purchaseBills: [],
      totalAmount: 0
    });
    setEditMode(false);
    setIsFormOpen(true);
  };

  const handleEditRequest = (request, index) => {
    setSelectedRequest({ ...request, _index: index });
    setEditMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (index) => {
    const requests = [...paymentRequests];
    requests.splice(index, 1);
    formik.setFieldValue('payment_requests', requests);
  };

  const refreshRequests = () => {
    console.log("Refreshing payment requests...");
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Payment Request
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ p: 2 }}>
            {/* Action Buttons */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                size="small"
                onClick={refreshRequests}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Refresh
              </Button>
            </Box>
            
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>No.</strong></TableCell>
                    <TableCell><strong>Mode</strong></TableCell>
                    <TableCell><strong>PayeeName</strong></TableCell>
                    <TableCell><strong>Amount</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Remarks</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        No payment requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentRequests.map((request, index) => (
                      <TableRow 
                        key={index}
                        onClick={() => handleEditRequest(request, index)}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: '#f5f5f5' }
                        }}
                      >
                        <TableCell>{request.date}</TableCell>
                        <TableCell sx={{ color: 'blue', textDecoration: 'underline' }}>
                          {request.no}
                        </TableCell>
                        <TableCell>{request.mode}</TableCell>
                        <TableCell>{request.payeeName}</TableCell>
                        <TableCell>{request.amount}</TableCell>
                        <TableCell>{request.status}</TableCell>
                        <TableCell>{request.remarks}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Action Buttons */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button 
                variant="contained"
                size="small" 
                onClick={handleNewRequest}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                New
              </Button>
              <Button 
                variant="outlined"
                size="small" 
                color="error"
                disabled={paymentRequests.length === 0}
                onClick={() => handleDeleteRequest(paymentRequests.length - 1)}
                sx={{ fontSize: "0.75rem", textTransform: "none" }}
              >
                Delete
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Payment Request Form Dialog */}
      <Dialog 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <PaymentRequestForm
          request={selectedRequest}
          editMode={editMode}
          formik={formik}
          onClose={() => setIsFormOpen(false)}
          onSave={(updatedRequest) => {
            const requests = [...(formik.values.payment_requests || [])];
            if (editMode && selectedRequest._index !== undefined) {
              requests[selectedRequest._index] = updatedRequest;
            } else {
              requests.push(updatedRequest);
            }
            formik.setFieldValue('payment_requests', requests);
            setIsFormOpen(false);
          }}
        />
      </Dialog>
    </Box>
  );
};

export default PaymentRequestTab;
