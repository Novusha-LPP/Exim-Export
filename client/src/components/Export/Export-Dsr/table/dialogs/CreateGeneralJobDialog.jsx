import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  InputLabel,
  Autocomplete,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const CreateGeneralJobDialog = ({
  open,
  generalJobModalOpen,
  onClose,
  setGeneralJobModalOpen,
  generalJobForm = {},
  setGeneralJobForm = () => {},
  organizations = [],
  isDirectoriesLoading = false,
  directoryRef,
  handleDirectorySelect = () => {},
  handleGeneralJobSubmit = () => {},
  loading = false,
}) => {
  const isOpen = open !== undefined ? Boolean(open) : Boolean(generalJobModalOpen);
  const handleClose = onClose || (() => {
    if (setGeneralJobModalOpen) setGeneralJobModalOpen(false);
  });

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: { borderRadius: '12px', padding: '8px', overflow: 'visible' }
      }}
    >
      <DialogTitle style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', fontSize: '16px', color: '#1e293b' }}>
        CREATE GENERAL JOB
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers style={{ overflow: 'visible' }}>
        <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box ref={directoryRef}>
            <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>EXPORTER NAME *</InputLabel>
            <Autocomplete
              options={organizations}
              getOptionLabel={(option) => typeof option === 'string' ? option : (option.organization || "")}
              loading={isDirectoriesLoading}
              freeSolo
              value={generalJobForm?.exporter || ""}
              disablePortal
              PopperProps={{
                style: { zIndex: 10001 }
              }}
              onInputChange={(event, newInputValue) => {
                setGeneralJobForm(prev => ({ ...prev, exporter: newInputValue.toUpperCase() }));
              }}
              onChange={(event, value) => {
                if (typeof value === 'object' && value !== null) {
                  handleDirectorySelect(value);
                } else if (typeof value === 'string') {
                  setGeneralJobForm(prev => ({ ...prev, exporter: value.toUpperCase() }));
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search from directory or type name..."
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    style: { fontSize: '13px', fontWeight: '600' }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <MenuItem {...props} key={option._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px' }}>
                  <div style={{ fontWeight: '700', fontSize: '12px', color: '#1e293b' }}>{option.organization.toUpperCase()}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {option.registrationDetails?.panNo && `PAN: ${option.registrationDetails.panNo}`}
                    {option.registrationDetails?.ieCode && ` | IE: ${option.registrationDetails.ieCode}`}
                  </div>
                </MenuItem>
              )}
            />
          </Box>

          <Box>
            <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>EXPORTER ADDRESS</InputLabel>
            <TextField
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              size="small"
              value={generalJobForm?.exporter_address || ""}
              onChange={(e) => setGeneralJobForm(prev => ({ ...prev, exporter_address: e.target.value.toUpperCase() }))}
              inputProps={{ style: { fontSize: '12px', fontWeight: '600' } }}
            />
          </Box>

          <Box style={{ display: 'flex', gap: '15px' }}>
            <Box style={{ flex: 1 }}>
              <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>GST NO</InputLabel>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={generalJobForm?.gstin || ""}
                onChange={(e) => setGeneralJobForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                inputProps={{ style: { fontSize: '12px', fontWeight: '600' } }}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <InputLabel style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>PAN NO</InputLabel>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={generalJobForm?.panNo || ""}
                onChange={(e) => setGeneralJobForm(prev => ({ ...prev, panNo: e.target.value.toUpperCase() }))}
                inputProps={{ style: { fontSize: '12px', fontWeight: '600' } }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
        <Button
          onClick={handleClose}
          style={{ color: '#64748b', fontWeight: '700', fontSize: '12px' }}
        >
          CANCEL
        </Button>
        <Button
          onClick={handleGeneralJobSubmit}
          variant="contained"
          disabled={loading || !generalJobForm?.exporter}
          style={{
            backgroundColor: '#2563eb',
            color: '#fff',
            borderRadius: '8px',
            fontWeight: '800',
            fontSize: '12px',
            padding: '8px 24px',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
          }}
        >
          {loading ? <CircularProgress size={16} color="inherit" /> : "CREATE JOB"}
        </Button>
      </div>
    </Dialog>
  );
};

export default CreateGeneralJobDialog;
