import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
} from "@mui/material";

const AddDocumentDialog = ({
  open,
  handleClose,
  handleAdd,
  addValues = {},
  onAddChange = () => {},
}) => (
  <Dialog
    open={open}
    onClose={handleClose}
    aria-labelledby="add-document-dialog-title"
    aria-describedby="add-document-dialog-description"
  >
    <DialogTitle id="add-document-dialog-title">Add New Document</DialogTitle>
    <DialogContent>
      <TextField
        fullWidth
        margin="dense"
        label="Document Name"
        value={addValues.document_name || ""}
        onChange={(e) =>
          onAddChange({ ...addValues, document_name: e.target.value })
        }
        variant="outlined"
      />
      <TextField
        fullWidth
        margin="dense"
        label="Document Code"
        value={addValues.document_code || ""}
        onChange={(e) =>
          onAddChange({ ...addValues, document_code: e.target.value })
        }
        variant="outlined"
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose} color="primary">
        Cancel
      </Button>
      <Button onClick={handleAdd} color="primary" autoFocus>
        Add Document
      </Button>
    </DialogActions>
  </Dialog>
);

export default AddDocumentDialog;
