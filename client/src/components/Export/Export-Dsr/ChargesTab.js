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
  Dialog,
  Tabs,
  Tab
} from "@mui/material";
import ChargeEditDialog from "./ChargeEditDialog";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const ChargesTab = ({ formik, directories, params }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const charges = formik.values.charges || [];

  const handleNewCharge = () => {
    setSelectedCharge({
      chargeHead: "",
      category: "Margin",
      costCenter: "CCL EXP",
      remark: "",
      revenue: {
        basis: "Per S/B",
        qtyUnit: 0,
        rate: 0,
        amount: 0,
        amountINR: 0,
        curr: "INR",
        ovrd: false,
        paid: false
      },
      cost: {
        basis: "Per S/B",
        qtyUnit: 0,
        rate: 0,
        amount: 0,
        amountINR: 0,
        curr: "INR",
        ovrd: false,
        paid: false
      },
      chargeDescription: "",
      overrideAutoRate: false,
      receivableType: "Customer",
      receivableFrom: "",
      receivableFromBranchCode: "",
      copyToCost: false,
      quotationNo: ""
    });
    setEditMode(false);
    setIsFormOpen(true);
  };

  const handleEditCharge = (charge, index) => {
    setSelectedCharge({ ...charge, _index: index });
    setEditMode(true);
    setIsFormOpen(true);
  };

  const handleDeleteCharge = (index) => {
    const updatedCharges = [...charges];
    updatedCharges.splice(index, 1);
    formik.setFieldValue('charges', updatedCharges);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Charges
      </Typography>
      
      <Card sx={{ p: 2 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)}>
            <Tab label="Charge" />
            <Tab label="Profit & Loss" />
            <Tab label="Charges Log" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Quotation No: _______________
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell><strong>Charge Head</strong></TableCell>
                  <TableCell><strong>Revenue</strong></TableCell>
                  <TableCell><strong>Receivable</strong></TableCell>
                </TableRow>
                <TableRow sx={{ backgroundColor: "#e0e0e0" }}>
                  <TableCell><strong>Particulars</strong></TableCell>
                  <TableCell align="center"><strong>Amount</strong></TableCell>
                  <TableCell align="center"><strong>Curr | Basis</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {charges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      No charges found
                    </TableCell>
                  </TableRow>
                ) : (
                  charges.map((charge, index) => (
                    <TableRow 
                      key={index}
                      onClick={() => handleEditCharge(charge, index)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#f5f5f5' }
                      }}
                    >
                      <TableCell>{charge.chargeHead}</TableCell>
                      <TableCell align="center">
                        {charge.revenue?.amount || 0}
                      </TableCell>
                      <TableCell align="center">
                        {charge.revenue?.curr || 'INR'} | {charge.revenue?.basis || 'Per S/B'}
                      </TableCell>
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
              onClick={handleNewCharge}
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              New
            </Button>
            <Button 
              variant="outlined"
              size="small" 
              disabled={charges.length === 0}
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Edit
            </Button>
            <Button 
              variant="outlined"
              size="small" 
              color="error"
              disabled={charges.length === 0}
              onClick={() => handleDeleteCharge(charges.length - 1)}
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Delete
            </Button>
            <Button 
              variant="outlined"
              size="small" 
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Cost Sheet
            </Button>
            <Button 
              variant="outlined"
              size="small" 
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Book Purchase
            </Button>
            <Button 
              variant="outlined"
              size="small" 
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Customize Columns
            </Button>
            <Button 
              variant="outlined"
              size="small" 
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Init. from Quotation
            </Button>
            <Button 
              variant="outlined"
              size="small" 
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              Init Receivable From
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          <Typography>Profit & Loss content here</Typography>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          <Typography>Charges Log content here</Typography>
        </TabPanel>
      </Card>

      {/* Charge Edit Dialog */}
      <Dialog 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <ChargeEditDialog
          charge={selectedCharge}
          editMode={editMode}
          formik={formik}
          onClose={() => setIsFormOpen(false)}
          onSave={(updatedCharge) => {
            const updatedCharges = [...(formik.values.charges || [])];
            if (editMode && selectedCharge._index !== undefined) {
              updatedCharges[selectedCharge._index] = updatedCharge;
            } else {
              updatedCharges.push(updatedCharge);
            }
            formik.setFieldValue('charges', updatedCharges);
            setIsFormOpen(false);
          }}
        />
      </Dialog>
    </Box>
  );
};

export default ChargesTab;
