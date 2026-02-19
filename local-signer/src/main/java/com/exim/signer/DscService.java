package com.exim.signer;

import java.io.File;
import java.nio.file.Files;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Provider;
import java.security.Security;
import java.security.Signature;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Enumeration;

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

    /**
     * Login into DSC Token using PKCS11 DLL path and PIN.
     */
    public void login(String pin, String dllPath) throws Exception {

        if (pin == null || pin.trim().isEmpty()) {
            throw new Exception("PIN cannot be empty.");
        }

        if (dllPath == null || dllPath.trim().isEmpty()) {
            throw new Exception("DLL Path cannot be empty.");
        }

        // Escape Windows path for PKCS11 config
        String sanitizedPath = dllPath.replace("\\", "\\\\");

        String configContent = "name=DSCToken\n" +
                "library=" + sanitizedPath + "\n";

        File configFile = File.createTempFile("pkcs11-", ".cfg");
        configFile.deleteOnExit();
        Files.write(configFile.toPath(), configContent.getBytes());

        // Load SunPKCS11 provider
        Provider baseProvider = Security.getProvider("SunPKCS11");
        if (baseProvider == null) {
            throw new Exception("SunPKCS11 provider not found. Use Oracle JDK / OpenJDK standard build.");
        }

        pkcs11Provider = baseProvider.configure(configFile.getAbsolutePath());
        Security.addProvider(pkcs11Provider);

        // Load KeyStore from token
        keyStore = KeyStore.getInstance("PKCS11", pkcs11Provider);
        keyStore.load(null, pin.toCharArray());

        // Select best signing alias
        alias = findSigningAlias();

        if (alias == null) {
            throw new Exception("No valid signing certificate found in token.");
        }

        System.out.println("✅ DSC Login successful. Selected Alias: " + alias);
    }

    /**
     * Find correct signing alias (certificate that has private key +
     * DigitalSignature usage).
     */
    private String findSigningAlias() throws Exception {

        Enumeration<String> aliases = keyStore.aliases();

        while (aliases.hasMoreElements()) {
            String tempAlias = aliases.nextElement();

            if (!keyStore.isKeyEntry(tempAlias)) {
                continue;
            }

            Certificate certObj = keyStore.getCertificate(tempAlias);
            if (!(certObj instanceof X509Certificate)) {
                continue;
            }

            X509Certificate cert = (X509Certificate) certObj;

            // Check KeyUsage if present
            boolean[] usage = cert.getKeyUsage();

            // usage[0] = digitalSignature
            boolean isSigningCert = (usage == null || (usage.length > 0 && usage[0]));

            if (isSigningCert) {
                System.out.println("✔ Found signing alias: " + tempAlias);
                System.out.println("   Subject: " + cert.getSubjectX500Principal());
                return tempAlias;
            }
        }

        return null;
    }

    /**
     * Get signing certificate.
     */
    public X509Certificate getCertificate() throws Exception {
        if (keyStore == null || alias == null) {
            throw new Exception("DSC not initialized. Call login() first.");
        }
        return (X509Certificate) keyStore.getCertificate(alias);
    }

    /**
     * Get certificate as Base64 encoded DER string.
     */
    public String getCertificateBase64() throws Exception {
        X509Certificate cert = getCertificate();
        return java.util.Base64.getEncoder().encodeToString(cert.getEncoded());
    }

    /**
     * RAW Signature (SHA1withRSA) required for ICEGATE .sb file signing.
     * This matches NCode signing tool behavior.
     */
    public byte[] signRaw(byte[] data) throws Exception {

        if (keyStore == null || alias == null) {
            throw new Exception("DSC not initialized. Call login() first.");
        }

        if (data == null || data.length == 0) {
            throw new Exception("No data provided for signing.");
        }

        PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, null);

        Signature signature = Signature.getInstance("SHA1withRSA", pkcs11Provider);
        signature.initSign(privateKey);
        signature.update(data);

        byte[] signedBytes = signature.sign();

        System.out.println("✅ RAW SHA1withRSA signature generated. Length: " + signedBytes.length);

        return signedBytes;
    }

    /**
     * Generate PKCS#7 (CMS) signature (ATTACHED).
     * This is NOT used for ICEGATE SB file but useful for other cases.
     */
    public byte[] signPKCS7Attached(byte[] data) throws Exception {
        return signPKCS7Internal(data, false);
    }

    /**
     * Generate PKCS#7 (CMS) signature (DETACHED).
     * This is NOT used for ICEGATE SB file but useful for XML / e-Sanchit.
     */
    public byte[] signPKCS7Detached(byte[] data) throws Exception {
        return signPKCS7Internal(data, true);
    }

    /**
     * Internal PKCS#7 signer.
     */
    private byte[] signPKCS7Internal(byte[] data, boolean detached) throws Exception {

        if (keyStore == null || alias == null) {
            throw new Exception("DSC not initialized. Call login() first.");
        }

        PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, null);

        Certificate[] certChain = keyStore.getCertificateChain(alias);
        if (certChain == null || certChain.length == 0) {
            Certificate cert = keyStore.getCertificate(alias);
            if (cert != null) {
                certChain = new Certificate[] { cert };
            } else {
                throw new Exception("No certificate found for alias: " + alias);
            }
        }

        X509Certificate signingCert = (X509Certificate) certChain[0];

        CMSTypedData cmsData = new CMSProcessableByteArray(data);

        JcaCertStore certStore = new JcaCertStore(Arrays.asList(certChain));

        ContentSigner contentSigner = new JcaContentSignerBuilder("SHA1withRSA")
                .setProvider(pkcs11Provider)
                .build(privateKey);

        CMSSignedDataGenerator generator = new CMSSignedDataGenerator();
        generator.addSignerInfoGenerator(
                new JcaSignerInfoGeneratorBuilder(
                        new JcaDigestCalculatorProviderBuilder().build()).build(contentSigner, signingCert));

        generator.addCertificates(certStore);

        // If detached=true -> do not include data in output
        CMSSignedData signedData = generator.generate(cmsData, !detached);

        System.out.println("✅ PKCS7 Signature generated (Detached=" + detached + ")");
        return signedData.getEncoded();
    }

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
