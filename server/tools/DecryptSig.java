import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.security.cert.*;
import java.util.*;
import javax.crypto.Cipher;

public class DecryptSig {
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
        PublicKey publicKey = cert.getPublicKey();
        
        System.out.println("Signature length: " + sigBytes.length + " bytes");
        
        // Decrypt the signature using RSA/ECB/NOPADDING (raw RSA)
        Cipher cipher = Cipher.getInstance("RSA/ECB/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, publicKey);
        byte[] decrypted = cipher.doFinal(sigBytes);
        
        System.out.println("Decrypted length: " + decrypted.length + " bytes");
        System.out.println("Hex dump of decrypted signature:");
        for (int i = 0; i < decrypted.length; i++) {
            System.out.print(String.format("%02X ", decrypted[i]));
            if ((i + 1) % 16 == 0) {
                System.out.println();
            }
        }
        System.out.println();
        
        // Let's also do it for our rejected file to compare!
        if (Files.exists(Paths.get("GIM_EXP_SEA_00107_26-27_3315740.sb"))) {
            byte[] fileBytes2 = Files.readAllBytes(Paths.get("GIM_EXP_SEA_00107_26-27_3315740.sb"));
            String content2 = new String(fileBytes2, "ISO-8859-1");
            int sigStart2 = content2.indexOf("<START-SIGNATURE>");
            int sigEnd2 = content2.indexOf("</START-SIGNATURE>");
            String b64Sig2 = content2.substring(sigStart2 + 17, sigEnd2).trim();
            byte[] sigBytes2 = Base64.getDecoder().decode(b64Sig2);
            
            byte[] decrypted2 = cipher.doFinal(sigBytes2);
            System.out.println("\n--- OUR REJECTED FILE ---");
            System.out.println("Decrypted length: " + decrypted2.length + " bytes");
            System.out.println("Hex dump of decrypted signature:");
            for (int i = 0; i < decrypted2.length; i++) {
                System.out.print(String.format("%02X ", decrypted2[i]));
                if ((i + 1) % 16 == 0) {
                    System.out.println();
                }
            }
            System.out.println();
        }
    }
}
