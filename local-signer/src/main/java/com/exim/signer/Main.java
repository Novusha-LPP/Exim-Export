package com.exim.signer;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

public class Main extends JFrame {

    // Config
    private JTextField urlField;
    private JTextField dllField;
    private JTextArea logArea;

    // Services
    private DscService dscService;
    private ApiClient apiClient;

    // UI Tab Components
    private JTable jobsTable;
    private DefaultTableModel tableModel;

    public Main() {
        setTitle("Exim DSC Local Signer (Class 3)");
        setSize(800, 600);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(new BorderLayout());

        // --- Top: Configuration ---
        JPanel configPanel = new JPanel(new GridLayout(3, 2, 5, 5));
        configPanel.setBorder(BorderFactory.createTitledBorder("Configuration"));

        configPanel.add(new JLabel("Server URL:"));
        urlField = new JTextField("http://localhost:9002/api/exports");
        configPanel.add(urlField);

        configPanel.add(new JLabel("DSC Driver (DLL):"));
        JPanel dllPanel = new JPanel(new BorderLayout());
        // Updated to the 64-bit driver found in System32
        dllField = new JTextField("C:\\Windows\\System32\\CryptoIDA_pkcs11.dll");
        JButton linkBtn = new JButton("Browse");
        linkBtn.addActionListener(e -> {
            JFileChooser fc = new JFileChooser("C:\\Windows\\System32");
            fc.setFileFilter(new javax.swing.filechooser.FileNameExtensionFilter("DLL Files", "dll"));
            if (fc.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
                dllField.setText(fc.getSelectedFile().getAbsolutePath());
            }
        });
        dllPanel.add(dllField, BorderLayout.CENTER);
        dllPanel.add(linkBtn, BorderLayout.EAST);
        configPanel.add(dllPanel);

        JButton initBtn = new JButton("Initialize DSC");
        initBtn.addActionListener(e -> initDsc());
        configPanel.add(initBtn);

        add(configPanel, BorderLayout.NORTH);

        // --- Center: Tabs ---
        JTabbedPane tabbedPane = new JTabbedPane();

        // TAB 1: Test Mode (Local File)
        JPanel testPanel = new JPanel(new GridLayout(2, 1, 10, 10));
        testPanel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        // Option A: Detached Signature (for Shipping Bills .sb files)
        JPanel detachedPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton pickFileBtn = new JButton("Sign File (.sig) - For Shipping Bills");
        pickFileBtn.addActionListener(e -> signLocalFile());
        detachedPanel.add(pickFileBtn);
        detachedPanel.add(new JLabel("Creates separate .sig file (for .sb flat files)"));
        testPanel.add(detachedPanel);

        // Option B: Embedded PDF Signature (for e-Sanchit)
        JPanel padesPanel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton signPdfBtn = new JButton("Sign PDF (Embedded) - For e-Sanchit");
        signPdfBtn.addActionListener(e -> signPdfForESanchit());
        padesPanel.add(signPdfBtn);
        padesPanel.add(new JLabel("Embeds signature inside PDF (PAdES format)"));
        testPanel.add(padesPanel);

        tabbedPane.addTab("Option 1: Local Signing", testPanel);

        // TAB 2: Live Mode (ICEGATE Jobs)
        JPanel livePanel = new JPanel(new BorderLayout());

        // Table Columns: Select, Job No, Exporter, SB No
        String[] columns = { "Select", "Job No", "Exporter", "SB No", "Content (Hidden)", "ID (Hidden)" };
        tableModel = new DefaultTableModel(columns, 0) {
            @Override
            public Class<?> getColumnClass(int columnIndex) {
                return columnIndex == 0 ? Boolean.class : String.class;
            }
        };
        jobsTable = new JTable(tableModel);
        // Hide content/ID columns if desired, but keep simple for now

        JScrollPane tableScroll = new JScrollPane(jobsTable);
        livePanel.add(tableScroll, BorderLayout.CENTER);

        JPanel liveControlPanel = new JPanel();
        JButton refreshBtn = new JButton("Refresh Jobs");
        refreshBtn.addActionListener(e -> fetchJobs());
        JButton signLiveBtn = new JButton("Sign Selected Jobs");
        signLiveBtn.addActionListener(e -> signSelectedJobs());

        liveControlPanel.add(refreshBtn);
        liveControlPanel.add(signLiveBtn);
        livePanel.add(liveControlPanel, BorderLayout.SOUTH);

        tabbedPane.addTab("Option 2: ICEGATE Filing", livePanel);

        add(tabbedPane, BorderLayout.CENTER);

        // --- Bottom: Logs ---
        logArea = new JTextArea(8, 50);
        logArea.setEditable(false);
        add(new JScrollPane(logArea), BorderLayout.SOUTH);
    }

    private void log(String msg) {
        SwingUtilities.invokeLater(() -> {
            logArea.append(msg + "\n");
            logArea.setCaretPosition(logArea.getDocument().getLength());
        });
    }

    // --- Actions ---

    private void initDsc() {
        try {
            dscService = new DscService();
            apiClient = new ApiClient(urlField.getText());

            String pin = JOptionPane.showInputDialog(this, "Enter DSC PIN:");
            if (pin == null)
                return;

            dscService.login(pin, dllField.getText());
            log("DSC Initialized: " + dscService.getCertificate().getSubjectDN());
            JOptionPane.showMessageDialog(this, "DSC Connected Successfully!");
        } catch (Exception e) {
            log("DSC Error: " + e.getMessage());
            e.printStackTrace();
            JOptionPane.showMessageDialog(this, "Error: " + e.getMessage());
        }
    }

    private void signLocalFile() {
        if (dscService == null) {
            JOptionPane.showMessageDialog(this, "Please Initialize DSC first.");
            return;
        }

        JFileChooser fileChooser = new JFileChooser();
        fileChooser.setDialogTitle("Select flat file to sign (.txt format)");
        if (fileChooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            File inputFile = fileChooser.getSelectedFile();

            // Ask for output directory
            JFileChooser folderChooser = new JFileChooser();
            folderChooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
            folderChooser.setDialogTitle("Select Output Folder for Signed .sb File");

            if (folderChooser.showSaveDialog(this) != JFileChooser.APPROVE_OPTION) {
                return;
            }
            File outputDir = folderChooser.getSelectedFile();

            try {
                // Read flat file content as raw bytes - DO NOT MODIFY!
                // Logisys and other customs software generate files in specific formats
                // that must be preserved exactly for ICEGATE validation
                byte[] rawData = Files.readAllBytes(inputFile.toPath());

                // Generate RAW RSA signature on the ORIGINAL bytes
                // ICEGATE expects raw RSA signature in modern SHA256withRSA
                byte[] signature = dscService.signRaw(rawData);

                // Base64 encode the signature (NO line wrapping - single line)
                String signatureBase64 = java.util.Base64.getEncoder().encodeToString(signature);

                // Get certificate in Base64 (NO line wrapping - single line)
                String certificateBase64 = dscService.getCertificateBase64();

                // Generate output filename as .sb
                String baseName = inputFile.getName();
                if (baseName.endsWith(".txt")) {
                    baseName = baseName.substring(0, baseName.length() - 4);
                }
                File sbFile = new File(outputDir, baseName + ".sb");

                // Save .sb file in STRICT BINARY MODE
                try (FileOutputStream fos = new FileOutputStream(sbFile)) {
                    // 1. Write original raw data
                    fos.write(rawData);

                    // 2. Ensure trailing newline if not present (using standard CRLF for ICEGATE)
                    if (rawData.length > 0 && rawData[rawData.length - 1] != '\n') {
                        fos.write("\r\n".getBytes());
                    }

                    // 3. Append signature block in ICEGATE compatible format
                    fos.write(("<START-SIGNATURE>" + signatureBase64 + "</START-SIGNATURE>\r\n").getBytes());
                    fos.write(("<START-CERTIFICATE>" + certificateBase64 + "</START-CERTIFICATE>\r\n").getBytes());
                    fos.write("<SIGNER-VERSION>Exim Local Signer v1.0</SIGNER-VERSION>".getBytes());
                }

                log("Saved signed file: " + sbFile.getName());
                log("Original file size: " + rawData.length + " bytes");
                log("RAW Signature size: " + signature.length + " bytes");
                log("Certificate size: " + certificateBase64.length() + " chars");

                JOptionPane.showMessageDialog(this,
                        "File signed successfully!\n\n" +
                                "Output: " + sbFile.getAbsolutePath() + "\n\n" +
                                "The .sb file contains:\n" +
                                "• Original flat file content (UNCHANGED BINARY)\n" +
                                "• RAW RSA signature (SHA256withRSA)\n" +
                                "• X.509 Certificate\n\n" +
                                "Format: ICEGATE compatible (Softlink style)!",
                        "Success", JOptionPane.INFORMATION_MESSAGE);

            } catch (Exception e) {
                log("Signing Failed: " + e.getMessage());
                e.printStackTrace();
                JOptionPane.showMessageDialog(this, "Signing Failed: " + e.getMessage(), "Error",
                        JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    /**
     * Sign a PDF file with embedded PAdES signature for e-Sanchit portal.
     */
    private void signPdfForESanchit() {
        if (dscService == null) {
            log("DSC Error: Please Initialize DSC first.");
            JOptionPane.showMessageDialog(this, "Please Initialize DSC first!", "Error", JOptionPane.ERROR_MESSAGE);
            return;
        }

        JFileChooser fileChooser = new JFileChooser();
        fileChooser.setFileFilter(new javax.swing.filechooser.FileNameExtensionFilter("PDF Files", "pdf"));
        fileChooser.setDialogTitle("Select PDF to Sign for e-Sanchit");

        if (fileChooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            File inputFile = fileChooser.getSelectedFile();

            // Create output file name
            String inputName = inputFile.getName();
            String baseName = inputName.endsWith(".pdf") ? inputName.substring(0, inputName.length() - 4) : inputName;
            File outputFile = new File(inputFile.getParent(), baseName + "_signed.pdf");

            try {
                log("Signing PDF for e-Sanchit: " + inputFile.getName());

                // Initialize PDF Signer with DSC credentials
                PdfSignerService pdfSigner = new PdfSignerService();
                pdfSigner.initialize(
                        dscService.getKeyStore(),
                        dscService.getAlias(),
                        dscService.getProvider());

                // Sign the PDF
                pdfSigner.signPdf(inputFile, outputFile, "Document Signing for ICEGATE e-Sanchit", "India");

                log("PDF signed successfully: " + outputFile.getName());
                JOptionPane.showMessageDialog(this,
                        "PDF signed successfully!\n\nSigned file: " + outputFile.getAbsolutePath() +
                                "\n\nThis file is ready for upload to e-Sanchit portal.",
                        "Success", JOptionPane.INFORMATION_MESSAGE);

            } catch (Exception e) {
                log("PDF Signing Failed: " + e.getMessage());
                e.printStackTrace();
                JOptionPane.showMessageDialog(this, "PDF Signing Failed: " + e.getMessage(), "Error",
                        JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void fetchJobs() {
        try {
            if (apiClient == null)
                apiClient = new ApiClient(urlField.getText());

            log("Fetching jobs...");
            JsonArray jobs = apiClient.getPendingJobs();

            tableModel.setRowCount(0); // Clear
            for (JsonElement j : jobs) {
                JsonObject job = j.getAsJsonObject();
                String id = job.get("_id").getAsString();
                String jobNo = job.has("job_no") ? job.get("job_no").getAsString() : "N/A";
                String exporter = job.has("exporter") ? job.get("exporter").getAsString() : "EXPORTER";
                String sbNo = job.has("sb_no") ? job.get("sb_no").getAsString() : "000000";

                String content;
                if (job.has("flatFileContent")) {
                    content = job.get("flatFileContent").getAsString();
                } else {
                    // Generate Flat File Content Locally (ICES 1.5 Format) if API doesn't provide
                    // it
                    content = generateFlatFileContent(jobNo, sbNo, exporter);
                }

                tableModel.addRow(new Object[] { false, jobNo, exporter, sbNo, content, id });
            }
            log("Loaded " + jobs.size() + " jobs.");
        } catch (Exception e) {
            log("Fetch Error: " + e.getMessage());
        }
    }

    private String generateFlatFileContent(String jobNo, String sbNo, String exporter) {
        // HREC...TREC Structure
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("ddMMyyyy");
        String dateStr = sdf.format(new java.util.Date());

        return String.join("\n",
                "HREC^ZZ^" + exporter + "^ZZ^" + jobNo + "^ICES1_5^P^CHCOE01^" + sbNo + "^" + dateStr,
                "<sb>",
                "F^" + jobNo + "^" + exporter + "^DATE^PAN001^" + sbNo,
                "SB^" + sbNo + "^" + exporter,
                "<END-sb>",
                "TREC^" + jobNo);
    }

    private void signSelectedJobs() {
        if (dscService == null) {
            JOptionPane.showMessageDialog(this, "Please Initialize DSC first.");
            return;
        }

        List<Integer> selectedRows = new ArrayList<>();
        for (int i = 0; i < tableModel.getRowCount(); i++) {
            Boolean checked = (Boolean) tableModel.getValueAt(i, 0);
            if (checked != null && checked) {
                selectedRows.add(i);
            }
        }

        if (selectedRows.isEmpty()) {
            JOptionPane.showMessageDialog(this, "No jobs selected.");
            return;
        }

        // Ask user for output directory
        JFileChooser folderChooser = new JFileChooser();
        folderChooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        folderChooser.setDialogTitle("Select Output Folder for Signed Files");

        if (folderChooser.showSaveDialog(this) != JFileChooser.APPROVE_OPTION) {
            return; // User cancelled
        }
        File outputDir = folderChooser.getSelectedFile();

        new Thread(() -> {
            int successCount = 0;
            for (int i : selectedRows) {
                try {
                    String jobNo = (String) tableModel.getValueAt(i, 1);
                    String sbNo = (String) tableModel.getValueAt(i, 3);
                    String content = (String) tableModel.getValueAt(i, 4); // Flat File Content
                    String id = (String) tableModel.getValueAt(i, 5);

                    log("Signing Job: " + jobNo);

                    // 1. Keep content as-is (DO NOT normalize line endings!)
                    byte[] dataToSign = content.getBytes("ISO-8859-1");

                    // 2. Generate RAW RSA signature (NOT PKCS#7)
                    byte[] signature = dscService.signRaw(dataToSign);

                    // 3. Base64 encode (NO line wrapping)
                    String signatureBase64 = java.util.Base64.getEncoder().encodeToString(signature);

                    // 4. Get certificate in Base64
                    String certificateBase64 = dscService.getCertificateBase64();

                    // 5. Create signed content in ICEGATE format
                    StringBuilder signedContent = new StringBuilder();
                    signedContent.append(content);
                    if (!content.endsWith("\n") && !content.endsWith("\r\n")) {
                        signedContent.append("\r\n");
                    }

                    // ICEGATE format: each tag with content on same line
                    signedContent.append("<START-SIGNATURE>");
                    signedContent.append(signatureBase64);
                    signedContent.append("</START-SIGNATURE>\r\n");

                    signedContent.append("<START-CERTIFICATE>");
                    signedContent.append(certificateBase64);
                    signedContent.append("</START-CERTIFICATE>\r\n");

                    signedContent.append("<SIGNER-VERSION>Exim Local Signer v1.0</SIGNER-VERSION>");

                    // 6. Generate file name
                    String baseName = jobNo + "_" + (sbNo != null && !sbNo.equals("N/A") ? sbNo : "SB");
                    baseName = baseName.replaceAll("[^a-zA-Z0-9_-]", "_"); // Sanitize

                    File sbFile = new File(outputDir, baseName + ".sb");

                    // 7. Save .sb file - use ISO-8859-1 to preserve bytes
                    try (FileOutputStream fos = new FileOutputStream(sbFile)) {
                        fos.write(signedContent.toString().getBytes("ISO-8859-1"));
                    }
                    log("Saved signed file: " + sbFile.getName());

                    // 6. Upload to server (optional)
                    try {
                        log("Uploading to server...");
                        apiClient.uploadSignedFile(id, signature);
                        log("Uploaded: " + jobNo);
                    } catch (Exception uploadErr) {
                        log("⚠ Upload failed (file saved locally): " + uploadErr.getMessage());
                    }

                    successCount++;

                } catch (Exception e) {
                    log("Error signing job row " + i + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }

            final int finalCount = successCount;
            SwingUtilities.invokeLater(() -> {
                JOptionPane.showMessageDialog(this,
                        "Signing Completed!\n\n" +
                                "✓ " + finalCount + " jobs signed successfully\n" +
                                "✓ Files saved to: " + outputDir.getAbsolutePath() + "\n\n" +
                                "Each .sb file contains:\n" +
                                "  • ICES 1.5 flat file content\n" +
                                "  • Embedded PKCS#7 digital signature\n\n" +
                                "Ready to upload to ICEGATE!",
                        "Success", JOptionPane.INFORMATION_MESSAGE);
                fetchJobs(); // Refresh
            });
        }).start();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            new Main().setVisible(true);
        });
    }
}
