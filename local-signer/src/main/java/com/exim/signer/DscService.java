package com.exim.signer;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.file.Files;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Enumeration;
import javax.security.auth.login.LoginException;

import org.bouncycastle.cert.jcajce.JcaCertStore;
import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.CMSSignedDataGenerator;
import org.bouncycastle.cms.CMSTypedData;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;

public class DscService {

    private KeyStore keyStore;
    private Provider pkcs11Provider;
    private String alias;

    public void login(String pin, String dllPath) throws Exception {
        // Create PKCS11 Config
        // Escape backslashes for config
        String sanitizedPath = dllPath.replace("\\", "\\\\");
        String configContent = "name=eToken\nlibrary=" + sanitizedPath;

        File configFile = File.createTempFile("pkcs11-", ".cfg");
        configFile.deleteOnExit();
        Files.writeString(configFile.toPath(), configContent);

        // Load Provider
        // Note: usage might vary across Java versions (9+)
        // For simplicity using a standard reflection approach or SunPKCS11 constructor
        // if available
        // In Java 9+, use Provider.configure()

        pkcs11Provider = Security.getProvider("SunPKCS11");
        if (pkcs11Provider != null) {
            pkcs11Provider = pkcs11Provider.configure(configFile.getAbsolutePath());
            Security.addProvider(pkcs11Provider);
        } else {
            // Fallback or Error for environments without SunPKCS11
            throw new Exception(
                    "SunPKCS11 Provider not found. Please ensure you are using a standard OpenJDK/Oracle JDK.");
        }

        // Load KeyStore
        keyStore = KeyStore.getInstance("PKCS11", pkcs11Provider);
        keyStore.load(null, pin.toCharArray());

        // Get Alias
        Enumeration<String> aliases = keyStore.aliases();
        while (aliases.hasMoreElements()) {
            String tempAlias = aliases.nextElement();
            System.out.println("Checking alias: " + tempAlias);
            if (keyStore.isKeyEntry(tempAlias)) {
                alias = tempAlias;
                System.out.println("Selected Signing Alias: " + alias);
                break;
            }
        }

        if (alias == null) {
            throw new Exception("No valid User Certificate (Private Key) found on token. Found CA certs only?");
        }
    }

    /**
     * Sign data and return PKCS#7/CMS SignedData format (ATTACHED - data included).
     * Uses SHA1withRSA for ICEGATE compatibility.
     */
    public byte[] sign(byte[] data) throws Exception {
        return signInternal(data, false, "SHA1withRSA");
    }

    /**
     * Sign data and return DETACHED PKCS#7/CMS signature (data NOT included).
     * This is required for ICEGATE .sb file format.
     */
    public byte[] signDetached(byte[] data) throws Exception {
        return signInternal(data, true, "SHA1withRSA");
    }

    /**
     * Internal signing method with configurable options.
     * 
     * @param data      The data to sign
     * @param detached  If true, creates detached signature (data not included in
     *                  output)
     * @param algorithm Signature algorithm (SHA1withRSA or SHA256withRSA)
     */
    private byte[] signInternal(byte[] data, boolean detached, String algorithm) throws Exception {
        if (keyStore == null || alias == null) {
            throw new Exception("DSC not initialized. Please login first.");
        }

        PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, null);
        Certificate[] certChain = keyStore.getCertificateChain(alias);

        if (certChain == null || certChain.length == 0) {
            // Fallback to single certificate
            Certificate cert = keyStore.getCertificate(alias);
            if (cert != null) {
                certChain = new Certificate[] { cert };
            } else {
                throw new Exception("No certificate found for alias: " + alias);
            }
        }

        X509Certificate signingCert = (X509Certificate) certChain[0];

        // Create CMS signed data (PKCS#7 format)
        CMSTypedData cmsData = new CMSProcessableByteArray(data);

        // Build certificate store
        JcaCertStore certStore = new JcaCertStore(Arrays.asList(certChain));

        // Create content signer using PKCS#11 provider
        // ICEGATE requires SHA1withRSA for shipping bill signatures
        ContentSigner contentSigner = new JcaContentSignerBuilder(algorithm)
                .setProvider(pkcs11Provider)
                .build(privateKey);

        // Create signed data generator
        CMSSignedDataGenerator generator = new CMSSignedDataGenerator();
        generator.addSignerInfoGenerator(
                new JcaSignerInfoGeneratorBuilder(
                        new JcaDigestCalculatorProviderBuilder().build()).build(contentSigner, signingCert));
        generator.addCertificates(certStore);

        // Generate PKCS#7 signed data
        // detached = true means signature only (no data embedded) - required for .sb
        // files
        // detached = false means data is included in the signature block
        CMSSignedData signedData = generator.generate(cmsData, !detached);

        System.out.println(
                "Generated " + (detached ? "DETACHED " : "") + "PKCS#7/CMS signature (" + algorithm
                        + ") with certificate: "
                        + signingCert.getSubjectX500Principal().getName());

        return signedData.getEncoded();
    }

    public X509Certificate getCertificate() throws Exception {
        return (X509Certificate) keyStore.getCertificate(alias);
    }

    /**
     * Sign data and return RAW RSA signature bytes (NOT PKCS#7).
     * This is the format required by ICEGATE for .sb files.
     * Uses SHA256withRSA as requested.
     */
    public byte[] signRaw(byte[] data) throws Exception {
        if (keyStore == null || alias == null) {
            throw new Exception("DSC not initialized. Please login first.");
        }

        PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, null);
        X509Certificate cert = (X509Certificate) keyStore.getCertificate(alias);

        // Create raw RSA signature using the PKCS#11 provider
        java.security.Signature sig = java.security.Signature.getInstance("SHA1withRSA", pkcs11Provider);
        sig.initSign(privateKey);
        sig.update(data);
        byte[] signature = sig.sign();

        System.out.println("Generated RAW RSA signature (SHA1withRSA) with certificate: "
                + cert.getSubjectX500Principal().getName());
        System.out.println("Signature length: " + signature.length + " bytes");

        return signature;
    }

    /**
     * Get the certificate as Base64 encoded DER format.
     */
    public String getCertificateBase64() throws Exception {
        X509Certificate cert = getCertificate();
        byte[] encoded = cert.getEncoded();
        return java.util.Base64.getEncoder().encodeToString(encoded);
    }

    // Getters for PdfSignerService
    public KeyStore getKeyStore() {
        return keyStore;
    }

    public String getAlias() {
        return alias;
    }

    public Provider getProvider() {
        return pkcs11Provider;
    }
}
