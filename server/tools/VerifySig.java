import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.*;
import java.util.*;

public class VerifySig {
    public static void main(String[] args) throws Exception {
        byte[] fileBytes = Files.readAllBytes(Paths.get("1072026Signed.sb"));
        String content = new String(fileBytes, "ISO-8859-1");
        
        int sigStart = content.indexOf("<START-SIGNATURE>");
        int sigEnd = content.indexOf("</START-SIGNATURE>");
        int certStart = content.indexOf("<START-CERTIFICATE>");
        int certEnd = content.indexOf("</START-CERTIFICATE>");
        
        String b64Sig = content.substring(sigStart + 17, sigEnd).trim();
        String b64Cert = content.substring(certStart + 19, certEnd).trim();
        
        byte[] sigBytes = Base64.getDecoder().decode(b64Sig);
        byte[] certBytes = Base64.getDecoder().decode(b64Cert);
        
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        X509Certificate cert = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));
        
        List<NamedPayload> tests = new ArrayList<>();
        
        // Extract raw payload up to <START-SIGNATURE>
        byte[] rawPayload = Arrays.copyOfRange(fileBytes, 0, sigStart);
        String payloadStr = new String(rawPayload, "ISO-8859-1");
        
        // Test 1: Exact
        tests.add(new NamedPayload("Exact", rawPayload));
        
        // Test 2: Strip trailing 0x1D and spaces from each line
        tests.add(new NamedPayload("Strip trailing delimiters (LF)", rebuildPayload(payloadStr, "\n", true)));
        tests.add(new NamedPayload("Strip trailing delimiters (CRLF)", rebuildPayload(payloadStr, "\r\n", true)));
        
        // Test 3: Rebuild lines without stripping anything (just standard LF or CRLF)
        tests.add(new NamedPayload("Rebuild lines (LF)", rebuildPayload(payloadStr, "\n", false)));
        tests.add(new NamedPayload("Rebuild lines (CRLF)", rebuildPayload(payloadStr, "\r\n", false)));
        
        // Test 4: Rebuild but with strip trailing space only
        tests.add(new NamedPayload("Strip trailing space only (LF)", rebuildSpaceOnly(payloadStr, "\n")));
        tests.add(new NamedPayload("Strip trailing space only (CRLF)", rebuildSpaceOnly(payloadStr, "\r\n")));

        String[] algos = {"SHA256withRSA", "SHA1withRSA", "MD5withRSA"};
        for(String algo : algos) {
            System.out.println("Testing " + algo + "...");
            Signature verifier = Signature.getInstance(algo);
            for (NamedPayload np : tests) {
                verifier.initVerify(cert);
                verifier.update(np.data);
                if (verifier.verify(sigBytes)) {
                    System.out.println("SUCCESS! Algo: " + algo + ", Payload: " + np.name);
                    return;
                }
            }
        }
        
        System.out.println("NONE WORKED");
    }
    
    private static byte[] rebuildPayload(String payloadStr, String lineSeparator, boolean stripDelimiters) throws Exception {
        String[] lines = payloadStr.split("\\r?\\n");
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (stripDelimiters) {
                // Strip trailing 0x1D (GS) and spaces (0x20)
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
                // If original payloadStr ended with a newline, append it
                if (payloadStr.endsWith("\n")) {
                    baos.write(lineSeparator.getBytes("ISO-8859-1"));
                }
            }
        }
        return baos.toByteArray();
    }
    
    private static byte[] rebuildSpaceOnly(String payloadStr, String lineSeparator) throws Exception {
        String[] lines = payloadStr.split("\\r?\\n");
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            int len = line.length();
            while (len > 0 && (line.charAt(len - 1) == 0x20 || line.charAt(len - 1) == '\r')) {
                len--;
            }
            line = line.substring(0, len);
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
