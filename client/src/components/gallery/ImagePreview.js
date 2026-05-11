// ImagePreview.jsx (same logic, slightly tighter enterprise styling)
import React, { useState, useContext } from "react";
import { UserContext } from "../../contexts/UserContext";
import ConfirmDialog from "./ConfirmDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faTrash } from "@fortawesome/free-solid-svg-icons";

const styles = {
  wrapper: { 
    marginTop: 4, 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px' 
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '2px 0'
  },
  link: {
    textDecoration: "none",
    color: "#64748b",
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteBtn: {
    padding: 0,
    background: "none",
    border: "none",
    color: "#dc2626",
    cursor: "pointer",
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  empty: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
};

const ImagePreview = ({
  images,
  onDeleteImage,
  onImageClick,
  readOnly = false,
  isDsr = false,
}) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const { user } = useContext(UserContext);

  const imageArray = Array.isArray(images)
    ? images.map((img) =>
      typeof img === "object" && img !== null ? img.url : img
    )
    : images
      ? [typeof images === "object" && images !== null ? images.url : images]
      : [];

  const extractFileName = (url) => {
    try {
      if (!url) return "Unknown file";
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      console.error("Failed to extract file name:", error);
      return "File name unavailable";
    }
  };

  const handleDeleteClick = (index) => {
    setDeleteIndex(index);
    setOpenDeleteDialog(true);
  };

  const confirmDelete = async () => {
    const imageUrl = imageArray[deleteIndex];

    try {
      const key = new URL(imageUrl).pathname.slice(1);
      const response = await fetch(
        `${import.meta.env.VITE_API_STRING}/delete-s3-file`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        }
      );
      if (response.ok) {
        onDeleteImage(deleteIndex);
      } else {
        alert("Failed to delete document from S3.");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Error deleting document.");
    }
    setOpenDeleteDialog(false);
  };

  return (
    <div style={styles.wrapper}>
      {imageArray.length > 0 ? (
        imageArray.map((link, index) => (
          <div key={index} style={styles.item}>
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
                title={extractFileName(link)}
                onClick={(e) => {
                  if (onImageClick) onImageClick(index, link);
                }}
              >
                <FontAwesomeIcon icon={faFileAlt} />
              </a>
            ) : (
              <span style={{ fontSize: 11, color: '#64748b' }}>N/A</span>
            )}
            
            {!readOnly && (
              <button
                type="button"
                style={styles.deleteBtn}
                onClick={() => handleDeleteClick(index)}
                title="Delete document"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        ))
      ) : (
        <div style={styles.empty}>No document.</div>
      )}
      {!readOnly && (
        <ConfirmDialog
          open={openDeleteDialog}
          handleClose={() => setOpenDeleteDialog(false)}
          handleConfirm={confirmDelete}
          message="Are you sure you want to delete this document?"
        />
      )}
    </div>
  );
};

export default ImagePreview;
