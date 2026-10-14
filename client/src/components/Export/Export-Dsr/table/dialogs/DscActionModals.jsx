import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Menu,
  MenuItem,
  ListSubheader,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export const DscPinModal = ({
  open,
  dscPinModalOpen,
  onClose,
  setDscPinModalOpen,
  dscPin,
  setDscPin,
  handleInitDsc,
  initDscLoading,
}) => {
  const isOpen = open !== undefined ? Boolean(open) : Boolean(dscPinModalOpen);
  const handleClose = onClose || (() => {
    if (setDscPinModalOpen) setDscPinModalOpen(false);
  });

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '16px', fontWeight: '600' }}>
        Initialize DSC Token
      </DialogTitle>
      <DialogContent style={{ padding: '24px' }}>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          The local Java Signer is running but the DSC token is not initialized. Please enter your DSC PIN to unlock the token.
        </p>
        <div className="form-group">
          <label>DSC PIN</label>
          <input
            type="password"
            className="form-control"
            value={dscPin || ""}
            onChange={(e) => setDscPin(e.target.value)}
            placeholder="Enter PIN (e.g. 12345678)"
          />
        </div>
      </DialogContent>
      <DialogActions style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={handleClose} style={{ color: '#64748b' }}>
          Cancel
        </Button>
        <Button
          onClick={handleInitDsc}
          disabled={initDscLoading}
          variant="contained"
          style={{ backgroundColor: '#9333ea', color: 'white', textTransform: 'none', fontWeight: '600' }}
        >
          {initDscLoading ? "Initializing..." : "Unlock DSC"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const DscSigningMenu = ({
  anchorEl,
  signAnchorEl,
  open,
  onClose,
  handleSignClose,
  handleSignFlatFile,
  handleSignESanchit,
  selectedSignJob,
}) => {
  const actualAnchor = anchorEl || signAnchorEl;
  const isOpen = open !== undefined ? Boolean(open) : Boolean(actualAnchor);
  const handleClose = onClose || handleSignClose || (() => {});

  return (
    <Menu
      anchorEl={actualAnchor}
      open={isOpen}
      onClose={handleClose}
      PaperProps={{
        style: {
          width: '180px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '4px 0'
        },
      }}
    >
      <ListSubheader style={{ lineHeight: '24px', backgroundColor: '#f8fafc', color: '#9333ea', fontWeight: '800', fontSize: '10px' }}>
        DSC SIGNING OPTIONS
      </ListSubheader>

      <MenuItem
        onClick={handleSignFlatFile}
        style={{ fontSize: '12px', fontWeight: '600', padding: '8px 16px' }}
      >
        <GavelIcon style={{ fontSize: 14, marginRight: 8, color: '#9333ea' }} />
        Sign Flat-file (.sb)
      </MenuItem>

      <MenuItem
        onClick={() => handleSignESanchit && handleSignESanchit()}
        disabled={!selectedSignJob?.eSanchitDocuments?.some(d => d.fileUrl)}
        style={{ fontSize: '12px', fontWeight: '600', padding: '8px 16px' }}
      >
        <CloudUploadIcon style={{ fontSize: 14, marginRight: 8, color: '#2563eb' }} />
        Sign e-Sanchit PDF
      </MenuItem>

      {selectedSignJob?.eSanchitDocuments?.filter(d => d.fileUrl).length > 1 && (
        <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 4, paddingTop: 4 }}>
          {selectedSignJob.eSanchitDocuments.filter(d => d.fileUrl).map((doc, i) => (
            <MenuItem
              key={i}
              onClick={() => handleSignESanchit && handleSignESanchit(doc)}
              style={{ fontSize: '10px', padding: '4px 20px', color: '#64748b' }}
            >
              └ {doc.icegateFileName || `Doc ${i + 1}`}
            </MenuItem>
          ))}
        </div>
      )}
    </Menu>
  );
};

const DscActionModals = (props) => (
  <>
    <DscPinModal {...props} />
    <DscSigningMenu {...props} />
  </>
);

export default DscActionModals;
