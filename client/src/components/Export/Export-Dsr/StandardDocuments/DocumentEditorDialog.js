import React, { useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import jsPDF from "jspdf";

const DocumentEditorDialog = ({
    open,
    onClose,
    initialContent,
    title = "Edit Document",
    onSave,
    pdfOptions = {},
    customSave,
}) => {
    const editorRef = useRef(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (editorRef.current) {
            setSaving(true);

            // If a customSave function is provided, use it instead of the default HTML-to-PDF
            if (customSave) {
                try {
                    const content = editorRef.current.getContent();
                    await customSave(content);
                    setSaving(false);
                    onClose();
                } catch (error) {
                    console.error("Error in custom save:", error);
                    setSaving(false);
                }
                return;
            }

            const content = editorRef.current.getContent();

            try {
                const isLandscape = pdfOptions.orientation === "landscape";
                const pageWidth = isLandscape ? 841.89 : 595.28;
                const pageHeight = isLandscape ? 595.28 : 841.89;
                const margin = pdfOptions.margin || (isLandscape ? [10, 10, 10, 10] : [15, 15, 15, 15]);
                const leftMargin = Array.isArray(margin) ? (margin[3] ?? margin[1] ?? 10) : (margin || 10);
                const rightMargin = Array.isArray(margin) ? (margin[1] ?? 10) : (margin || 10);
                const topMargin = Array.isArray(margin) ? (margin[0] ?? 10) : (margin || 10);
                const bottomMargin = Array.isArray(margin) ? (margin[2] ?? 10) : (margin || 10);
                const availableWidth = pageWidth - leftMargin - rightMargin;
                const availableHeight = pageHeight - topMargin - bottomMargin;
                const windowWidth = pdfOptions.windowWidth || (isLandscape ? 1050 : 800);

                // Import html2canvas directly for full control over rendering
                const html2canvas = (await import("html2canvas")).default;

                // Extract all style tags from TinyMCE iframe to ensure offscreen rendering has 100% of styles
                let editorStyles = "";
                if (editorRef.current && typeof editorRef.current.getDoc === "function") {
                    const editorDoc = editorRef.current.getDoc();
                    if (editorDoc) {
                        const styleEls = editorDoc.querySelectorAll("style, link[rel='stylesheet']");
                        editorStyles = Array.from(styleEls).map(el => el.outerHTML).join("\n");
                    }
                }

                // Explicit PDF helper styles for html2canvas
                const pdfHelperStyles = `
                    <style>
                        * { box-sizing: border-box !important; }
                        table { border-collapse: collapse !important; table-layout: fixed !important; width: 100% !important; margin-bottom: 10px !important; }
                        th, td { vertical-align: middle !important; padding: 6px 5px !important; line-height: 1.35 !important; }
                        th[rowspan], td[rowspan] { vertical-align: middle !important; }
                    </style>
                `;

                // Create offscreen container in main document body
                const container = document.createElement("div");
                container.style.position = "absolute";
                container.style.left = "-9999px";
                container.style.top = "0";
                container.style.width = windowWidth + "px";
                container.style.background = "#fff";
                container.innerHTML = editorStyles + pdfHelperStyles + content;
                document.body.appendChild(container);

                const targetEl = container.querySelector("div") || container;

                // Render the target element to canvas
                const canvas = await html2canvas(targetEl, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    imageTimeout: 5000,
                });

                document.body.removeChild(container);

                const doc = new jsPDF({
                    orientation: pdfOptions.orientation || "portrait",
                    unit: "pt",
                    format: pdfOptions.format || "a4",
                    compress: true,
                });

                const imgData = canvas.toDataURL("image/jpeg", 0.92);
                const imgWidth = availableWidth;
                const imgHeight = (canvas.height * availableWidth) / canvas.width;

                // Smart multi-page vs single-page auto-fit logic
                if (imgHeight <= availableHeight) {
                    doc.addImage(imgData, "JPEG", leftMargin, topMargin, imgWidth, imgHeight);
                } else if (imgHeight <= availableHeight * 1.25) {
                    // Automatically scale down slightly if content is within 25% overflow so it fits on 1 page
                    const fitScale = availableHeight / imgHeight;
                    const fittedWidth = availableWidth * fitScale;
                    const fittedHeight = availableHeight;
                    const xOffset = leftMargin + (availableWidth - fittedWidth) / 2;
                    doc.addImage(imgData, "JPEG", xOffset, topMargin, fittedWidth, fittedHeight);
                } else {
                    // True dynamic multi-page for long documents
                    let remainingHeight = imgHeight;
                    let srcY = 0;
                    let pageNum = 0;
                    const scaleFactor = canvas.width / imgWidth;

                    while (remainingHeight > 0) {
                        if (pageNum > 0) doc.addPage();
                        const sliceHeight = Math.min(availableHeight, remainingHeight);
                        const srcSliceHeight = sliceHeight * scaleFactor;

                        // Create a slice canvas for this page
                        const sliceCanvas = document.createElement("canvas");
                        sliceCanvas.width = canvas.width;
                        sliceCanvas.height = Math.round(srcSliceHeight);
                        const sliceCtx = sliceCanvas.getContext("2d");
                        sliceCtx.fillStyle = "#fff";
                        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                        sliceCtx.drawImage(canvas, 0, Math.round(srcY), canvas.width, Math.round(srcSliceHeight), 0, 0, canvas.width, Math.round(srcSliceHeight));

                        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
                        doc.addImage(sliceData, "JPEG", leftMargin, topMargin, imgWidth, sliceHeight);

                        srcY += srcSliceHeight;
                        remainingHeight -= sliceHeight;
                        pageNum++;
                    }
                }

                doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
                if (onSave) onSave(content);
                setSaving(false);
                onClose();
            } catch (error) {
                console.error("Error generating PDF:", error);
                setSaving(false);
            }
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                style: { height: "90vh" },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    pb: 1,
                }}
            >
                {title}
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0, height: "100%" }}>
                <Editor
                    tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.3/tinymce.min.js"
                    onInit={(evt, editor) => (editorRef.current = editor)}
                    initialValue={initialContent}
                    init={{
                        height: "100%",
                        menubar: true,
                        plugins: [
                            "advlist",
                            "autolink",
                            "lists",
                            "link",
                            "image",
                            "charmap",
                            "preview",
                            "anchor",
                            "searchreplace",
                            "visualblocks",
                            "code",
                            "fullscreen",
                            "insertdatetime",
                            "media",
                            "table",
                            "code",
                            "help",
                            "wordcount",
                        ],
                        toolbar:
                            "undo redo | blocks | " +
                            "bold italic forecolor | alignleft aligncenter " +
                            "alignright alignjustify | bullist numlist outdent indent | " +
                            "removeformat | help",
                        // Updated content_style to match the template layout
                        content_style:
                            "body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.35; color: #000; padding: 5px; max-width: 1100px; margin: 0 auto; } " +
                            "table { border-collapse: collapse; width: 100%; margin-bottom: 10px; table-layout: fixed; } " +
                            "th, td { vertical-align: middle !important; padding: 5px 6px !important; line-height: 1.35 !important; box-sizing: border-box; } " +
                            "p { margin: 2px 0; } " +
                            "h2 { margin: 0; font-size: 18px; } " +
                            "div { word-break: break-word; }",
                    }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                <Button onClick={handleSave} variant="contained" disabled={saving}>
                    {saving ? "Saving PDF..." : "Save & Download PDF"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DocumentEditorDialog;