import java.io.*;
import java.nio.file.*;
import java.security.*;

public class BruteForceRange {
    public static void main(String[] args) throws Exception {
        byte[] fileBytes = Files.readAllBytes(Paths.get("1072026Signed.sb"));
        String targetHex = "D0EF0E260873279600FE993060FEDBA93EE2E9F7";
        
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        int maxLen = 3000; // rawPayload is 2973 bytes
        
        System.out.println("Brute-forcing all possible continuous subsegments...");
        for (int start = 0; start < maxLen; start++) {
            for (int end = start + 1; end <= maxLen; end++) {
                md.reset();
                md.update(fileBytes, start, end - start);
                byte[] hash = md.digest();
                if (toHex(hash).equalsIgnoreCase(targetHex)) {
                    System.out.println("🎉 MATCH FOUND!");
                    System.out.println("Start Offset: " + start);
                    System.out.println("End Offset: " + end);
                    System.out.println("Length: " + (end - start));
                    
                    byte[] segment = new byte[end - start];
                    System.arraycopy(fileBytes, start, segment, 0, end - start);
                    String text = new String(segment, "ISO-8859-1");
                    System.out.println("Content Preview:");
                    System.out.println(text.substring(0, Math.min(200, text.length())));
                    System.out.println("...");
                    System.out.println(text.substring(Math.max(0, text.length() - 200)));
                    return;
                }
            }
        }
        System.out.println("❌ NO MATCH FOUND");
    }
    
    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
