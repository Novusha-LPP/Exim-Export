import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Paper,
    Chip,
    Divider,
    IconButton,
    Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import TrainIcon from "@mui/icons-material/Train";
import axios from "axios";

function ContainerTrackDialog({ open, onClose, containers }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (open && containers && containers.length > 0) {
            fetchTrackData();
        }
        if (!open) {
            setData(null);
            setError(null);
        }
        // eslint-disable-next-line
    }, [open, containers]);

    const fetchTrackData = async () => {
        setLoading(true);
        setError(null);
        try {
            const containerNos = containers.map((c) => c.containerNo || c).filter(Boolean);
            if (containerNos.length === 0) {
                throw new Error("No container numbers available.");
            }

            const response = await axios.post(
                `${import.meta.env.VITE_API_STRING}/container-track`,
                { containerNo: containerNos },
                { headers: { "Content-Type": "application/json" } }
            );

            // Structure: { success, data: { status, statusCode, message, data: { CONTAINER_NO: {...} } } }
            const containerData = response.data?.data?.data;
            if (containerData && typeof containerData === "object") {
                setData(containerData);
            } else {
                throw new Error(response.data?.data?.message || response.data?.message || "Failed to fetch container data");
            }
        } catch (err) {
            console.error("Container Track error:", err);
            setError(err.response?.data?.message || err.message || "Failed to fetch container tracking data");
        } finally {
            setLoading(false);
        }
    };

    const renderContainerCard = (containerNo, info) => {
        const track = info?.containerTrack || {};
        const mapData = info?.mapData || {};
        const start = mapData.startPoint || {};
        const end = mapData.endPoint || {};

        // Extract location details (supports both CURRENT_LOCATION and legacy DETAILS)
        const rawLocation = track.CURRENT_LOCATION || track.DETAILS || "";
        const cleanLocation = rawLocation ? rawLocation.replace(/<[^>]*>/g, "") : "";
        
        // Extract bold highlights if present
        const highlightMatches = rawLocation ? [...rawLocation.matchAll(/<b>(.*?)<\/b>/g)].map(m => m[1]) : [];
        const highlightText = highlightMatches.length > 0 ? highlightMatches.join(" — ") : cleanLocation;

        return (
            <Box
                key={containerNo}
                sx={{
                    mb: 2,
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
            >
                {/* Container Header */}
                <Box
                    sx={{
                        background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
                        color: "#fff",
                        px: 2,
                        py: 1.25,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LocalShippingIcon fontSize="small" />
                        <Typography fontWeight={700} fontSize={14}>
                            {containerNo}
                        </Typography>
                        {track.CONTAINER_SIZE && (
                            <Chip
                                label={`${track.CONTAINER_SIZE}ft`}
                                size="small"
                                sx={{ backgroundColor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700, fontSize: 11 }}
                            />
                        )}
                        {track.CONTAINER_TYPE && (
                            <Chip
                                label={track.CONTAINER_TYPE}
                                size="small"
                                sx={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 11 }}
                            />
                        )}
                    </Box>

                    {track.SHIPPING_LINE && (
                        <Typography fontSize={11} sx={{ opacity: 0.9, fontWeight: 600 }}>
                            Line: {track.SHIPPING_LINE}
                        </Typography>
                    )}
                </Box>

                {/* Details */}
                <Box sx={{ px: 2, py: 1.5 }}>
                    {/* Status highlight banner */}
                    {cleanLocation && (
                        <Box
                            sx={{
                                background: "#f0fdf4",
                                border: "1px solid #86efac",
                                borderRadius: 1.5,
                                px: 1.5,
                                py: 1,
                                mb: 1.5,
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                            }}
                        >
                            <LocationOnIcon sx={{ color: "#16a34a", fontSize: 18, mt: 0.2 }} />
                            <Box>
                                <Typography fontSize={11} fontWeight={700} color="#15803d" textTransform="uppercase">
                                    Current Location / Status
                                </Typography>
                                <Typography fontSize={13} fontWeight={600} color="#166534">
                                    {cleanLocation}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 1.5 }}>
                        <Table size="small">
                            <TableBody>
                                <TableRow sx={{ "&:nth-of-type(odd)": { backgroundColor: "#f9fafb" } }}>
                                    <TableCell sx={{ fontWeight: 600, width: "40%", fontSize: 12, color: "#4b5563" }}>Shipping Line</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{track.SHIPPING_LINE || "N/A"}</TableCell>
                                </TableRow>
                                <TableRow sx={{ "&:nth-of-type(odd)": { backgroundColor: "#f9fafb" } }}>
                                    <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "#4b5563" }}>Container Size / Type</TableCell>
                                    <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>
                                        {track.CONTAINER_SIZE ? `${track.CONTAINER_SIZE} ft` : ""}{track.CONTAINER_TYPE ? ` (${track.CONTAINER_TYPE})` : (track.CONTAINER_SIZE ? "" : "N/A")}
                                    </TableCell>
                                </TableRow>

                                {track.TRAIN_NUMBER && (
                                    <TableRow sx={{ "&:nth-of-type(odd)": { backgroundColor: "#f9fafb" } }}>
                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "#4b5563" }}>Train Number</TableCell>
                                        <TableCell sx={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                                <TrainIcon sx={{ fontSize: 15 }} />
                                                {track.TRAIN_NUMBER}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {track.WAGON_NUMBER && (
                                    <TableRow sx={{ "&:nth-of-type(odd)": { backgroundColor: "#f9fafb" } }}>
                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "#4b5563" }}>Wagon Number</TableCell>
                                        <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{track.WAGON_NUMBER}</TableCell>
                                    </TableRow>
                                )}

                                {(track.TRAIN_ORIGNATING_STATION || track.TRAIN_DESTINATION_STATION) && (
                                    <TableRow sx={{ "&:nth-of-type(odd)": { backgroundColor: "#f9fafb" } }}>
                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "#4b5563" }}>Train Station Route</TableCell>
                                        <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>
                                            {track.TRAIN_ORIGNATING_STATION || "-"} → {track.TRAIN_DESTINATION_STATION || "-"}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {(track.CONTAINER_ORIGNATING_STATION || track.CONTAINER_DESTINATION_STATION) && (
                                    <TableRow sx={{ "&:nth-of-type(odd)": { backgroundColor: "#f9fafb" } }}>
                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: "#4b5563" }}>Container Route</TableCell>
                                        <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>
                                            {track.CONTAINER_ORIGNATING_STATION || "-"} → {track.CONTAINER_DESTINATION_STATION || "-"}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Terminal Route info from mapData */}
                    {(start.terminal_name || end.terminal_name) && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "#f8fafc",
                                borderRadius: 1.5,
                                px: 1.5,
                                py: 0.75,
                                border: "1px solid #e2e8f0",
                            }}
                        >
                            <Typography fontSize={11} fontWeight={600} color="#64748b">Terminal Route:</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {start.terminal_name && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <LocationOnIcon sx={{ fontSize: 13, color: "#2563eb" }} />
                                        <Typography fontSize={11} fontWeight={600} color="#1e3a5f">
                                            {start.terminal_name}
                                        </Typography>
                                    </Box>
                                )}
                                {start.terminal_name && end.terminal_name && (
                                    <Typography fontSize={12} color="#9ca3af" sx={{ mx: 0.5 }}>→</Typography>
                                )}
                                {end.terminal_name && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                        <LocationOnIcon sx={{ fontSize: 13, color: "#dc2626" }} />
                                        <Typography fontSize={11} fontWeight={600} color="#7f1d1d">
                                            {end.terminal_name}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    const containerLabel = containers?.length === 1
        ? (containers[0]?.containerNo || containers[0])
        : `${containers?.length} Containers`;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { minHeight: "40vh", borderRadius: 2.5 } }}
        >
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocalShippingIcon sx={{ color: "#2563eb" }} />
                    <Box>
                        <Typography variant="h6" fontSize={15} fontWeight={700}>
                            Container Tracking
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {containerLabel} — via CONCOR India
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2 }}>
                {loading ? (
                    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px" gap={2}>
                        <CircularProgress size={36} />
                        <Typography color="text.secondary" fontSize={13}>
                            Fetching container data from CONCOR...
                        </Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                ) : data ? (
                    <Box>
                        {Object.entries(data).map(([containerNo, info]) =>
                            renderContainerCard(containerNo, info)
                        )}
                    </Box>
                ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="150px">
                        <Typography color="text.secondary">No data available.</Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2, pb: 2 }}>
                <Button
                    onClick={fetchTrackData}
                    variant="contained"
                    disabled={loading}
                    startIcon={<LocalShippingIcon />}
                    size="small"
                >
                    Refresh
                </Button>
                <Button onClick={onClose} size="small">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ContainerTrackDialog;

