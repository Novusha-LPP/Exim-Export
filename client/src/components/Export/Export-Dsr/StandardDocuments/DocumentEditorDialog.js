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
}) => {
    const editorRef = useRef(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (editorRef.current) {
            setSaving(true);
            const content = editorRef.current.getContent();

            // Convert HTML to PDF using jsPDF
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "a4",
            });

            try {
                const defaultOptions = {
                    x: 15,
                    y: 15,
                    width: 545,
                    windowWidth: 900,
                    margin: [20, 15, 110, 15],
                    autoPaging: 'slice',
                };
                
                const finalOptions = { ...defaultOptions, ...pdfOptions };

                await doc.html(content, {
                    ...finalOptions,
                    callback: function (doc) {
                        doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
                        if (onSave) onSave(content);
                        setSaving(false);
                        onClose();
                    }
                });
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
                            "body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.2; color: #000; padding: 5px; max-width: 1100px; margin: 0 auto; } " +
                            "table { border-collapse: collapse; width: 100%; margin-bottom: 10px; } " +
                            "table, th, td { border: 1px solid black; padding: 4px; vertical-align: top; } " +
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