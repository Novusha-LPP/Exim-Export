import React, { useState, useContext } from "react";
import { uploadFileToS3 } from "../../../utils/awsFileUpload";
import { 
  Button, 
  CircularProgress, 
  Box, 
  Typography, 
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from "@mui/material";
import { 
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon
} from "@mui/icons-material";
import { UserContext } from "../../../contexts/UserContext";

const FileUpload = ({
  label,
  onFilesUploaded,
  bucketPath,
  multiple = true,
  acceptedFileTypes = [],
  readOnly = false,
  existingFiles = [],
  onFileDeleted
}) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(UserContext);

  const handleFileUpload = async (event) => {
    if (readOnly) return;

    const files = event.target.files;
    const uploadedFiles = [];

    setUploading(true);
    for (const file of files) {
      try {
        const result = await uploadFileToS3(file, bucketPath);
        uploadedFiles.push({
          url: result.Location,
          name: file.name,
          size: file.size,
          uploadedAt: new Date()
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }
    setUploading(false);
    onFilesUploaded(uploadedFiles);
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Button
          variant="outlined"
          component="label"
          size="small"
          startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
          disabled={readOnly || uploading}
          sx={{
            borderColor: '#2c5aa0',
            color: '#2c5aa0',
            '&:hover': {
              borderColor: '#1e3a6f',
              backgroundColor: 'rgba(44, 90, 160, 0.04)'
            }
          }}
        >
          {uploading ? 'Uploading...' : label}
          <input
            type="file"
            hidden
            multiple={multiple}
            accept={acceptedFileTypes.length ? acceptedFileTypes.join(",") : ""}
            onChange={handleFileUpload}
            disabled={readOnly || uploading}
          />
        </Button>
        
        {existingFiles.length > 0 && (
          <Chip 
            icon={<CheckIcon />} 
            label={`${existingFiles.length} file(s) uploaded`}
            color="success"
            size="small"
          />
        )}
      </Box>

      {existingFiles.length > 0 && (
        <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
          {existingFiles.map((file, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemText 
                primary={file.name || `File ${index + 1}`}
                secondary={file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : ''}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              {!readOnly && onFileDeleted && (
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    size="small"
                    onClick={() => onFileDeleted(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FileUpload;
