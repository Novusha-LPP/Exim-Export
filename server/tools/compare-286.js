#!/usr/bin/env node
/**
 * compare-286.js — Compare the softlink success file vs our local signer failed file
 */

import fs from 'fs';
import crypto from 'crypto';

const failedBuf = fs.readFileSync('server/tools/AMD_EXP_SEA_00286_26-27_3160303.sb');
const successBuf = fs.readFileSync('server/tools/28602026-signed.sb');

const failedStr = failedBuf.toString('latin1');
const successStr = successBuf.toString('latin1');

console.log('=== FILE SIZES ===');
console.log('FAILED (Our Signer):', failedBuf.length, 'bytes');
console.log('SUCCESS (Softlink):', successBuf.length, 'bytes');
console.log('');

// Extract content
const failedSigIdx = failedStr.indexOf('<START-SIGNATURE>');
const successSigIdx = successStr.indexOf('<START-SIGNATURE>');

const failedContent = failedBuf.slice(0, failedSigIdx);
const successContent = successBuf.slice(0, successSigIdx);

console.log('=== CONTENT SIZES ===');
console.log('FAILED content:', failedContent.length, 'bytes');
console.log('SUCCESS content:', successContent.length, 'bytes');
console.log('');

// Line-by-line comparison
const failedLines = failedStr.substring(0, failedSigIdx).split('\n');
const successLines = successStr.substring(0, successSigIdx).split('\n');

console.log('=== CONTENT DIFFERENCES ===');
let diffCount = 0;
for (let i = 0; i < Math.max(failedLines.length, successLines.length); i++) {
    const f = (failedLines[i] || '').replace(/\r$/, '');
    const s = (successLines[i] || '').replace(/\r$/, '');
    if (f !== s) {
        diffCount++;
        console.log(`Line ${i + 1} DIFFERS:`);
        console.log(`  Failed:  "${f}" (${f.length})`);
        console.log(`  Success: "${s}" (${s.length})`);
        
        // Show specific byte diffs for the end of the line
        const fEnd = failedLines[i] || '';
        const sEnd = successLines[i] || '';
        console.log(`  Failed ends: ${Array.from(Buffer.from(fEnd.slice(-5), 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);
        console.log(`  Success ends: ${Array.from(Buffer.from(sEnd.slice(-5), 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);
        console.log('');
    }
}
if (diffCount === 0) {
    console.log('NO DIFFERENCES IN CONTENT! They are exactly identical.\n');
}

// === Extract signatures ===
const successSigBlock = successStr.substring(successSigIdx);
const successSigStart = successSigBlock.indexOf('<START-SIGNATURE>') + '<START-SIGNATURE>'.length;
const successSigEnd = successSigBlock.indexOf('</START-SIGNATURE>');
const successSig = successSigBlock.substring(successSigStart, successSigEnd);

// Analyze Softlink's signature
console.log('=== CRYPTO ANALYSIS (Softlink) ===');
const certStart = successSigBlock.indexOf('<START-CERTIFICATE>') + '<START-CERTIFICATE>'.length;
const certEnd = successSigBlock.indexOf('</START-CERTIFICATE>');
const certBase64 = successSigBlock.substring(certStart, certEnd);

const certLines = [];
for (let i = 0; i < certBase64.length; i += 64) {
    certLines.push(certBase64.substring(i, i + 64));
}
const certPem = '-----BEGIN CERTIFICATE-----\n' + certLines.join('\n') + '\n-----END CERTIFICATE-----';
const x509 = new crypto.X509Certificate(certPem);
const publicKey = x509.publicKey;

const sigBuf = Buffer.from(successSig, 'base64');
let dec;
try {
    dec = crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, sigBuf);
    
    console.log(`DigestInfo: ${dec.toString('hex')}`);
    
    if (dec.toString('hex').includes('2b0e03021a')) {
        console.log('Algorithm: SHA-1');
        const embeddedDigest = dec.toString('hex').slice(-40);
        console.log(`Embedded digest: ${embeddedDigest}`);
        
        const contentDigest = crypto.createHash('sha1').update(successContent).digest('hex');
        console.log(`Content  digest: ${contentDigest}`);
        
        if (embeddedDigest === contentDigest) {
            console.log('Match: YES ✅ (Softlink signs exactly the file content!)');
        } else {
            console.log('Match: NO ❌ (Softlink does a hidden transformation)');
            
            // Try to brute-force the transformation
            const successContentStr = successContent.toString('latin1');
            
            const variants = {
                'raw': successContent,
                'all_CRLF': Buffer.from(successContentStr.replace(/\r?\n/g, '\r\n'), 'latin1'),
                'all_LF': Buffer.from(successContentStr.replace(/\r\n/g, '\n'), 'latin1'),
                'stripTrailing_LF': Buffer.from(successContentStr.replace(/[\r\n\s]+$/, '') + '\n', 'latin1'),
                'stripTrailing_CRLF': Buffer.from(successContentStr.replace(/[\r\n\s]+$/, '') + '\r\n', 'latin1'),
                'no_trailing_newline': Buffer.from(successContentStr.replace(/[\r\n\s]+$/, ''), 'latin1'),
            };
            
            console.log('\nTrying brute-force transformations to find Softlink\'s hash:');
            for (const [name, buf] of Object.entries(variants)) {
                const hash = crypto.createHash('sha1').update(buf).digest('hex');
                console.log(`  ${hash === embeddedDigest ? '✅' : '❌'} ${name}: ${hash}`);
            }
        }
    }
} catch(e) {
    console.log(`Decrypt error: ${e.message}`);
}
