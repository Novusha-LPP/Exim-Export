#!/usr/bin/env node
/**
 * final-proof.js — Prove the V-NCODE signer uses SHA1withRSA while our signer uses SHA256withRSA
 * and that the V-NCODE signer was signing a DIFFERENT unsigned file content.
 */

import fs from 'fs';
import crypto from 'crypto';

const successBuf = fs.readFileSync('server/tools/1072026Signed.sb');
const failedBuf = fs.readFileSync('server/tools/GIM_EXP_SEA_00107_26-27_3315740.sb');

const successStr = successBuf.toString('latin1');
const failedStr = failedBuf.toString('latin1');

// Extract certificate (same in both files)
const certStart = successStr.indexOf('<START-CERTIFICATE>') + '<START-CERTIFICATE>'.length;
const certEnd = successStr.indexOf('</START-CERTIFICATE>');
const certBase64 = successStr.substring(certStart, certEnd);
const certDer = Buffer.from(certBase64, 'base64');

// Build PEM
const lines = [];
for (let i = 0; i < certBase64.length; i += 64) {
    lines.push(certBase64.substring(i, i + 64));
}
const certPem = '-----BEGIN CERTIFICATE-----\n' + lines.join('\n') + '\n-----END CERTIFICATE-----';
const x509 = new crypto.X509Certificate(certPem);
const publicKey = x509.publicKey;

console.log('Certificate Subject:', x509.subject);
console.log('');

// === FAILED FILE (our signer - SOFTLINK GLOBAL v10.15) ===
console.log('═'.repeat(80));
console.log('FAILED FILE (our signer - SOFTLINK GLOBAL v10.15)');
console.log('═'.repeat(80));

const failedSigStart = failedStr.indexOf('<START-SIGNATURE>') + '<START-SIGNATURE>'.length;
const failedSigEnd = failedStr.indexOf('</START-SIGNATURE>');
const failedSig = Buffer.from(failedStr.substring(failedSigStart, failedSigEnd), 'base64');
const failedContentEnd = failedStr.indexOf('<START-SIGNATURE>');
const failedContent = failedBuf.slice(0, failedContentEnd);

console.log('Content length:', failedContent.length, 'bytes');
console.log('Signature length:', failedSig.length, 'bytes');

// Verify with SHA256
const v256 = crypto.createVerify('SHA256');
v256.update(failedContent);
console.log('SHA256withRSA verification:', v256.verify(publicKey, failedSig) ? '✅ VALID' : '❌ INVALID');

// Verify with SHA1  
const v1 = crypto.createVerify('SHA1');
v1.update(failedContent);
console.log('SHA1withRSA verification:', v1.verify(publicKey, failedSig) ? '✅ VALID' : '❌ INVALID');

// Decrypt to see algorithm
try {
    const dec = crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, failedSig);
    console.log('DigestInfo:', dec.toString('hex'));
    if (dec.toString('hex').includes('608648016503040201')) {
        console.log('→ Uses SHA-256 hash algorithm');
    }
    if (dec.toString('hex').includes('2b0e03021a')) {
        console.log('→ Uses SHA-1 hash algorithm');
    }
} catch(e) { console.log('Decrypt error:', e.message); }

// === SUCCESS FILE (third party - V-NCODE_01.05.2013) ===
console.log('');
console.log('═'.repeat(80));
console.log('SUCCESS FILE (V-NCODE_01.05.2013)');
console.log('═'.repeat(80));

const successSigStart = successStr.indexOf('<START-SIGNATURE>') + '<START-SIGNATURE>'.length;
const successSigEnd = successStr.indexOf('</START-SIGNATURE>');
const successSig = Buffer.from(successStr.substring(successSigStart, successSigEnd), 'base64');
const successContentEnd = successStr.indexOf('<START-SIGNATURE>');
const successContent = successBuf.slice(0, successContentEnd);

console.log('Content length:', successContent.length, 'bytes');
console.log('Signature length:', successSig.length, 'bytes');

// Verify with SHA256
const sv256 = crypto.createVerify('SHA256');
sv256.update(successContent);
console.log('SHA256withRSA verification:', sv256.verify(publicKey, successSig) ? '✅ VALID' : '❌ INVALID');

// Verify with SHA1
const sv1 = crypto.createVerify('SHA1');
sv1.update(successContent);
console.log('SHA1withRSA verification:', sv1.verify(publicKey, successSig) ? '✅ VALID' : '❌ INVALID');

// Decrypt to see algorithm
try {
    const dec = crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, successSig);
    console.log('DigestInfo:', dec.toString('hex'));
    if (dec.toString('hex').includes('608648016503040201')) {
        console.log('→ Uses SHA-256 hash algorithm');
    }
    if (dec.toString('hex').includes('2b0e03021a')) {
        console.log('→ Uses SHA-1 hash algorithm');
        // Extract digest
        const digestHex = dec.toString('hex').slice(-40);
        console.log('→ Embedded SHA-1 digest:', digestHex);
        console.log('→ SHA-1 of our content:  ', crypto.createHash('sha1').update(successContent).digest('hex'));
        console.log('→ Content SHA-1 MATCHES:', digestHex === crypto.createHash('sha1').update(successContent).digest('hex'));
    }
} catch(e) { console.log('Decrypt error:', e.message); }

// === KEY FINDING ===
console.log('');
console.log('═'.repeat(80));
console.log('KEY FINDINGS');
console.log('═'.repeat(80));
console.log('');
console.log('1. Our signer (SOFTLINK GLOBAL) uses SHA256withRSA');
console.log('2. V-NCODE signer uses SHA1withRSA');
console.log('3. ICEGATE may ONLY accept SHA1withRSA for flat file signatures');
console.log('');

// Check content differences
console.log('Content comparison:');
console.log('  Success content SHA-1:', crypto.createHash('sha1').update(successContent).digest('hex'));
console.log('  Failed  content SHA-1:', crypto.createHash('sha1').update(failedContent).digest('hex'));
console.log('  Same content:', successContent.equals(failedContent));

if (!successContent.equals(failedContent)) {
    console.log('  Content lengths:', successContent.length, 'vs', failedContent.length);
    // Find first diff
    for (let i = 0; i < Math.min(successContent.length, failedContent.length); i++) {
        if (successContent[i] !== failedContent[i]) {
            console.log(`  First difference at byte ${i}:`);
            console.log(`    Success: 0x${successContent[i].toString(16)} ('${String.fromCharCode(successContent[i])}')`);
            console.log(`    Failed:  0x${failedContent[i].toString(16)} ('${String.fromCharCode(failedContent[i])}')`);
            // Show context
            console.log('    Context (success):', successContent.slice(Math.max(0,i-5), i+10).toString('latin1'));
            console.log('    Context (failed):',  failedContent.slice(Math.max(0,i-5), i+10).toString('latin1'));
            break;
        }
    }
}

// What about line ending on line 26 vs line 27?
console.log('');
console.log('Line ending analysis:');
const sLines = successStr.substring(0, successContentEnd).split('\n');
const fLines = failedStr.substring(0, failedContentEnd).split('\n');
console.log(`  Success: ${sLines.length} lines`);
console.log(`  Failed:  ${fLines.length} lines`);
for (let i = 0; i < Math.max(sLines.length, fLines.length); i++) {
    const s = sLines[i] || '(missing)';
    const f = fLines[i] || '(missing)';
    if (s !== f) {
        console.log(`  Line ${i+1} differs:`);
        console.log(`    Success: "${s.substring(0, 80)}..." (${s.length} chars, ends CR: ${s.endsWith('\r')})`);
        console.log(`    Failed:  "${f.substring(0, 80)}..." (${f.length} chars, ends CR: ${f.endsWith('\r')})`);
    }
}
