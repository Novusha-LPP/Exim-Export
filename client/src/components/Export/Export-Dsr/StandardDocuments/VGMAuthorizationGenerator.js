import React, { useState } from "react";
import jsPDF from "jspdf";
import axios from "axios";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";

const VGMAuthorizationGenerator = ({ jobNo, children }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [jobData, setJobData] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState("");

    // --- Branding Folders ---
    const FOLDERS = [
        "aia",
        "alka",
        "amman",
        "aneeta packing",
        "aneeta plast pack",
        "aneeta techno pack",
        "ara",
        "baheti",
        "bhavya",
        "extrusions",
        "gemcorp",
        "gr metalloys",
        "guru rajendra",
        "hans",
        "metal aloy",
        "mordern",
        "nandeshwary",
        "sakar"
    ];

    // --- Asset Loader ---
    const allAssets = import.meta.glob("../../../../assets/**/*", { eager: true });

    const getAssetUrl = (folderName, type) => {
        if (!folderName) return null;

        const folder = folderName.toLowerCase().trim();
        const candidates = {
            head: ["head.png", "heaad.png", "header.png", "head.PNG", "heaad.PNG", "header.PNG"],
            foot: ["foot.png", "footer.png", "foot.PNG", "footer.PNG"],
            sign: ["sign.png", "sign.PNG"]
        };

        const searchNames = candidates[type] || [];
        for (const name of searchNames) {
            const targetPath = `../../../../assets/${folder}/${name}`;
            if (allAssets[targetPath]) {
                return allAssets[targetPath].default;
            }
        }
        return null;
    };

    const detectFolder = (exporterName) => {
        if (!exporterName) return "";
        const name = exporterName.toLowerCase();

        // Check for exact matches or partial with our known list
        // Sort logic to match longest folder name first
        const sorted = [...FOLDERS].sort((a, b) => b.length - a.length);

        for (const f of sorted) {
            if (name.includes(f)) return f;
        }
        // Keyword fallbacks map to valid folder names
        if (name.includes("aneeta")) return "aneeta packing"; // Default or guess?
        if (name.includes("metalloys")) return "gr metalloys";
        if (name.includes("rajendra")) return "guru rajendra";
        // if (name.includes("techno")) return "aneeta techno pack"; // Ambiguous but logic needed?

        return "";
    };

    const loadImage = (url) => new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    const handleOpen = async (e) => {
        if (e) e.stopPropagation();
        setLoading(true);
        try {
            const response = await axios.get(
                `${import.meta.env.VITE_API_STRING}/get-export-job/${encodeURIComponent(jobNo)}`
            );
            const job = response.data;
            setJobData(job);

            const detected = detectFolder(job.exporter || "");
            setSelectedFolder(detected);

            setOpen(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!jobData) return;
        setOpen(false);

        try {
            const exporterName = jobData.exporter || "";
            const exporterAddress = jobData.exporter_address || "";
            const chaName = jobData.cha || jobData.cha_name || "";
            const invoices = (jobData.invoices || []).map(inv => inv.invoiceNumber).filter(Boolean).join(", ");
            const currentDate = new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });

            // Use selectedFolder for branding assets
            const headUrl = getAssetUrl(selectedFolder, "head");
            const footUrl = getAssetUrl(selectedFolder, "foot");
            const signUrl = getAssetUrl(selectedFolder, "sign");

            const [headImg, footImg, signImg] = await Promise.all([
                headUrl ? loadImage(headUrl) : null,
                footUrl ? loadImage(footUrl) : null,
                signUrl ? loadImage(signUrl) : null
            ]);

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "a4"
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 50;
            let yPos = 40;

            // --- Header ---
            if (headImg) {
                const props = pdf.getImageProperties(headImg);
                let w = pageWidth;
                let h = (props.height * w) / props.width;
                const MAX_HEADER_HEIGHT = 120;
                if (h > MAX_HEADER_HEIGHT) {
                    h = MAX_HEADER_HEIGHT;
                    w = (props.width * h) / props.height;
                }
                const x = (pageWidth - w) / 2;
                pdf.addImage(headImg, "PNG", x, 10, w, h);
                yPos = h + 30;
            } else {
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                pdf.text("(To be printed on Company Letterhead)", pageWidth / 2, yPos, { align: "center" });
                yPos += 30;
            }

            // --- Body ---
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "normal");

            pdf.text(`Date: ${currentDate}`, margin, yPos);
            yPos += 30;

            pdf.text("To", margin, yPos);
            yPos += 15;
            pdf.text("ODEX / Shipping Line / Terminal / CHA", margin, yPos);
            yPos += 30;

            pdf.setFont("helvetica", "bold");
            pdf.text("Subject: Combined Authorization for VGM Submission", margin, yPos);
            yPos += 30;

            pdf.setFont("helvetica", "normal");
            pdf.text("Dear Sir / Madam,", margin, yPos);
            yPos += 25;

            const mainText = `We, ${exporterName}, having registered office at ${exporterAddress}, hereby authorize ODEX, ${chaName || "[CHA Name]"}, and the concerned shipping line to submit the Verified Gross Mass (VGM) for our export container(s) on our behalf for the below mentioned shipment(s):`;
            const splitText = pdf.splitTextToSize(mainText, pageWidth - (margin * 2));
            pdf.text(splitText, margin, yPos);
            yPos += (splitText.length * 15) + 20;

            pdf.setFont("helvetica", "bold");
            pdf.text(`Invoice no: ${invoices || "N/A"}`, margin, yPos);
            yPos += 30;

            const respText = "We confirm that the responsibility for correctness of the declared VGM lies solely with us as the shipper, and we shall hold ODEX, CHA, terminal, and shipping line harmless against any consequences arising due to incorrect declaration.";
            const splitResp = pdf.splitTextToSize(respText, pageWidth - (margin * 2));
            pdf.setFont("helvetica", "normal");
            pdf.text(splitResp, margin, yPos);
            yPos += (splitResp.length * 15) + 20;

            pdf.text("This authorization is issued only for VGM submission purpose for the above shipment(s).", margin, yPos);
            yPos += 30;

            pdf.text("Thanking you.", margin, yPos);
            yPos += 30;

            pdf.text("Yours faithfully,", margin, yPos);
            yPos += 20;

            pdf.setFont("helvetica", "bold");
            pdf.text(`For ${exporterName}`, margin, yPos);

            // --- Signature ---
            yPos += 10;
            if (signImg) {
                const props = pdf.getImageProperties(signImg);
                const h = 50;
                const w = (props.width * h) / props.height;
                pdf.addImage(signImg, "PNG", margin, yPos, w, h);
                yPos += h + 5;
            } else {
                yPos += 40;
            }

            pdf.setFont("helvetica", "bold");
            pdf.text("Authorized Signatory", margin, yPos);

            // --- Footer ---
            if (footImg) {
                const props = pdf.getImageProperties(footImg);
                let w = pageWidth;
                let h = (props.height * w) / props.width;
                const MAX_FOOTER_HEIGHT = 100;
                if (h > MAX_FOOTER_HEIGHT) {
                    h = MAX_FOOTER_HEIGHT;
                    w = (props.width * h) / props.height;
                }
                const x = (pageWidth - w) / 2;
                pdf.addImage(footImg, "PNG", x, pageHeight - h, w, h);
            }

            pdf.save(`VGM_Authorization_${jobData.job_no || "Job"}.pdf`);
        } catch (err) {
            console.error("Error generating VGM Authorization:", err);
        }
    };

    return (
        <>
            {children ? React.cloneElement(children, { onClick: handleOpen }) : null}

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontSize: 14, fontWeight: 600, py: 1.5, px: 2 }}>Select Branding</DialogTitle>
                <DialogContent dividers sx={{ p: 2 }}>
                    <FormControl fullWidth size="small" variant="outlined">
                        <InputLabel sx={{ fontSize: 13 }}>Exporter Asset Folder</InputLabel>
                        <Select
                            value={selectedFolder}
                            label="Exporter Asset Folder"
                            onChange={(e) => setSelectedFolder(e.target.value)}
                            sx={{ fontSize: 13 }}
                            MenuProps={{
                                PaperProps: {
                                    style: {
                                        maxHeight: 300,
                                    },
                                },
                            }}
                        >
                            <MenuItem value="" sx={{ fontSize: 13 }}>
                                <em>None (No Header)</em>
                            </MenuItem>
                            {FOLDERS.map((f) => (
                                <MenuItem key={f} value={f} sx={{ fontSize: 13 }}>
                                    {f.toUpperCase()}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ py: 1, px: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit" size="small" sx={{ fontSize: 12 }}>
                        Cancel
                    </Button>
                    <Button onClick={handleGenerate} variant="contained" size="small" sx={{ fontSize: 12 }}>
                        Generate
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default VGMAuthorizationGenerator;
