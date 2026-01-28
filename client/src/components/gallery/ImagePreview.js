// ImagePreview.jsx (same logic, slightly tighter enterprise styling)
import React, { useState, useContext } from "react";
import { UserContext } from "../../contexts/UserContext";
import ConfirmDialog from "./ConfirmDialog";

const tableStyles = {
  wrapper: { marginTop: 4, maxHeight: 140, overflowY: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 11,
  },
  th: {
    textAlign: "left",
    padding: "4px 6px",
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 700,
    color: "#1f2933",
  },
  td: {
    padding: "4px 6px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: 11,
  },
  link: {
    textDecoration: "none",
    color: "#1d4ed8",
    fontWeight: 500,
  },
  deleteBtn: {
    padding: "1px 6px",
    fontSize: 11,
    borderRadius: 3,
    border: "1px solid #e53e3e",
    background: "#fff5f5",
    color: "#c53030",
    cursor: "pointer",
    fontWeight: 600,
  },
  empty: { fontSize: 11, color: "#6b7280", marginTop: 4 },
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

  const canDelete = isDsr || user.role === "Admin";

  const handleDeleteClick = (index) => {
    if (canDelete) {
      setDeleteIndex(index);
      setOpenDeleteDialog(true);
    } else {
      alert("You do not have permission to delete documents.");
    }
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
    <div style={tableStyles.wrapper}>
      {imageArray.length > 0 ? (
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>File Name</th>
              {!readOnly && <th style={tableStyles.th}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {imageArray.map((link, index) => (
              <tr key={index}>
                <td style={tableStyles.td}>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={tableStyles.link}
                      onClick={(e) => {
                        if (onImageClick) onImageClick(index, link);
                      }}
                    >
                      {extractFileName(link)}
                    </a>
                  ) : (
                    "Invalid link"
                  )}
                </td>
                {!readOnly && (
                  <td style={tableStyles.td}>
                    <button
                      type="button"
                      style={tableStyles.deleteBtn}
                      onClick={() => handleDeleteClick(index)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={tableStyles.empty}>No document uploaded yet.</div>
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
