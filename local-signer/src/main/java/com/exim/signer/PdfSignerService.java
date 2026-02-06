package com.exim.signer;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.SignatureInterface;
import org.bouncycastle.cert.jcajce.JcaCertStore;
import org.bouncycastle.cms.*;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;

import java.io.*;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Arrays;
import java.util.Calendar;

/**
 * Service for signing PDF files with embedded PAdES signatures.
 * Compatible with ICEGATE e-Sanchit portal requirements.
 */
public class PdfSignerService implements SignatureInterface {

    private PrivateKey privateKey;
    private Certificate[] certificateChain;
    private Provider pkcs11Provider;

    /**
     * Initialize the PDF signer with credentials from DscService.
     */
    public void initialize(KeyStore keyStore, String alias, Provider provider) throws Exception {
        this.privateKey = (PrivateKey) keyStore.getKey(alias, null);
        this.certificateChain = keyStore.getCertificateChain(alias);
        this.pkcs11Provider = provider;

        if (privateKey == null) {
            throw new Exception("Private key not found for alias: " + alias);
        }
        if (certificateChain == null || certificateChain.length == 0) {
            throw new Exception("Certificate chain not found for alias: " + alias);
        }

        System.out.println("PdfSignerService initialized with certificate: " +
                ((X509Certificate) certificateChain[0]).getSubjectX500Principal().getName());
    }

    /**
     * Sign a PDF file and save the signed version.
     * 
     * @param inputFile  The original PDF file
     * @param outputFile The destination for the signed PDF
     * @param reason     Signing reason (e.g., "Document Signing")
     * @param location   Signing location (e.g., "India")
     */
    public void signPdf(File inputFile, File outputFile, String reason, String location) throws Exception {
        try (PDDocument document = PDDocument.load(inputFile);
                FileOutputStream fos = new FileOutputStream(outputFile)) {

            // Create signature dictionary
            PDSignature signature = new PDSignature();
            signature.setFilter(PDSignature.FILTER_ADOBE_PPKLITE);
            signature.setSubFilter(PDSignature.SUBFILTER_ADBE_PKCS7_DETACHED);
            signature.setName(((X509Certificate) certificateChain[0]).getSubjectX500Principal().getName());
            signature.setLocation(location);
            signature.setReason(reason);
            signature.setSignDate(Calendar.getInstance());

            // Register signature dictionary and sign interface
            document.addSignature(signature, this);

            // Save and sign
            document.saveIncremental(fos);

            System.out.println("PDF signed successfully: " + outputFile.getAbsolutePath());
        }
    }

    /**
     * SignatureInterface implementation - called by PDFBox to create the signature.
     */
    @Override
    public byte[] sign(InputStream content) throws IOException {
        try {
            // Read all content to be signed
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = content.read(buffer)) != -1) {
                baos.write(buffer, 0, bytesRead);
            }
            byte[] dataToSign = baos.toByteArray();

            // Create CMS Signed Data (PKCS#7)
            CMSTypedData cmsData = new CMSProcessableByteArray(dataToSign);

            // Build certificate store
            JcaCertStore certStore = new JcaCertStore(Arrays.asList(certificateChain));

            // Create signer info
            ContentSigner contentSigner;
            if (pkcs11Provider != null) {
                contentSigner = new JcaContentSignerBuilder("SHA256withRSA")
                        .setProvider(pkcs11Provider)
                        .build(privateKey);
            } else {
                contentSigner = new JcaContentSignerBuilder("SHA256withRSA")
                        .build(privateKey);
            }

            CMSSignedDataGenerator generator = new CMSSignedDataGenerator();
            generator.addSignerInfoGenerator(
                    new JcaSignerInfoGeneratorBuilder(
                            new JcaDigestCalculatorProviderBuilder().build())
                            .build(contentSigner, (X509Certificate) certificateChain[0]));
            generator.addCertificates(certStore);

            // Generate signed data (detached = false for embedded signature)
            CMSSignedData signedData = generator.generate(cmsData, false);

            return signedData.getEncoded();

        } catch (Exception e) {
            throw new IOException("Error signing PDF content: " + e.getMessage(), e);
        }
    }
}
