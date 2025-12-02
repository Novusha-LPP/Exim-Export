import React, { useState } from "react";
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
} from "@mui/material";
import ESanchitEditDialog from "./ESanchitEditDialog";
const ESanchitTab = ({ formik }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleNew = () => {
    setSelectedDoc(null);
    setEditMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (doc, idx) => {
    setSelectedDoc({ ...doc, _index: idx });
    setEditMode(true);
    setIsDialogOpen(true);
  };

  const handleSave = (updatedDoc) => {
    const documents = [...(formik.values.eSanchitDocuments || [])];
    if (editMode && selectedDoc._index !== undefined) {
      documents[selectedDoc._index] = updatedDoc;
    } else {
      documents.push(updatedDoc);
    }
    formik.setFieldValue("eSanchitDocuments", documents);
    setIsDialogOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        eSanchit Documents
      </Typography>
      <Card sx={{ p: 2 }}>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Doc. Level</TableCell>
                <TableCell>Inv. Sr. No.</TableCell>
                <TableCell>Item Sr. No.</TableCell>
                <TableCell>Doc. IRN</TableCell>
                <TableCell>Doc. Type</TableCell>
                <TableCell>Doc. Ref. No.</TableCell>
                <TableCell>ICEGATE ID</TableCell>
                <TableCell>Doc. Issue Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(formik.values.eSanchitDocuments || []).map((doc, idx) => (
                <TableRow
                  key={idx}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleEdit(doc, idx)}
                >
                  <TableCell>{doc.documentLevel || "Invoice"}</TableCell>
                  <TableCell>{doc.invSerialNo}</TableCell>
                  <TableCell>{doc.itemSerialNo}</TableCell>
                  <TableCell>{doc.irn}</TableCell>
                  <TableCell>{doc.documentType}</TableCell>
                  <TableCell>{doc.documentReferenceNo}</TableCell>
                  <TableCell>{doc.otherIcegateId}</TableCell>
                  <TableCell>
                    {doc.dateOfIssue
                      ? new Date(doc.dateOfIssue).toLocaleDateString()
                      : ""}
                  </TableCell>
                  <TableCell>
                    <Button variant="text" onClick={() => handleEdit(doc, idx)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
          <Button variant="contained" onClick={handleNew}>
            New
          </Button>
        </Box>
      </Card>

      {/* Edit Dialog */}
      {isDialogOpen && (
        <ESanchitEditDialog
          open={isDialogOpen}
          doc={selectedDoc}
          setDoc={setSelectedDoc}
          onClose={() => setIsDialogOpen(false)}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};

export default ESanchitTab;
