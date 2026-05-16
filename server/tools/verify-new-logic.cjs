
const fs = require('fs');
const crypto = require('crypto');

function verifyIcegateSignature(filePath) {
    console.log(`\n--- Verifying: ${filePath} ---`);
    if (!fs.existsSync(filePath)) {
        console.log("File not found.");
        return;
    }
    const buf = fs.readFileSync(filePath);
    const content = buf.toString('latin1');
    
    const sigStart = content.indexOf('<START-SIGNATURE>');
    const sigEnd = content.indexOf('</START-SIGNATURE>');
    const certStart = content.indexOf('<START-CERTIFICATE>');
    const certEnd = content.indexOf('</START-CERTIFICATE>');
    
    const rawData = buf.slice(0, sigStart);
    const signatureBase64 = content.substring(sigStart + 17, sigEnd);
    const certificateBase64 = content.substring(certStart + 19, certEnd);
    
    const signature = Buffer.from(signatureBase64, 'base64');
    const certificateDER = Buffer.from(certificateBase64, 'base64');
    
    // Convert DER to PEM for crypto.createPublicKey
    const certPem = `-----BEGIN CERTIFICATE-----\n${certificateBase64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
    const publicKey = crypto.createPublicKey(certPem);
    
    const decrypted = crypto.publicDecrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, signature);
    
    const embeddedDigest = decrypted.slice(-20).toString('hex');
    console.log("Embedded Digest (from Signature):", embeddedDigest);
    
    // Normalization Logic
    const normalized = rawData.toString('latin1')
        .replace(/\r\n/g, '\n')
        .trimEnd() + '\n';
        
    const calculatedDigest = crypto.createHash('sha1').update(Buffer.from(normalized, 'latin1')).digest('hex');
    console.log("Calculated Digest (Normalized): ", calculatedDigest);
    
    if (embeddedDigest === calculatedDigest) {
        console.log("✅ SUCCESS: Signature matches normalized content!");
    } else {
        console.log("❌ FAILURE: Signature mismatch.");
        const rawDigest = crypto.createHash('sha1').update(rawData).digest('hex');
        console.log("Raw Digest of file content:   ", rawDigest);
    }
}

verifyIcegateSignature('./server/tools/3162026Signed.sb');
verifyIcegateSignature('./server/tools/AMD_EXP_SEA_00316_26-27_3265147.sb');
