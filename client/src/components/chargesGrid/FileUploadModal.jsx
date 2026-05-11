import React, { useState, useEffect } from 'react';
import { uploadFileToS3 } from "../../utils/awsFileUpload";

const FileUploadModal = ({ isOpen, onClose, chargeLabel, initialUrls = [], onAttach }) => {
  const [tempFiles, setTempFiles] = useState([]);
  const [remainingUrls, setRemainingUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTempFiles([]);
      setRemainingUrls(Array.isArray(initialUrls) ? initialUrls : (initialUrls ? [initialUrls] : []));
      setIsUploading(false);
    }
  }, [isOpen, initialUrls]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setTempFiles([...tempFiles, ...Array.from(e.target.files)]);
    }
    e.target.value = '';
  };

  const removeTempFile = (index) => {
    setTempFiles(tempFiles.filter((_, i) => i !== index));
  };

  const removeInitialUrl = (index) => {
    setRemainingUrls(remainingUrls.filter((_, i) => i !== index));
  };

  const getS3FileName = (url) => {
    try {
      if (!url) return "File";
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
      return "File";
    }
  };

  const handleAttach = async () => {
    setIsUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of tempFiles) {
        try {
          const result = await uploadFileToS3(file, "charges");
          uploadedUrls.push(result.Location);
        } catch (err) {
          console.error("Failed to upload", file.name, err);
          alert("Failed to upload " + file.name);
          // Continue with others? For now, yes, but we could stop.
        }
      }

      const finalUrls = [...remainingUrls, ...uploadedUrls];
      onAttach(finalUrls);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-modal-overlay active">
      <div className="file-modal">
        <div className="file-modal-title">📎 Attach Files — {chargeLabel}</div>
        <div className="file-modal-body">
          <div
            className="drop-zone"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over') }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('drag-over');
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setTempFiles([...tempFiles, ...Array.from(e.dataTransfer.files)]);
              }
            }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <div style={{ fontSize: '28px', marginBottom: '6px', opacity: 0.5 }}>⬆</div>
            <p><strong>Drag &amp; drop files here</strong></p>
            <p>or <span className="browse-link" onClick={(e) => { e.stopPropagation(); fileInputRef.current && fileInputRef.current.click() }}>browse to upload</span></p>
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>PDF, JPG, PNG, XLSX, DOCX, MP4 supported</p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.mp4,application/pdf,image/jpeg,image/png,video/mp4"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div className="file-list" style={{ minHeight: '60px', maxHeight: '200px', overflowY: 'auto' }}>
            {remainingUrls.map((url, idx) => (
              <div className="file-item" key={`init-${idx}`}>
                <span className="file-item-name">📄 {getS3FileName(url)}</span>
                <span className="file-remove" onClick={() => removeInitialUrl(idx)}>✕</span>
              </div>
            ))}

            {tempFiles.map((file, idx) => (
              <div className="file-item" key={`temp-${idx}`}>
                <span className="file-item-name">📄 {file.name} <span style={{ color: '#64748b' }}>({(file.size / 1024).toFixed(1)} KB)</span></span>
                <span className="file-remove" onClick={() => removeTempFile(idx)}>✕</span>
              </div>
            ))}

            {remainingUrls.length === 0 && tempFiles.length === 0 && (
              <div style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '12px' }}>
                No files selected
              </div>
            )}
          </div>
        </div>
        <div className="file-modal-footer">
          <button type="button" className="btn" onClick={handleAttach} disabled={isUploading || (remainingUrls.length === 0 && tempFiles.length === 0)}>
            {isUploading ? 'Uploading...' : 'Attach Files'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isUploading}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
