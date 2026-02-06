package com.exim.signer;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class ApiClient {
    private final String baseUrl;
    private final HttpClient client;
    private final Gson gson;

    public ApiClient(String baseUrl) {
        this.baseUrl = baseUrl;
        this.client = HttpClient.newHttpClient();
        this.gson = new Gson();
    }

    public JsonArray getPendingJobs() throws Exception {
        // Clean trailing slash from baseUrl
        String cleanBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;

        // Use baseUrl directly if it ends with /api/exports (user's preferred fetch
        // endpoint)
        // Otherwise append /api/signer/jobs for default behavior
        String urlToCheck;
        if (cleanBase.endsWith("/api/exports")) {
            urlToCheck = cleanBase; // Use as-is
        } else {
            urlToCheck = cleanBase + "/api/signer/jobs";
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(urlToCheck))
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JavaLocalSigner/1.0")
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            String body = response.body();
            // Check if response is Object (wrapped) or Array (direct)
            JsonElement root = gson.fromJson(body, JsonElement.class);

            if (root.isJsonArray()) {
                return root.getAsJsonArray();
            } else if (root.isJsonObject()) {
                JsonObject obj = root.getAsJsonObject();
                if (obj.has("data") && obj.get("data").isJsonObject()) {
                    JsonObject data = obj.getAsJsonObject("data");
                    if (data.has("jobs") && data.get("jobs").isJsonArray()) {
                        return data.getAsJsonArray("jobs");
                    }
                } else if (obj.has("jobs") && obj.get("jobs").isJsonArray()) {
                    return obj.getAsJsonArray("jobs");
                }
            }
            // Fallback: Return empty array or throw error if structure unknown
            return new JsonArray();
        } else {
            throw new Exception("HTTP " + response.statusCode() + " for " + urlToCheck);
        }
    }

    public void uploadSignedFile(String jobId, byte[] signedData) throws Exception {
        // Simple multipart/form-data simulation or JSON upload
        // For simplicity in this POC, we will send JSON with Base64 encoded signature
        // Server side (multer) expects multipart, but for this specific Java client
        // implementing manual multipart body is verbose.
        // Let's assume we adjusted server or use a helper for multipart.
        // Actually, let's implement a simple Multipart Body builder or just send JSON
        // if server permits.
        // Based on my server implementation: `upload.any()` expects multipart.
        // I will implement a basic Multipart body generator.

        String boundary = "---boundary" + System.currentTimeMillis();
        String signatureBase64 = Base64.getEncoder().encodeToString(signedData);

        StringBuilder body = new StringBuilder();

        // Field: jobId
        body.append("--").append(boundary).append("\r\n");
        body.append("Content-Disposition: form-data; name=\"jobId\"\r\n\r\n");
        body.append(jobId).append("\r\n");

        // File: signedFile
        body.append("--").append(boundary).append("\r\n");
        body.append("Content-Disposition: form-data; name=\"signedFile\"; filename=\"signature.sig\"\r\n");
        body.append("Content-Type: application/octet-stream\r\n\r\n");
        body.append(signatureBase64).append("\r\n"); // Sending Base64 content for safety in this string builder

        body.append("--").append(boundary).append("--\r\n");

        String uploadUrl;
        // Clean trailing slash
        String cleanBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;

        if (cleanBase.endsWith("/api/exports")) {
            // Replace /api/exports with /api/signer/upload
            uploadUrl = cleanBase.replace("/api/exports", "/api/signer/upload");
        } else {
            // Assume root URL (e.g. localhost:9002) -> localhost:9002/api/signer/upload
            uploadUrl = cleanBase + "/api/signer/upload";
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(uploadUrl))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new Exception("Upload failed: " + response.body());
        }
    }
}
