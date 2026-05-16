package com.exim.signer;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.google.gson.JsonObject;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.cert.X509Certificate;
import java.util.*;
import java.util.concurrent.Executors;

public class SigningServer {

    private static final int PORT = 5000;
    private final DscService dscService;
    private final PdfSignerService pdfSignerService;
    private final Properties config;

    public SigningServer(DscService dscService) {
        this.dscService = dscService;
        this.pdfSignerService = new PdfSignerService();
        this.config = new Properties();
        loadConfig();
    }

    private void loadConfig() {
        try (InputStream input = new FileInputStream("config.properties")) {
            config.load(input);
            System.out.println("✅ Configuration loaded from config.properties");
        } catch (IOException ex) {
            System.err.println("⚠ Could not find config.properties, using defaults (or manual login required)");
        }
    }

    public void start() throws Exception {
        // Initialize DSC automatically if PIN is in config
        String pin = config.getProperty("dsc.pin");
        String dllPath = config.getProperty("dsc.dllPath", "C:\\Windows\\System32\\CryptoIDA_pkcs11.dll");

        if (pin != null && !pin.isEmpty()) {
            try {
                System.out.println("🔄 Initializing DSC from config...");
                dscService.login(pin, dllPath);
                pdfSignerService.initialize(dscService);
                System.out.println("✅ DSC Initialized for Server.");
            } catch (Exception e) {
                System.err.println("❌ Failed to initialize DSC at startup: " + e.getMessage());
            }
        }

        int portToUse = PORT;
        try {
            String portStr = config.getProperty("server.port");
            if (portStr != null) {
                portToUse = Integer.parseInt(portStr);
            }
        } catch (NumberFormatException e) {
            System.err.println("⚠ Invalid port in config, using default " + PORT);
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(portToUse), 0);

        server.createContext("/status", new StatusHandler());
        server.createContext("/login", new LoginHandler());
        server.createContext("/sign/pdf", new PdfSignHandler());
        server.createContext("/sign/flatfile", new FlatFileSignHandler());

        server.setExecutor(Executors.newFixedThreadPool(5));
        server.start();

        System.out.println("🚀 Signing Server started on port " + portToUse);
        System.out.println("📍 Endpoints: /status, /sign/pdf, /sign/flatfile");
    }

    private class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            log(exchange, "GET /status");
            JsonObject response = new JsonObject();
            boolean connected = false;
            try {
                connected = dscService.getCertificate() != null;
                response.addProperty("status", "ok");
                response.addProperty("dongle", connected ? "connected" : "not found");
                response.addProperty("subject",
                        connected ? dscService.getCertificate().getSubjectDN().getName() : "N/A");
            } catch (Exception e) {
                response.addProperty("status", "error");
                response.addProperty("dongle", "not found");
                response.addProperty("error", e.getMessage());
            }

            sendResponse(exchange, 200, response.toString(), "application/json");
        }
    }

    private class LoginHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                sendError(exchange, 405, "Method Not Allowed");
                return;
            }

            log(exchange, "POST /login");

            try {
                // Read JSON body
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                com.google.gson.Gson gson = new com.google.gson.Gson();
                JsonObject json = gson.fromJson(body, JsonObject.class);

                String pin = json.has("pin") ? json.get("pin").getAsString() : null;
                String dllPath = json.has("dllPath") ? json.get("dllPath").getAsString()
                        : config.getProperty("dsc.dllPath", "C:\\Windows\\System32\\CryptoIDA_pkcs11.dll");

                if (pin == null || pin.isEmpty()) {
                    sendError(exchange, 400, "PIN is required");
                    return;
                }

                synchronized (dscService) {
                    dscService.login(pin, dllPath);
                    pdfSignerService.initialize(dscService);
                }

                JsonObject response = new JsonObject();
                response.addProperty("status", "ok");
                response.addProperty("message", "DSC initialized successfully");
                sendResponse(exchange, 200, response.toString(), "application/json");

            } catch (Exception e) {
                e.printStackTrace();
                sendError(exchange, 500, "Initialization Failed: " + e.getMessage());
            }
        }
    }

    private class PdfSignHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                sendError(exchange, 405, "Method Not Allowed");
                return;
            }

            log(exchange, "POST /sign/pdf");

            try {
                byte[] fileBytes = parseMultipart(exchange);
                if (fileBytes == null) {
                    sendError(exchange, 400, "Missing 'file' field in multipart data");
                    return;
                }

                File tempInput = File.createTempFile("input-", ".pdf");
                File tempOutput = File.createTempFile("signed-", ".pdf");
                Files.write(tempInput.toPath(), fileBytes);

                synchronized (dscService) {
                    pdfSignerService.signPdf(tempInput, tempOutput, "Document Signing", "India");
                }

                byte[] signedBytes = Files.readAllBytes(tempOutput.toPath());

                // Cleanup
                tempInput.delete();
                tempOutput.delete();

                exchange.getResponseHeaders().set("Content-Disposition", "attachment; filename=\"signed.pdf\"");
                sendResponse(exchange, 200, signedBytes, "application/octet-stream");
                System.out.println("✅ PDF Signed successfully (" + signedBytes.length + " bytes)");

            } catch (Exception e) {
                e.printStackTrace();
                sendError(exchange, 500, "Signing Failed: " + e.getMessage());
            }
        }
    }

    private class FlatFileSignHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                sendError(exchange, 405, "Method Not Allowed");
                return;
            }

            log(exchange, "POST /sign/flatfile");

            try {
                byte[] rawBytes = parseMultipart(exchange);
                if (rawBytes == null) {
                    sendError(exchange, 400, "Missing 'file' field in multipart data");
                    return;
                }

                byte[] originalBytes = rawBytes; // keep original for writing to file

                // Prepare the exact bytes that will form the payload in the file
                String dataPart = new String(originalBytes, "ISO-8859-1").stripTrailing();
                byte[] exactPayloadBytes = (dataPart + "\n").getBytes("ISO-8859-1");

                byte[] signature;
                String certificateBase64;

                synchronized (dscService) {
                    // Sign EXACTLY what will be written to the file
                    signature = dscService.signRaw(exactPayloadBytes);
                    certificateBase64 = dscService.getCertificateBase64();
                }

                String signatureBase64 = Base64.getEncoder().encodeToString(signature);

                // Construct ICEGATE .sb format
                ByteArrayOutputStream baos = new ByteArrayOutputStream();

                // Write the exact payload bytes
                baos.write(exactPayloadBytes);

                // Append signature blocks with \n (LF only — matches V-NCODE format)
                baos.write(("<START-SIGNATURE>" + signatureBase64 + "</START-SIGNATURE>\n").getBytes("ISO-8859-1"));
                baos.write(("<START-CERTIFICATE>" + certificateBase64 + "</START-CERTIFICATE>\n")
                        .getBytes("ISO-8859-1"));
                baos.write("<SIGNER-VERSION>V-NCODE_01.05.2013</SIGNER-VERSION>".getBytes("ISO-8859-1"));

                byte[] outputBytes = baos.toByteArray();

                exchange.getResponseHeaders().set("Content-Disposition", "attachment; filename=\"signed.sb\"");
                sendResponse(exchange, 200, outputBytes, "application/octet-stream");
                System.out.println("✅ Flat file signed successfully (" + outputBytes.length + " bytes)");

            } catch (Exception e) {
                e.printStackTrace();
                sendError(exchange, 500, "Signing Failed: " + e.getMessage());
            }
        }
    }

    /**
     * Minimal Multipart Parser (Handles only the first file field named "file")
     */
    private byte[] parseMultipart(HttpExchange exchange) throws IOException {
        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        if (contentType == null || !contentType.contains("boundary=")) {
            return null;
        }

        String boundary = "--" + contentType.split("boundary=")[1];
        byte[] body = exchange.getRequestBody().readAllBytes();

        // Find boundary
        int start = indexOf(body, boundary.getBytes(), 0) + boundary.length();
        // Skip headers (until double CRLF)
        int headerEnd = indexOf(body, "\r\n\r\n".getBytes(), start) + 4;
        // Find next boundary
        int end = indexOf(body, boundary.getBytes(), headerEnd) - 2; // -2 for CRLF before boundary

        if (start < 0 || headerEnd < 0 || end < 0)
            return null;

        return Arrays.copyOfRange(body, headerEnd, end);
    }

    private int indexOf(byte[] array, byte[] target, int start) {
        for (int i = start; i <= array.length - target.length; i++) {
            boolean found = true;
            for (int j = 0; j < target.length; j++) {
                if (array[i + j] != target[j]) {
                    found = false;
                    break;
                }
            }
            if (found)
                return i;
        }
        return -1;
    }

    private void sendResponse(HttpExchange exchange, int code, String body, String type) throws IOException {
        sendResponse(exchange, code, body.getBytes(StandardCharsets.UTF_8), type);
    }

    private void sendResponse(HttpExchange exchange, int code, byte[] body, String type) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", type);
        exchange.sendResponseHeaders(code, body.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(body);
        }
    }

    private void sendError(HttpExchange exchange, int code, String message) throws IOException {
        JsonObject error = new JsonObject();
        error.addProperty("error", message);
        sendResponse(exchange, code, error.toString(), "application/json");
        System.err.println("❌ Error [" + code + "]: " + message);
    }

    private void log(HttpExchange exchange, String endpoint) {
        String timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
        System.out.println("[" + timestamp + "] Request: " + endpoint + " from " + exchange.getRemoteAddress());
    }
}
