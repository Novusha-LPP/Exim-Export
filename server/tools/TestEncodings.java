import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;

public class TestEncodings {
    public static void main(String[] args) throws Exception {
        byte[] fileBytes = Files.readAllBytes(Paths.get("1072026Signed.sb"));
        String content = new String(fileBytes, "ISO-8859-1");
        int sigStart = content.indexOf("<START-SIGNATURE>");
        byte[] rawPayload = Arrays.copyOfRange(fileBytes, 0, sigStart);
        String payloadStr = new String(rawPayload, "ISO-8859-1");
        
        String targetHex = "D0EF0E260873279600FE993060FEDBA93EE2E9F7";
        
        String[] encodings = {"UTF-8", "UTF-16LE", "UTF-16BE", "UTF-16", "US-ASCII", "ISO-8859-1"};
        String[] lineSepPermutations = {"\n", "\r\n"};
        boolean[] stripDelimitersPermutations = {false, true};
        
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        
        for (String enc : encodings) {
            for (String sep : lineSepPermutations) {
                for (boolean strip : stripDelimitersPermutations) {
                    byte[] data = rebuildPayload(payloadStr, sep, strip, enc);
                    byte[] hash = md.digest(data);
                    String hex = toHex(hash);
                    if (hex.equalsIgnoreCase(targetHex)) {
                        System.out.println("🎉 SUCCESS!");
                        System.out.println("Encoding: " + enc);
                        System.out.println("Line Separator: " + (sep.equals("\n") ? "LF" : "CRLF"));
                        System.out.println("Strip Delimiters: " + strip);
                        return;
                    }
                }
            }
        }
        
        // What if it hashes without HREC and TREC lines?
        String[] lines = payloadStr.split("\\r?\\n");
        if (lines.length > 2) {
            // Strip first and last lines
            StringBuilder sb = new StringBuilder();
            for (int i = 1; i < lines.length - 1; i++) {
                sb.append(lines[i]).append("\n");
            }
            String subPayload = sb.toString();
            for (String enc : encodings) {
                for (String sep : lineSepPermutations) {
                    for (boolean strip : stripDelimitersPermutations) {
                        byte[] data = rebuildPayload(subPayload, sep, strip, enc);
                        byte[] hash = md.digest(data);
                        String hex = toHex(hash);
                        if (hex.equalsIgnoreCase(targetHex)) {
                            System.out.println("🎉 SUCCESS (Sub-payload)!");
                            System.out.println("Encoding: " + enc);
                            System.out.println("Line Separator: " + (sep.equals("\n") ? "LF" : "CRLF"));
                            System.out.println("Strip Delimiters: " + strip);
                            return;
                        }
                    }
                }
            }
        }
        
        System.out.println("❌ NONE MATCHED");
    }
    
    private static byte[] rebuildPayload(String payloadStr, String lineSeparator, boolean stripDelimiters, String encoding) throws Exception {
        String[] lines = payloadStr.split("\\r?\\n");
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (stripDelimiters) {
                int len = line.length();
                while (len > 0 && (line.charAt(len - 1) == 0x1D || line.charAt(len - 1) == 0x20 || line.charAt(len - 1) == '\r')) {
                    len--;
                }
                line = line.substring(0, len);
            }
            baos.write(line.getBytes(encoding));
            if (i < lines.length - 1) {
                baos.write(lineSeparator.getBytes(encoding));
            } else {
                if (payloadStr.endsWith("\n")) {
                    baos.write(lineSeparator.getBytes(encoding));
                }
            }
        }
        return baos.toByteArray();
    }
    
    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
