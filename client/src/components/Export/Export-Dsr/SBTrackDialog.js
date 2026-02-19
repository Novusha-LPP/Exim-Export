import React, { useState, useEffect } from "react";
import { parse, format } from "date-fns";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Typography,
    Box,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Divider,
    IconButton,
    Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import axios from "axios";

/**
 * Custom House to Location Code mapping
 */
const CUSTOM_HOUSE_CODE_MAP = {
    "AHMEDABAD AIR CARGO": "INAMD4",
    "AIR AHMEDABAD": "INAMD4",
    "ICD SABARMATI": "INSBI6",
    "ICD KHODIYAR": "INSBI6",
    "ICD VIRAMGAM": "INVGR6",
    "ICD SACHANA": "INJKA6",
    "ICD VIROCHANNAGAR": "INVCN6",
    "ICD VIROCHAN NAGAR": "INVCN6",
    "THAR DRY PORT": "INSAU6",
    "ICD SANAND": "INSND6",
    "ANKLESHWAR ICD": "INAKV6",
    "ICD VARNAMA": "INVRM6",
    "MUNDRA SEA": "INMUN1",
    "KANDLA SEA": "INIXY1",
    "COCHIN AIR CARGO": "INCOK4",
    "COCHIN SEA": "INCOK1",
    "HAZIRA": "INHZA1",
};

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`sb-tabpanel-${index}`}
            aria-labelledby={`sb-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
        </div>
    );
}

function SBTrackDialog({ open, onClose, sbNo, sbDate, customHouse, onUpdateStatus }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (open && sbNo && sbDate && customHouse) {
            fetchSBTrackData();
        }
        // Reset state when dialog closes
        if (!open) {
            setData(null);
            setError(null);
            setTabValue(0);
        }
        // eslint-disable-next-line
    }, [open, sbNo, sbDate, customHouse]);

    const fetchSBTrackData = async () => {
        setLoading(true);
        setError(null);

        try {
            const locationCode = CUSTOM_HOUSE_CODE_MAP[customHouse?.toUpperCase()] ||
                CUSTOM_HOUSE_CODE_MAP[customHouse];

            if (!locationCode) {
                throw new Error(`Unknown custom house: ${customHouse}`);
            }

            // Format date to YYYYMMDD
            let formattedDate = sbDate;
            if (sbDate?.includes("-")) {
                const parts = sbDate.split("-");
                if (parts[0].length === 4) {
                    formattedDate = parts.join("");
                } else {
                    formattedDate = `${parts[2]}${parts[1]}${parts[0]}`;
                }
            }

            const response = await axios.post(
                `${import.meta.env.VITE_API_STRING}/sb-track`,
                {
                    sbNo: sbNo,
                    sbDate: formattedDate,
                    locationCode: locationCode,
                }
            );

            if (response.data.success) {
                const fetchedData = response.data.data;
                setData(fetchedData);

                // Extract dates and callback
                if (onUpdateStatus && fetchedData.currentStatusModel?.[0]) {
                    const status = fetchedData.currentStatusModel[0];
                    const extractDate = (dateStr) => {
                        if (!dateStr || dateStr === "N.A.") return null;
                        try {
                            // Try parsing "dd MMM yyyy HH:mm" e.g. "09 FEB 2026 15:02"
                            // Date format in response seems to be "dd MMM yyyy HH:mm" or similar
                            // Using Date.parse might work if month is English
                            const d = new Date(dateStr);
                            if (!isNaN(d.getTime())) {
                                return format(d, "yyyy-MM-dd");
                            }
                            // Fallback using date-fns parse if necessary
                            // Attempt more robust parsing if needed
                            return null;
                        } catch (e) {
                            return null;
                        }
                    };

                    const updates = {
                        goodsRegistrationDate: extractDate(status.markDate),
                        goodsReportDate: extractDate(status.examDate), // Verify mapping
                        leoDate: extractDate(status.leoDate), // Verify mapping
                    };

                    // Filter out nulls
                    const finalUpdates = {};
                    if (updates.goodsRegistrationDate) finalUpdates.goodsRegistrationDate = updates.goodsRegistrationDate;
                    if (updates.goodsReportDate) finalUpdates.goodsReportDate = updates.goodsReportDate;
                    if (updates.leoDate) finalUpdates.leoDate = updates.leoDate;

                    if (Object.keys(finalUpdates).length > 0) {
                        onUpdateStatus(finalUpdates);
                    }
                }

            } else {
                throw new Error(response.data.message || "Failed to fetch data");
            }
        } catch (err) {
            console.error("SB Track error:", err);
            setError(err.response?.data?.message || err.message || "Failed to fetch SB tracking data");
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const renderYesNo = (value) => {
        if (value === "Y") {
            return <Chip size="small" label="Yes" color="success" icon={<CheckCircleIcon />} />;
        } else if (value === "N") {
            return <Chip size="small" label="No" color="error" icon={<CancelIcon />} />;
        }
        return value || "-";
    };

    const renderValue = (value) => {
        if (value === "N.A." || value === null || value === undefined) {
            return <Typography color="text.secondary">N/A</Typography>;
        }
        return value;
    };

    const renderSBDetails = () => {
        const details = data?.sbDetailsModel?.[0];
        if (!details) return <Typography>No SB details available</Typography>;

        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: "30%" }}>IEC</TableCell>
                            <TableCell>{renderValue(details.iec)}</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: "30%" }}>CHA No</TableCell>
                            <TableCell>{renderValue(details.chaNo)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Job No</TableCell>
                            <TableCell>{renderValue(details.jobNo)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Job Date</TableCell>
                            <TableCell>{renderValue(details.jobDate)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Port of Discharge</TableCell>
                            <TableCell>{renderValue(details.portOfDischarge)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Total Package</TableCell>
                            <TableCell>{renderValue(details.totalPackage)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Gross Weight</TableCell>
                            <TableCell>{renderValue(details.grossWeight)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>FOB</TableCell>
                            <TableCell>{renderValue(details.fob)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Total Cess</TableCell>
                            <TableCell>{renderValue(details.totalCess)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Drawback</TableCell>
                            <TableCell>{renderValue(details.drawback)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>STR</TableCell>
                            <TableCell>{renderValue(details.str)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                            <TableCell>{renderValue(details.total)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Reward Flag</TableCell>
                            <TableCell>{renderYesNo(details.rewardFlag)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>CIN No</TableCell>
                            <TableCell>{renderValue(details.cinNo)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>CIN Date</TableCell>
                            <TableCell colSpan={3}>{renderValue(details.cinDate?.split(" ")[0])}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderCurrentStatus = () => {
        const status = data?.currentStatusModel?.[0];
        if (!status) return <Typography>No status information available</Typography>;

        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: "25%" }}>Warehouse</TableCell>
                            <TableCell colSpan={3}>{renderValue(status.wareNm)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Current Queue</TableCell>
                            <TableCell>{renderValue(status.currQueue)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Current Status</TableCell>
                            <TableCell>{renderValue(status.currStatus)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>LEO Date</TableCell>
                            <TableCell>{renderValue(status.leoDate)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>EP Copy</TableCell>
                            <TableCell>{renderYesNo(status.epCopy)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Exam Mark ID</TableCell>
                            <TableCell>{renderValue(status.examMarkId)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Mark Date</TableCell>
                            <TableCell>{renderValue(status.markDate)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Exam Insp ID</TableCell>
                            <TableCell>{renderValue(status.examInspId)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Exam Date</TableCell>
                            <TableCell>{renderValue(status.examDate)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>DBK Sup ID</TableCell>
                            <TableCell>{renderValue(status.dbkSupId)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>DBK Sup Date</TableCell>
                            <TableCell>{renderValue(status.dbkSupDate)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Scroll No</TableCell>
                            <TableCell>{renderValue(status.custScrollNo)}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Scroll Date</TableCell>
                            <TableCell>{renderValue(status.scrollDate)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>EGM Filed</TableCell>
                            <TableCell colSpan={3}>{renderYesNo(status.egmFiled)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderEGMStatus = () => {
        const egmList = data?.egmStatusModel;
        if (!egmList?.length) return <Typography>No EGM information available</Typography>;

        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>EGM No</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>EGM Date</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Container No</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Seal No</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {egmList.map((egm, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{renderValue(egm.egmNo)}</TableCell>
                                <TableCell>{renderValue(egm.egmDate)}</TableCell>
                                <TableCell>{renderValue(egm.containerNo)}</TableCell>
                                <TableCell>{renderValue(egm.sealNo)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderROSLStatus = () => {
        const rosl = data?.roslStatusModel?.[0];
        if (!rosl) return <Typography>No ROSL information available</Typography>;

        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600, width: "30%" }}>ROSL Availed</TableCell>
                            <TableCell>{renderYesNo(rosl.roslAvailed)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>ROSL Amount</TableCell>
                            <TableCell>{renderValue(rosl.roslAmt)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>ROSL Scroll No</TableCell>
                            <TableCell>{renderValue(rosl.roslScrollNo)}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>ROSL Scroll Date</TableCell>
                            <TableCell>{renderValue(rosl.roslScrollDate)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderIGSTDetails = () => {
        const igstList = data?.igstInvoiceDetailsModel;
        if (!igstList?.length) return <Typography>No IGST invoice details available</Typography>;

        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>GSTIN</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Invoice No</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Invoice Date</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>IGST Value (Custom)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {igstList.map((igst, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{renderValue(igst.gstin)}</TableCell>
                                <TableCell>{renderValue(igst.invoiceNo)}</TableCell>
                                <TableCell>{renderValue(igst.invoiceDate?.split(" ")[0])}</TableCell>
                                <TableCell>{renderValue(igst.igstValueCustom)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderEDocs = () => {
        const edocList = data?.edocModel;
        if (!edocList?.length) return <Typography>No e-documents available</Typography>;

        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Document Version</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Validity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {edocList.map((doc, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{renderValue(doc.docVersion)}</TableCell>
                                <TableCell>{renderValue(doc.docDescription)}</TableCell>
                                <TableCell>{renderYesNo(doc.validity)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderItemWiseRewards = () => {
        const items = data?.itemWiseRewardsModel;
        if (!items?.length) return <Typography>No item-wise reward information available</Typography>;

        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Invoice No</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Item No</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Reward Flag</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{renderValue(item.invoiceNo)}</TableCell>
                                <TableCell>{renderValue(item.itemNo)}</TableCell>
                                <TableCell>{renderYesNo(item.rewardFlag)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { minHeight: "70vh" }
            }}
        >
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                    <Typography variant="h6">
                        SB Tracking - {sbNo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Date: {sbDate} | Custom House: {customHouse}
                    </Typography>
                </Box>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                        <CircularProgress />
                        <Typography sx={{ ml: 2 }}>Fetching data from ICEGATE...</Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                ) : data ? (
                    <>
                        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                            <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                                <Tab label="SB Details" />
                                <Tab label="Current Status" />
                                <Tab label="EGM Status" />
                                <Tab label="ROSL" />
                                <Tab label="IGST Details" />
                                <Tab label="e-Documents" />
                                <Tab label="Item Rewards" />
                            </Tabs>
                        </Box>

                        <TabPanel value={tabValue} index={0}>
                            {renderSBDetails()}
                        </TabPanel>
                        <TabPanel value={tabValue} index={1}>
                            {renderCurrentStatus()}
                        </TabPanel>
                        <TabPanel value={tabValue} index={2}>
                            {renderEGMStatus()}
                        </TabPanel>
                        <TabPanel value={tabValue} index={3}>
                            {renderROSLStatus()}
                        </TabPanel>
                        <TabPanel value={tabValue} index={4}>
                            {renderIGSTDetails()}
                        </TabPanel>
                        <TabPanel value={tabValue} index={5}>
                            {renderEDocs()}
                        </TabPanel>
                        <TabPanel value={tabValue} index={6}>
                            {renderItemWiseRewards()}
                        </TabPanel>
                    </>
                ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                        <Typography color="text.secondary">
                            No data available. Please provide SB details.
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={fetchSBTrackData} variant="contained" disabled={loading}>
                    Fetch
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default SBTrackDialog;
