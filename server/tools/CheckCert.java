import java.io.*;
import java.nio.file.*;
import java.security.cert.*;
import java.util.*;

public class CheckCert {
    public static void main(String[] args) throws Exception {
        byte[] fileBytes = Files.readAllBytes(Paths.get("1072026Signed.sb"));
        String content = new String(fileBytes, "ISO-8859-1");
        
        int certStart = content.indexOf("<START-CERTIFICATE>");
        int certEnd = content.indexOf("</START-CERTIFICATE>");
        String b64Cert = content.substring(certStart + 19, certEnd).trim();
        byte[] certBytes = Base64.getDecoder().decode(b64Cert);
        
        CertificateFactory cf = CertificateFactory.getInstance("X.509");
        X509Certificate cert = (X509Certificate) cf.generateCertificate(new ByteArrayInputStream(certBytes));
        
        System.out.println("Subject: " + cert.getSubjectDN());
        System.out.println("Issuer: " + cert.getIssuerDN());
        System.out.println("Valid From: " + cert.getNotBefore());
        System.out.println("Valid To: " + cert.getNotAfter());
        System.out.println("Algorithm: " + cert.getSigAlgName());
        System.out.println("Public Key Algorithm: " + cert.getPublicKey().getAlgorithm());
    }
}
