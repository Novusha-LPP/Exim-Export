import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;

public class FindSha1 {
    public static void main(String[] args) throws Exception {
        byte[] fileBytes = Files.readAllBytes(Paths.get("1072026Signed.sb"));
        String content = new String(fileBytes, "ISO-8859-1");
        
        int sigStart = content.indexOf("<START-SIGNATURE>");
        byte[] rawPayload = Arrays.copyOfRange(fileBytes, 0, sigStart);
        String payloadStr = new String(rawPayload, "ISO-8859-1");
        
        String targetHex = "D0EF0E260873279600FE993060FEDBA93EE2E9F7";
        
        List<NamedPayload> tests = new ArrayList<>();
        tests.add(new NamedPayload("Exact", rawPayload));
        tests.add(new NamedPayload("Strip \\n", Arrays.copyOfRange(rawPayload, 0, rawPayload.length - 1)));
        
        // Strip trailing spaces/delimiters from each line and join with LF or CRLF
        tests.add(new NamedPayload("Strip trailing delimiters (LF)", rebuildPayload(payloadStr, "\n", true)));
        tests.add(new NamedPayload("Strip trailing delimiters (CRLF)", rebuildPayload(payloadStr, "\r\n", true)));
        tests.add(new NamedPayload("Rebuild lines (LF)", rebuildPayload(payloadStr, "\n", false)));
        tests.add(new NamedPayload("Rebuild lines (CRLF)", rebuildPayload(payloadStr, "\r\n", false)));
        
        // Let's test LF-only normalized
        tests.add(new NamedPayload("LF-only Normalized", toLfOnly(rawPayload)));
        // CRLF-only normalized
        tests.add(new NamedPayload("CRLF-only Normalized", toCrlfOnly(rawPayload)));

        MessageDigest md = MessageDigest.getInstance("SHA-1");
        
        for (NamedPayload np : tests) {
            byte[] hashBytes = md.digest(np.data);
            String hashHex = toHex(hashBytes);
            if (hashHex.equalsIgnoreCase(targetHex)) {
                System.out.println("🎉 SUCCESS! Matching Payload: " + np.name);
                return;
            } else {
                System.out.println("Hash of " + np.name + ": " + hashHex);
            }
        }
        
        System.out.println("❌ NONE MATCHED");
    }
    
    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
    
    private static byte[] toLfOnly(byte[] data) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        for(int i=0; i<data.length; i++) {
            if(data[i] == 13) continue;
            baos.write(data[i]);
        }
        return baos.toByteArray();
    }
    
    private static byte[] toCrlfOnly(byte[] data) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        for(int i=0; i<data.length; i++) {
            if(data[i] == 10 && (i==0 || data[i-1] != 13)) {
                baos.write(13);
            }
            baos.write(data[i]);
        }
        return baos.toByteArray();
    }
    
    private static byte[] rebuildPayload(String payloadStr, String lineSeparator, boolean stripDelimiters) throws Exception {
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
            baos.write(line.getBytes("ISO-8859-1"));
            if (i < lines.length - 1) {
                baos.write(lineSeparator.getBytes("ISO-8859-1"));
            } else {
                if (payloadStr.endsWith("\n")) {
                    baos.write(lineSeparator.getBytes("ISO-8859-1"));
                }
            }
        }
        return baos.toByteArray();
    }
    
    private static class NamedPayload {
        String name;
        byte[] data;
        NamedPayload(String name, byte[] data) {
            this.name = name;
            this.data = data;
        }
    }
}
