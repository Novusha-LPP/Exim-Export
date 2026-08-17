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
  IconButton,
  Link,
  Tooltip
} from "@mui/material";
import { 
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Visibility as VisibilityIcon,
  OpenInNew as OpenInNewIcon,
  InsertDriveFile as FileIcon
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
  const resolvedAcceptedFileTypes = React.useMemo(() => {
    if (!acceptedFileTypes.length) return [];
    const uniqueTypes = new Set(
      acceptedFileTypes.map((type) => (typeof type === "string" ? type.trim().toLowerCase() : type)),
    );
    uniqueTypes.add(".mp4");
    uniqueTypes.add(".webm");
    uniqueTypes.add(".ogg");
    uniqueTypes.add(".mov");
    uniqueTypes.add(".avi");
    uniqueTypes.add(".mkv");
    uniqueTypes.add("video/*");
    return Array.from(uniqueTypes);
  }, [acceptedFileTypes]);

  const getFileUrl = (fileItem) => {
    if (!fileItem) return "";
    if (typeof fileItem === "string") return fileItem;
    return fileItem.url || fileItem.fileUrl || fileItem.location || fileItem.path || "";
  };

  const getFileName = (fileItem, defaultName = "Document") => {
    if (!fileItem) return defaultName;
    if (typeof fileItem === "string") {
      try {
        const parts = fileItem.split("/");
        return parts[parts.length - 1] || defaultName;
      } catch (e) {
        return defaultName;
      }
    }
    return fileItem.name || defaultName;
  };

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
            accept={resolvedAcceptedFileTypes.length ? resolvedAcceptedFileTypes.join(",") : ""}
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
          {existingFiles.map((file, index) => {
            const fileUrl = getFileUrl(file);
            const fileName = getFileName(file, `File ${index + 1}`);

            return (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText 
                  primary={
                    fileUrl ? (
                      <Link
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          color: '#1976d2',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          '&:hover': {
                            color: '#115293',
                            textDecoration: 'underline',
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileIcon sx={{ fontSize: 16 }} />
                        {fileName}
                        <OpenInNewIcon sx={{ fontSize: 13, ml: 0.25 }} />
                      </Link>
                    ) : (
                      fileName
                    )
                  }
                  secondary={file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : ''}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <ListItemSecondaryAction>
                  {fileUrl && (
                    <Tooltip title="View / Open Document">
                      <IconButton 
                        edge="end" 
                        size="small"
                        component="a"
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mr: 0.5, color: '#1976d2' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!readOnly && onFileDeleted && (
                    <Tooltip title="Delete File">
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={() => onFileDeleted(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default FileUpload;
