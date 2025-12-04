import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
} from "@mui/material";

const ConfirmDialog = ({
  open,
  handleClose,
  handleConfirm,
  message,
  isEdit = false, // Flag to determine edit mode
  editValues = {},
  onEditChange = () => {},
  readOnly = false, // New prop to make it read-only
}) => (
  <Dialog
    open={open}
    onClose={handleClose}
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-description"
  >
    <DialogTitle id="confirm-dialog-title">
      {isEdit ? "Edit Document" : "Confirm Action"}
    </DialogTitle>
    <DialogContent>
      {isEdit ? (
        <>
          <TextField
            fullWidth
            margin="dense"
            label="Document Name"
            value={editValues.document_name || ""}
            onChange={(e) =>
              onEditChange({ ...editValues, document_name: e.target.value })
            }
            variant="outlined"
            disabled={readOnly} // Disable field if readOnly
          />
          <TextField
            fullWidth
            margin="dense"
            label="Document Code"
            value={editValues.document_code || ""}
            onChange={(e) =>
              onEditChange({ ...editValues, document_code: e.target.value })
            }
            variant="outlined"
            disabled={readOnly} // Disable field if readOnly
          />
        </>
      ) : (
        message
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose} color="primary">
        Cancel
      </Button>
      <Button
        onClick={handleConfirm}
        color="primary"
        autoFocus
        disabled={readOnly}
      >
        {isEdit ? "Save" : "Confirm"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
