import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle style={{ background: '#f4f6f9', borderBottom: '1px solid #dfe5ec', fontSize: '16px', fontWeight: 'bold' }}>
        {title}
      </DialogTitle>
      <DialogContent style={{ padding: '20px' }}>
        <Typography variant="body2" style={{ color: '#333' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions style={{ background: '#f4f6f9', borderTop: '1px solid #dfe5ec', padding: '10px 15px' }}>
        <Button onClick={onCancel} style={{ color: '#666', fontSize: '12px' }}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" style={{ fontSize: '12px', background: '#d32f2f' }}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
