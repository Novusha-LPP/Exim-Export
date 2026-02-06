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
     * Sign data and return PKCS#7/CMS SignedData format.
     * This format includes the certificate chain and is required by ICEGATE.
     */
    public byte[] sign(byte[] data) throws Exception {
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
        ContentSigner contentSigner = new JcaContentSignerBuilder("SHA256withRSA")
                .setProvider(pkcs11Provider)
                .build(privateKey);

        // Create signed data generator
        CMSSignedDataGenerator generator = new CMSSignedDataGenerator();
        generator.addSignerInfoGenerator(
                new JcaSignerInfoGeneratorBuilder(
                        new JcaDigestCalculatorProviderBuilder().build()).build(contentSigner, signingCert));
        generator.addCertificates(certStore);

        // Generate PKCS#7 signed data (detached = false means data is included)
        // For .sb.sig files, use detached = true (data NOT included, only signature)
        CMSSignedData signedData = generator.generate(cmsData, false);

        System.out.println(
                "Generated PKCS#7/CMS signature with certificate: " + signingCert.getSubjectX500Principal().getName());

        return signedData.getEncoded();
    }

    public X509Certificate getCertificate() throws Exception {
        return (X509Certificate) keyStore.getCertificate(alias);
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
