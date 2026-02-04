import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import useExportExcelUpload from "../../../customHooks/useExportExcelUpload";

// Professional Styles
const styles = {
    container: {
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
        padding: "20px",
        marginBottom: "20px",
        border: "1px solid #e5e7eb",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid #e5e7eb",
    },
    title: {
        fontSize: "16px",
        fontWeight: "700",
        color: "#1f2937",
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    lastUpdate: {
        fontSize: "12px",
        color: "#6b7280",
        fontWeight: "500",
    },
    uploadSection: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexWrap: "wrap",
    },
    uploadBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 20px",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: "600",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 3px rgba(37, 99, 235, 0.3)",
    },
    uploadBtnDisabled: {
        backgroundColor: "#9ca3af",
        cursor: "not-allowed",
        boxShadow: "none",
    },
    fileInput: {
        display: "none",
    },
    progressContainer: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flex: 1,
        minWidth: "200px",
    },
    progressBar: {
        flex: 1,
        height: "8px",
        backgroundColor: "#e5e7eb",
        borderRadius: "4px",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#2563eb",
        borderRadius: "4px",
        transition: "width 0.3s ease",
    },
    progressText: {
        fontSize: "12px",
        color: "#4b5563",
        fontWeight: "600",
        whiteSpace: "nowrap",
    },
    errorMessage: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "6px",
        color: "#dc2626",
        fontSize: "12px",
        fontWeight: "500",
        marginTop: "12px",
    },
    successMessage: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        backgroundColor: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "6px",
        color: "#16a34a",
        fontSize: "12px",
        fontWeight: "500",
        marginTop: "12px",
    },
    closeBtn: {
        marginLeft: "auto",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        color: "inherit",
        opacity: 0.7,
    },
    statsContainer: {
        display: "flex",
        gap: "20px",
        marginTop: "12px",
        padding: "12px",
        backgroundColor: "#f9fafb",
        borderRadius: "6px",
    },
    statItem: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    statLabel: {
        fontSize: "11px",
        color: "#6b7280",
        fontWeight: "500",
        textTransform: "uppercase",
    },
    statValue: {
        fontSize: "16px",
        color: "#111827",
        fontWeight: "700",
    },
    loadingSpinner: {
        width: "16px",
        height: "16px",
        border: "2px solid #ffffff",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    infoText: {
        fontSize: "12px",
        color: "#6b7280",
        marginTop: "8px",
    },
};

// Add keyframes for spinner animation
const spinnerKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

/**
 * Export Excel/CSV Upload Component
 * Allows users to upload Excel or CSV files containing export job data
 */
const ExportExcelUpload = ({ onUploadSuccess }) => {
    const inputRef = useRef(null);
    const [lastUpdateDate, setLastUpdateDate] = useState(null);

    const {
        handleFileUpload,
        snackbar,
        loading,
        error,
        setError,
        progress,
        uploadStats,
    } = useExportExcelUpload(inputRef, onUploadSuccess);

    // Fetch last update date
    useEffect(() => {
        const fetchLastUpdate = async () => {
            try {
                const response = await axios.get(
                    `${import.meta.env.VITE_API_STRING}/get-last-export-jobs-date`
                );
                if (response.data?.success && response.data?.data?.date) {
                    setLastUpdateDate(new Date(response.data.data.date).toLocaleString());
                }
            } catch (err) {
                console.error("Error fetching last update date:", err);
            }
        };
        fetchLastUpdate();
    }, [snackbar]); // Refresh when upload completes

    const handleButtonClick = () => {
        if (!loading && inputRef.current) {
            inputRef.current.click();
        }
    };

    const progressPercent =
        progress.total > 0
            ? Math.round((progress.current / progress.total) * 100)
            : 0;

    return (
        <>
            {/* Inject spinner animation */}
            <style>{spinnerKeyframes}</style>

            <div style={styles.container}>
                <div style={styles.header}>
                    <h3 style={styles.title}>
                        <span role="img" aria-label="upload">
                            📤
                        </span>
                        Update/Import Export Jobs from Excel/CSV/XML
                    </h3>
                    {lastUpdateDate && (
                        <span style={styles.lastUpdate}>
                            Last Updated: {lastUpdateDate}
                        </span>
                    )}
                </div>

                <div style={styles.uploadSection}>
                    <button
                        onClick={handleButtonClick}
                        style={{
                            ...styles.uploadBtn,
                            ...(loading ? styles.uploadBtnDisabled : {}),
                        }}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div style={styles.loadingSpinner}></div>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <span role="img" aria-label="excel">
                                    📊
                                </span>
                                Choose Excel/CSV/XML File to Update
                            </>
                        )}
                    </button>

                    <input
                        type="file"
                        ref={inputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx,.xls,.csv,.xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/xml,application/xml"
                        style={styles.fileInput}
                    />

                    {loading && progress.total > 0 && (
                        <div style={styles.progressContainer}>
                            <div style={styles.progressBar}>
                                <div
                                    style={{
                                        ...styles.progressFill,
                                        width: `${progressPercent}%`,
                                    }}
                                ></div>
                            </div>
                            <span style={styles.progressText}>
                                Chunk {progress.current}/{progress.total} ({progressPercent}%)
                            </span>
                        </div>
                    )}
                </div>

                <p style={styles.infoText}>
                    Supported formats: .xlsx, .xls, .csv, .xml | Data starts from row 3 (after headers)
                </p>

                {/* Error Message */}
                {error && (
                    <div style={styles.errorMessage}>
                        <span role="img" aria-label="error">
                            ❌
                        </span>
                        {error}
                        <button
                            onClick={() => setError(null)}
                            style={styles.closeBtn}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Success Message with Stats */}
                {snackbar && uploadStats && (
                    <div style={styles.successMessage}>
                        <span role="img" aria-label="success">
                            ✅
                        </span>
                        Upload completed successfully!
                        <button
                            onClick={() => { }}
                            style={styles.closeBtn}
                        >
                            ×
                        </button>
                    </div>
                )}

                {uploadStats && (
                    <div style={styles.statsContainer}>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Records Processed</span>
                            <span style={styles.statValue}>{uploadStats.count}</span>
                        </div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Time Taken</span>
                            <span style={styles.statValue}>{uploadStats.timeTaken}s</span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ExportExcelUpload;
