import React, { useState, useEffect } from "react";
import { 
  Table, TextField, InputAdornment, Box, Paper, Typography, 
  Breadcrumbs, Link, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Snackbar, Alert, CircularProgress, IconButton,
  TableBody, TableCell, TableHead, TableRow, Accordion,
  AccordionSummary, AccordionDetails, Divider, Pagination
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const GeneralOrgDirectory = () => {
  const [generalOrgs, setGeneralOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    active: "Yes",
    tds_percent: 0,
    contacts: [],
    credit_terms: "",
    cin: "",
    branches: []
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

  const navigate = useNavigate();

  useEffect(() => {
    fetchGeneralOrgs();
  }, [page, searchTerm]);

  const addBranch = () => {
    setFormData({
      ...formData,
      branches: [
        ...formData.branches,
        {
          branch_no: formData.branches.length === 0 ? "0" : "",
          branchName: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
          country: "",
          gst: "",
          pan: "",
          accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
        }
      ]
    });
  };

  const removeBranch = (index) => {
    const branch = formData.branches[index];
    setConfirmDialog({
      open: true,
      title: "Delete Branch",
      message: branch._id 
        ? "Are you sure you want to delete this branch? This will be immediately removed from the database." 
        : "Are you sure you want to delete this branch?",
      onConfirm: async () => {
        if (branch._id && editingId) {
          try {
            await axios.delete(`${import.meta.env.VITE_API_STRING}/delete-general-org/${editingId}/branch/${branch._id}`);
            handleSnackbar("Branch deleted from database successfully", "success");
            fetchGeneralOrgs(); // Refresh the main list
            
            // Also update local state to reflect change immediately in Dialog
            const updatedBranches = [...formData.branches];
            updatedBranches.splice(index, 1);
            setFormData({ ...formData, branches: updatedBranches });
          } catch (error) {
            handleSnackbar("Failed to delete branch from database", "error");
          }
        } else {
          // New branch not yet in DB, just remove locally
          const updatedBranches = [...formData.branches];
          updatedBranches.splice(index, 1);
          setFormData({ ...formData, branches: updatedBranches });
        }
      }
    });
  };

  const handleBranchChange = (index, field, value) => {
    const updatedBranches = [...formData.branches];
    const processedValue = typeof value === 'string' ? value.toUpperCase() : value;
    updatedBranches[index][field] = processedValue;
    setFormData({ ...formData, branches: updatedBranches });
  };

  const handleAccountChange = (branchIndex, accountIndex, field, value) => {
    const updatedBranches = [...formData.branches];
    updatedBranches[branchIndex].accounts[accountIndex][field] = value.toUpperCase();
    setFormData({ ...formData, branches: updatedBranches });
  };

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [
        ...formData.contacts,
        { name: "", email: "", phone: "" }
      ]
    });
  };

  const removeContact = (index) => {
    const updatedContacts = [...formData.contacts];
    updatedContacts.splice(index, 1);
    setFormData({ ...formData, contacts: updatedContacts });
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...formData.contacts];
    let processedValue = value;
    if (field === 'name') processedValue = value.toUpperCase();
    if (field === 'email') processedValue = value.toLowerCase();
    
    updatedContacts[index][field] = processedValue;
    setFormData({ ...formData, contacts: updatedContacts });
  };

  const addAccount = (branchIndex) => {
    const updatedBranches = [...formData.branches];
    updatedBranches[branchIndex].accounts = [
      ...(updatedBranches[branchIndex].accounts || []),
      { bankName: "", accountNo: "", ifsc: "", adCode: "" }
    ];
    setFormData({ ...formData, branches: updatedBranches });
  };

  const removeAccount = (branchIndex, accountIndex) => {
    const branch = formData.branches[branchIndex];
    const account = branch.accounts[accountIndex];
    
    setConfirmDialog({
      open: true,
      title: "Delete Bank Account",
      message: account._id && branch._id 
        ? "Are you sure you want to delete this bank account? This will be immediately removed from the database." 
        : "Are you sure you want to delete this bank account?",
      onConfirm: async () => {
        if (account._id && branch._id && editingId) {
          try {
            await axios.delete(`${import.meta.env.VITE_API_STRING}/delete-general-org/${editingId}/branch/${branch._id}/account/${account._id}`);
            handleSnackbar("Bank account deleted from database successfully", "success");
            fetchGeneralOrgs();
            
            // Update local state
            const updatedBranches = [...formData.branches];
            updatedBranches[branchIndex].accounts.splice(accountIndex, 1);
            setFormData({ ...formData, branches: updatedBranches });
          } catch (error) {
            handleSnackbar("Failed to delete bank account from database", "error");
          }
        } else {
          // New account or branch, remove locally
          const updatedBranches = [...formData.branches];
          updatedBranches[branchIndex].accounts.splice(accountIndex, 1);
          setFormData({ ...formData, branches: updatedBranches });
        }
      }
    });
  };

  const fetchGeneralOrgs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_STRING}/get-general-orgs`, {
        params: {
          page,
          limit: 10,
          search: searchTerm
        }
      });
      setGeneralOrgs(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRecords(res.data.pagination?.totalRecords || 0);
    } catch (error) {
      console.error("Error fetching general orgs:", error);
      handleSnackbar("Failed to fetch general orgs", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      handleSnackbar("Name is required", "warning");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_STRING}/update-general-org/${editingId}`, formData);
        handleSnackbar("General Org updated successfully", "success");
      } else {
        await axios.post(`${import.meta.env.VITE_API_STRING}/add-general-org`, formData);
        handleSnackbar("General Org added successfully", "success");
      }
      handleClose();
      fetchGeneralOrgs();
    } catch (error) {
      handleSnackbar(error.response?.data?.message || "Failed to save general org", "error");
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      open: true,
      title: "Delete General Org",
      message: "Are you sure you want to delete this general org? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.delete(`${import.meta.env.VITE_API_STRING}/delete-general-org/${id}`);
          handleSnackbar("General Org deleted successfully", "success");
          fetchGeneralOrgs();
        } catch (error) {
          handleSnackbar("Failed to delete general org", "error");
        }
      }
    });
  };

  const handleEdit = (line) => {
    setEditingId(line._id);
    setFormData({
      name: line.name,
      active: line.active || "Yes",
      tds_percent: line.tds_percent || 0,
      contacts: line.contacts || [],
      credit_terms: line.credit_terms || "",
      cin: line.cin || "",
      branches: (line.branches || []).map(b => ({
        ...b,
        accounts: b.accounts && b.accounts.length > 0 
          ? b.accounts 
          : [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
      }))
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      active: "Yes",
      tds_percent: 0,
      contacts: [],
      credit_terms: "",
      cin: "",
      branches: [{
        branch_no: "0",
        branchName: "Main Branch",
        address: "",
        city: "",
        state: "",
        pincode: "",
        country: "",
        gst: "",
        pan: "",
        accounts: [{ bankName: "", accountNo: "", ifsc: "", adCode: "" }]
      }]
    });
  };

  const handleSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by name, GST or PAN..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          sx={{ width: 350 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Add General Org
        </Button>
      </Paper>

      <Paper sx={{ width: "100%", overflow: "auto" }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Branches</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Main Branch (GST/PAN)</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Address (Branch 0)</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Active</TableCell>
                <TableCell sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>TDS %</TableCell>
                <TableCell align="center" sx={{ background: "#f5f5f5", fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {generalOrgs.map((line, index) => (
                <TableRow key={index} hover sx={{ '& td': { py: 1 } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{line.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {line.branches?.length || 0} Branch(es)
                    </Typography>
                    {line.branches?.length > 0 && (
                      <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
                        {line.branches?.map(b => `${b.branch_no || ""}: ${b.branchName}`).join(", ")}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block" sx={{ fontSize: '11px', fontWeight: 500, lineHeight: 1.2 }}>
                      GST: {line.branches?.[0]?.gst || "N/A"}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ fontSize: '11px', fontWeight: 500, lineHeight: 1.2 }}>
                      PAN: {line.branches?.[0]?.pan || "N/A"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 350 }}>
                    <Typography variant="body2" sx={{ fontSize: '12px', lineHeight: 1.3 }}>
                      {line.branches?.[0]?.address || "-"}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '11px', display: 'block', lineHeight: 1.2 }}>
                      {line.branches?.[0]?.city ? `${line.branches[0].city}, ` : ""}
                      {line.branches?.[0]?.state ? `${line.branches[0].state}, ` : ""}
                      {line.branches?.[0]?.country} {line.branches?.[0]?.pincode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{line.active}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{line.tds_percent || 0}%</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit(line)} color="primary" sx={{ p: 0.5 }}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(line._id)} color="error" sx={{ p: 0.5 }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {generalOrgs.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ p: 4 }}>
                      No general orgs found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Box display="flex" justifyContent="center" alignItems="center" mt={2} mb={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(event, value) => setPage(value)}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>

      {/* Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingId ? "Edit General Org" : "Add New General Org"}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="General Org Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            />
            <TextField
              select
              label="Active"
              SelectProps={{ native: true }}
              value={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.value })}
            >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </TextField>
            <TextField
              fullWidth
              label="TDS %"
              type="number"
              value={formData.tds_percent}
              onChange={(e) => setFormData({ ...formData, tds_percent: parseFloat(e.target.value) || 0 })}
            />
            <TextField
              fullWidth
              label="Credit Terms"
              placeholder="e.g. 30 DAYS"
              value={formData.credit_terms}
              onChange={(e) => setFormData({ ...formData, credit_terms: e.target.value.toUpperCase() })}
            />
            <TextField
              fullWidth
              label="CIN No"
              placeholder="Corporate Identification Number"
              value={formData.cin}
              onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
            />

            <Box sx={{ gridColumn: 'span 2', mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="primary" /> Contact Persons ({formData.contacts.length})
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addContact}>
                        Add Contact
                    </Button>
                </Box>
                
                {formData.contacts.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                        No contact persons added yet. Click "Add Contact" to include details.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                        {formData.contacts.map((contact, idx) => (
                            <Box key={idx} sx={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr 1fr auto', 
                                gap: 2, 
                                p: 2, 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 1,
                                alignItems: 'center',
                                position: 'relative'
                            }}>
                                <TextField 
                                    label="Person Name" 
                                    fullWidth 
                                    size="small"
                                    value={contact.name} 
                                    onChange={(e) => handleContactChange(idx, "name", e.target.value)} 
                                />
                                <TextField 
                                    label="Email Address" 
                                    fullWidth 
                                    size="small"
                                    value={contact.email} 
                                    onChange={(e) => handleContactChange(idx, "email", e.target.value)} 
                                />
                                <TextField 
                                    label="Contact Number" 
                                    fullWidth 
                                    size="small"
                                    value={contact.phone} 
                                    onChange={(e) => handleContactChange(idx, "phone", e.target.value)} 
                                />
                                <IconButton color="error" onClick={() => removeContact(idx)}>
                                    <RemoveCircleOutlineIcon />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            <Box sx={{ gridColumn: 'span 2', mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" /> Manage Branches ({formData.branches.length})
              </Typography>
              
              {formData.branches.map((branch, index) => (
                <Accordion key={index} elevation={0} sx={{ border: '1px solid #e0e0e0', mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {branch.branch_no ? `${branch.branch_no}: ` : ""}{branch.branchName || `Branch ${index + 1}`} 
                      {branch.city ? ` - ${branch.city}` : ""}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, position: 'relative' }}>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => removeBranch(index)}
                        sx={{ position: 'absolute', right: -10, top: -45 }}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                      
                      <TextField 
                        label="Branch No" 
                        fullWidth 
                        size="small"
                        value={branch.branch_no} 
                        onChange={(e) => handleBranchChange(index, "branch_no", e.target.value)} 
                      />
                      <TextField 
                        label="Branch Name" 
                        fullWidth 
                        size="small"
                        value={branch.branchName} 
                        onChange={(e) => handleBranchChange(index, "branchName", e.target.value)} 
                      />
                      <TextField 
                        label="GST" 
                        fullWidth 
                        size="small"
                        value={branch.gst} 
                        onChange={(e) => handleBranchChange(index, "gst", e.target.value.toUpperCase())} 
                      />
                      <TextField 
                        label="Address" 
                        fullWidth 
                        size="small"
                        multiline
                        rows={2}
                        value={branch.address} 
                        onChange={(e) => handleBranchChange(index, "address", e.target.value)} 
                        sx={{ gridColumn: 'span 2' }}
                      />
                      <TextField 
                        label="City" 
                        fullWidth 
                        size="small"
                        value={branch.city} 
                        onChange={(e) => handleBranchChange(index, "city", e.target.value)} 
                      />
                      <TextField 
                        label="State" 
                        fullWidth 
                        size="small"
                        value={branch.state} 
                        onChange={(e) => handleBranchChange(index, "state", e.target.value)} 
                      />
                      <TextField 
                        label="Pincode" 
                        fullWidth 
                        size="small"
                        value={branch.pincode} 
                        onChange={(e) => handleBranchChange(index, "pincode", e.target.value)} 
                      />
                      <TextField 
                        label="Country" 
                        fullWidth 
                        size="small"
                        value={branch.country} 
                        onChange={(e) => handleBranchChange(index, "country", e.target.value)} 
                      />
                      <TextField 
                        label="PAN Card" 
                        fullWidth 
                        size="small"
                        value={branch.pan} 
                        onChange={(e) => handleBranchChange(index, "pan", e.target.value.toUpperCase())} 
                      />
                      <Box sx={{ gridColumn: 'span 2', mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" color="primary">Account Information</Typography>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => addAccount(index)}>Add Account</Button>
                        </Box>
                        {branch.accounts?.map((account, accIdx) => (
                            <Box key={accIdx} sx={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: 2, 
                                mb: 2, 
                                p: 1.5, 
                                border: '1px dashed #ccc',
                                borderRadius: 1,
                                position: 'relative'
                            }}>
                                {branch.accounts.length > 1 && (
                                    <IconButton size="small" color="error" sx={{ position: 'absolute', right: 0, top: 0 }} onClick={() => removeAccount(index, accIdx)}>
                                        <RemoveCircleOutlineIcon fontSize="small" />
                                    </IconButton>
                                )}
                                <TextField 
                                    label="Bank Name" 
                                    fullWidth 
                                    size="small"
                                    value={account.bankName} 
                                    onChange={(e) => handleAccountChange(index, accIdx, "bankName", e.target.value)} 
                                />
                                <TextField 
                                    label="Account No" 
                                    fullWidth 
                                    size="small"
                                    value={account.accountNo} 
                                    onChange={(e) => handleAccountChange(index, accIdx, "accountNo", e.target.value)} 
                                />
                                <TextField 
                                    label="IFSC Code" 
                                    fullWidth 
                                    size="small"
                                    value={account.ifsc} 
                                    onChange={(e) => handleAccountChange(index, accIdx, "ifsc", e.target.value)} 
                                />
                                <TextField 
                                    label="AD Code" 
                                    fullWidth 
                                    size="small"
                                    value={account.adCode} 
                                    onChange={(e) => handleAccountChange(index, accIdx, "adCode", e.target.value)} 
                                />
                            </Box>
                        ))}
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
              
              <Button 
                startIcon={<AddIcon />} 
                variant="outlined" 
                fullWidth 
                onClick={addBranch}
                sx={{ mt: 1 }}
              >
                Add New Branch
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">{editingId ? "Update" : "Add"}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancel</Button>
          <Button 
            onClick={() => {
              confirmDialog.onConfirm();
              setConfirmDialog({ ...confirmDialog, open: false });
            }} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GeneralOrgDirectory;
