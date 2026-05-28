import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.*;

public class TestDelimiters {
    public static void main(String[] args) throws Exception {
        byte[] fileBytes = Files.readAllBytes(Paths.get("1072026Signed.sb"));
        String content = new String(fileBytes, "ISO-8859-1");
        int sigStart = content.indexOf("<START-SIGNATURE>");
        byte[] rawPayload = Arrays.copyOfRange(fileBytes, 0, sigStart);
        String payloadStr = new String(rawPayload, "ISO-8859-1");
        
        String targetHex = "D0EF0E260873279600FE993060FEDBA93EE2E9F7";
        
        char[] possibleDelimiters = {'^', '\t', ' ', ',', '|'};
        String[] lineSepPermutations = {"\n", "\r\n"};
        
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        
        for (char delim : possibleDelimiters) {
            for (String sep : lineSepPermutations) {
                // Try replacing 0x1D with delim
                String replacedStr = payloadStr.replace('\u001D', delim);
                byte[] data = rebuildPayload(replacedStr, sep, false, "ISO-8859-1");
                byte[] hash = md.digest(data);
                String hex = toHex(hash);
                if (hex.equalsIgnoreCase(targetHex)) {
                    System.out.println("🎉 SUCCESS!");
                    System.out.println("Delimiter replaced with: '" + delim + "'");
                    System.out.println("Line Separator: " + (sep.equals("\n") ? "LF" : "CRLF"));
                    return;
                }
                
                // Try replacing ^ with 0x1D
                String replacedStr2 = payloadStr.replace('^', '\u001D');
                byte[] data2 = rebuildPayload(replacedStr2, sep, false, "ISO-8859-1");
                byte[] hash2 = md.digest(data2);
                String hex2 = toHex(hash2);
                if (hex2.equalsIgnoreCase(targetHex)) {
                    System.out.println("🎉 SUCCESS!");
                    System.out.println("Replaced ^ with 0x1D");
                    System.out.println("Line Separator: " + (sep.equals("\n") ? "LF" : "CRLF"));
                    return;
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
