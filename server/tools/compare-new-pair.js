#!/usr/bin/env node
/**
 * compare-new-pair.js — Compare the FAILED file (our signer) vs SUCCESS file (third-party)
 * These share the SAME flat file content (just different SB number prefix 307 vs 1307)
 */

import fs from 'fs';
import crypto from 'crypto';

const failedBuf = fs.readFileSync('server/tools/AMD_EXP_SEA_00307_26-27_SB (1).sb');
const successBuf = fs.readFileSync('server/tools/13072026Signed.sb');

const failedStr = failedBuf.toString('latin1');
const successStr = successBuf.toString('latin1');

console.log('FAILED file size:', failedBuf.length, 'bytes');
console.log('SUCCESS file size:', successBuf.length, 'bytes');
console.log('');

// === Extract content (before <START-SIGNATURE>) ===
const failedSigIdx = failedStr.indexOf('<START-SIGNATURE>');
const successSigIdx = successStr.indexOf('<START-SIGNATURE>');

const failedContent = failedBuf.slice(0, failedSigIdx);
const successContent = successBuf.slice(0, successSigIdx);

console.log('═'.repeat(80));
console.log('CONTENT ANALYSIS');
console.log('═'.repeat(80));
console.log('Failed content:', failedContent.length, 'bytes');
console.log('Success content:', successContent.length, 'bytes');
console.log('');

// Show last 50 bytes of each content
function showBytes(buf, label, count = 50) {
    const start = Math.max(0, buf.length - count);
    const slice = buf.slice(start);
    console.log(`${label} (last ${count} bytes):`);
    let line = '  ';
    for (let i = 0; i < slice.length; i++) {
        const b = slice[i];
        let ch;
        if (b === 0x0D) ch = '\\r';
        else if (b === 0x0A) ch = '\\n';
        else if (b === 0x1D) ch = 'FS';
        else if (b >= 0x20 && b <= 0x7E) ch = String.fromCharCode(b);
        else ch = '??';
        line += `${ch} `;
        if ((i + 1) % 30 === 0) { console.log(line); line = '  '; }
    }
    if (line.trim()) console.log(line);
    console.log('');
}

showBytes(failedContent, 'Failed content');
showBytes(successContent, 'Success content');

// Line-by-line comparison of content
const failedLines = failedStr.substring(0, failedSigIdx).split('\n');
const successLines = successStr.substring(0, successSigIdx).split('\n');

console.log(`Failed: ${failedLines.length} lines, Success: ${successLines.length} lines`);

// Check line endings
let failedCRLF = 0, failedLF = 0, successCRLF = 0, successLF = 0;
failedLines.forEach(l => { if (l.endsWith('\r')) failedCRLF++; else if (l.length > 0) failedLF++; });
successLines.forEach(l => { if (l.endsWith('\r')) successCRLF++; else if (l.length > 0) successLF++; });

console.log(`Failed line endings: ${failedCRLF} CRLF, ${failedLF} LF-only`);
console.log(`Success line endings: ${successCRLF} CRLF, ${successLF} LF-only`);
console.log('');

// Find content differences (ignoring the SB number change)
for (let i = 0; i < Math.max(failedLines.length, successLines.length); i++) {
    const f = (failedLines[i] || '').replace(/\r$/, '');
    const s = (successLines[i] || '').replace(/\r$/, '');
    if (f !== s) {
        console.log(`Line ${i + 1} DIFFERS:`);
        console.log(`  Failed:  "${f.substring(0, 100)}${f.length > 100 ? '...' : ''}"`);
        console.log(`  Success: "${s.substring(0, 100)}${s.length > 100 ? '...' : ''}"`);
        
        // Show the specific byte differences
        const fEnd = failedLines[i] || '';
        const sEnd = successLines[i] || '';
        const fLastBytes = Buffer.from(fEnd.slice(-5), 'latin1');
        const sLastBytes = Buffer.from(sEnd.slice(-5), 'latin1');
        console.log(`  Failed  ends: ${Array.from(fLastBytes).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')} (${fEnd.length} chars)`);
        console.log(`  Success ends: ${Array.from(sLastBytes).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')} (${sEnd.length} chars)`);
        console.log('');
    }
}

// === Extract and compare signature blocks ===
console.log('═'.repeat(80));
console.log('SIGNATURE BLOCK ANALYSIS');
console.log('═'.repeat(80));

// Extract signatures
function extractSigBlock(str) {
    const sigStart = str.indexOf('<START-SIGNATURE>') + '<START-SIGNATURE>'.length;
    const sigEnd = str.indexOf('</START-SIGNATURE>');
    const certStart = str.indexOf('<START-CERTIFICATE>') + '<START-CERTIFICATE>'.length;
    const certEnd = str.indexOf('</START-CERTIFICATE>');
    const verStart = str.indexOf('<SIGNER-VERSION>') + '<SIGNER-VERSION>'.length;
    const verEnd = str.indexOf('</SIGNER-VERSION>');
    
    return {
        signature: str.substring(sigStart, sigEnd),
        certificate: str.substring(certStart, certEnd),
        version: str.substring(verStart, verEnd),
    };
}

const failedSig = extractSigBlock(failedStr);
const successSig = extractSigBlock(successStr);

console.log('Failed signer version:', failedSig.version);
console.log('Success signer version:', successSig.version);
console.log('');

console.log('Same certificate:', failedSig.certificate === successSig.certificate ? 'YES ✅' : 'NO ❌');
console.log('Signature length (failed):', failedSig.signature.length, 'chars');
console.log('Signature length (success):', successSig.signature.length, 'chars');
console.log('');

// Check line endings between blocks
function checkBlockSeparators(buf, label) {
    const str = buf.toString('latin1');
    const sigTagEnd = str.indexOf('</START-SIGNATURE>') + '</START-SIGNATURE>'.length;
    const certTagStart = str.indexOf('<START-CERTIFICATE>');
    const certTagEnd = str.indexOf('</START-CERTIFICATE>') + '</START-CERTIFICATE>'.length;
    const verTagStart = str.indexOf('<SIGNER-VERSION>');
    const verTagEnd = str.indexOf('</SIGNER-VERSION>') + '</SIGNER-VERSION>'.length;
    
    const sep1 = str.substring(sigTagEnd, certTagStart);
    const sep2 = str.substring(certTagEnd, verTagStart);
    const trailing = str.substring(verTagEnd);
    
    console.log(`${label}:`);
    console.log(`  After </START-SIGNATURE>: ${JSON.stringify(sep1)} (${Buffer.from(sep1, 'latin1').length} bytes: ${Array.from(Buffer.from(sep1, 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')})`);
    console.log(`  After </START-CERTIFICATE>: ${JSON.stringify(sep2)} (${Buffer.from(sep2, 'latin1').length} bytes: ${Array.from(Buffer.from(sep2, 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')})`);
    console.log(`  After </SIGNER-VERSION>: ${JSON.stringify(trailing)} (${Buffer.from(trailing, 'latin1').length} bytes)`);
    console.log('');
}

checkBlockSeparators(failedBuf, 'FAILED');
checkBlockSeparators(successBuf, 'SUCCESS');

// === Cryptographic verification ===
console.log('═'.repeat(80));
console.log('CRYPTOGRAPHIC VERIFICATION');
console.log('═'.repeat(80));

// Get certificate
const certBase64 = failedSig.certificate;
const certLines = [];
for (let i = 0; i < certBase64.length; i += 64) {
    certLines.push(certBase64.substring(i, i + 64));
}
const certPem = '-----BEGIN CERTIFICATE-----\n' + certLines.join('\n') + '\n-----END CERTIFICATE-----';
const x509 = new crypto.X509Certificate(certPem);
const publicKey = x509.publicKey;

// Decrypt both signatures to see DigestInfo
function analyzeSignature(sigBase64, contentBuf, label) {
    const sigBuf = Buffer.from(sigBase64, 'base64');
    console.log(`\n${label}:`);
    console.log(`  Signature: ${sigBuf.length} bytes`);
    
    try {
        const dec = crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, sigBuf);
        console.log(`  DigestInfo: ${dec.toString('hex')}`);
        
        if (dec.toString('hex').includes('608648016503040201')) {
            console.log('  → Algorithm: SHA-256');
            const digest = dec.toString('hex').slice(-64);
            console.log(`  → Embedded digest: ${digest}`);
            const contentDigest = crypto.createHash('sha256').update(contentBuf).digest('hex');
            console.log(`  → Content  digest: ${contentDigest}`);
            console.log(`  → Match: ${digest === contentDigest ? 'YES ✅' : 'NO ❌'}`);
        }
        if (dec.toString('hex').includes('2b0e03021a')) {
            console.log('  → Algorithm: SHA-1');
            const digest = dec.toString('hex').slice(-40);
            console.log(`  → Embedded digest: ${digest}`);
            const contentDigest = crypto.createHash('sha1').update(contentBuf).digest('hex');
            console.log(`  → Content  digest: ${contentDigest}`);
            console.log(`  → Match: ${digest === contentDigest ? 'YES ✅' : 'NO ❌'}`);
        }
    } catch(e) {
        console.log(`  Decrypt error: ${e.message}`);
    }
    
    // Verify using Node.js crypto
    for (const alg of ['SHA1', 'SHA256']) {
        const v = crypto.createVerify(alg);
        v.update(contentBuf);
        const valid = v.verify(publicKey, sigBuf);
        console.log(`  ${alg}withRSA verify: ${valid ? '✅ VALID' : '❌ INVALID'}`);
    }
}

analyzeSignature(failedSig.signature, failedContent, 'FAILED FILE');
analyzeSignature(successSig.signature, successContent, 'SUCCESS FILE');

// === Check if success file's signature verifies against normalized content ===
console.log('\n');
console.log('═'.repeat(80));
console.log('BRUTE-FORCE: What did the success signer actually sign?');
console.log('═'.repeat(80));

const successSigBuf = Buffer.from(successSig.signature, 'base64');
let successDec;
try {
    successDec = crypto.publicDecrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, successSigBuf);
} catch(e) {}

if (successDec) {
    const targetDigest = successDec.toString('hex').slice(-40); // SHA-1 = last 40 hex chars
    console.log(`Target digest: ${targetDigest}`);
    
    const successContentStr = successContent.toString('latin1');
    
    // Try every possible end position
    let found = false;
    for (let endPos = successContent.length - 5; endPos <= successContent.length + 5; endPos++) {
        if (endPos < 1 || endPos > successBuf.length) continue;
        const slice = successBuf.slice(0, endPos);
        const hash = crypto.createHash('sha1').update(slice).digest('hex');
        if (hash === targetDigest) {
            console.log(`✅ FOUND at endPos=${endPos} (content is ${successContent.length})`);
            found = true;
        }
    }
    
    // Try with different line ending normalizations
    const variants = {
        'raw': successContent,
        'all_CRLF': Buffer.from(successContentStr.replace(/\r?\n/g, '\r\n'), 'latin1'),
        'all_LF': Buffer.from(successContentStr.replace(/\r\n/g, '\n'), 'latin1'),
        'stripTrailing_LF': Buffer.from(successContentStr.replace(/[\r\n\s]+$/, '') + '\n', 'latin1'),
        'stripTrailing_CRLF': Buffer.from(successContentStr.replace(/[\r\n\s]+$/, '') + '\r\n', 'latin1'),
        'no_trailing_newline': Buffer.from(successContentStr.replace(/[\r\n\s]+$/, ''), 'latin1'),
    };
    
    for (const [name, buf] of Object.entries(variants)) {
        const hash = crypto.createHash('sha1').update(buf).digest('hex');
        const match = hash === targetDigest;
        console.log(`  ${match ? '✅' : '❌'} ${name}: ${buf.length} bytes → ${hash}`);
        if (match) found = true;
    }
    
    // Try without TREC line
    const trecIdx = successContentStr.lastIndexOf('TREC');
    if (trecIdx >= 0) {
        const withoutTREC = successContent.slice(0, trecIdx);
        console.log(`  ${crypto.createHash('sha1').update(withoutTREC).digest('hex') === targetDigest ? '✅' : '❌'} without_TREC: ${withoutTREC.length} bytes`);
        
        // Without TREC, all CRLF
        const withoutTRECstr = successContentStr.substring(0, trecIdx);
        const withoutTREC_CRLF = Buffer.from(withoutTRECstr.replace(/\r?\n/g, '\r\n'), 'latin1');
        console.log(`  ${crypto.createHash('sha1').update(withoutTREC_CRLF).digest('hex') === targetDigest ? '✅' : '❌'} without_TREC_allCRLF: ${withoutTREC_CRLF.length} bytes`);
    }
    
    // *** KEY TEST: Maybe the signer reads the file as a Windows text file ***
    // When reading a file in text mode on Windows, \r\n → \n
    // Then maybe signs the text-mode content (all LF)
    const textMode = Buffer.from(successContentStr.replace(/\r\n/g, '\n'), 'latin1');
    console.log(`  Text-mode (CRLF→LF): ${crypto.createHash('sha1').update(textMode).digest('hex') === targetDigest ? '✅' : '❌'} ${textMode.length} bytes → ${crypto.createHash('sha1').update(textMode).digest('hex')}`);

    // Maybe signer signs with ALL CRLF (including TREC)
    const allCRLF_full = Buffer.from(successContentStr.replace(/\r?\n/g, '\r\n'), 'latin1');
    console.log(`  All-CRLF: ${crypto.createHash('sha1').update(allCRLF_full).digest('hex') === targetDigest ? '✅' : '❌'} ${allCRLF_full.length} bytes → ${crypto.createHash('sha1').update(allCRLF_full).digest('hex')}`);

    if (!found) {
        console.log('\n❌ Could not find matching content — signer transforms content in unknown way');
        console.log('   This confirms the third-party signer processes the data before signing.');
    }
}

// === FINAL: Compare the EXACT byte structure between the two files ===
console.log('\n');
console.log('═'.repeat(80));
console.log('BYTE-LEVEL FILE STRUCTURE COMPARISON');
console.log('═'.repeat(80));

// Show structure: content → sig → cert → version
function showStructure(buf, label) {
    const str = buf.toString('latin1');
    const sigTagStart = str.indexOf('<START-SIGNATURE>');
    const sigTagEnd = str.indexOf('</START-SIGNATURE>') + '</START-SIGNATURE>'.length;
    const certTagStart = str.indexOf('<START-CERTIFICATE>');
    const certTagEnd = str.indexOf('</START-CERTIFICATE>') + '</START-CERTIFICATE>'.length;
    const verTagStart = str.indexOf('<SIGNER-VERSION>');
    const verTagEnd = str.indexOf('</SIGNER-VERSION>') + '</SIGNER-VERSION>'.length;
    
    console.log(`${label}:`);
    console.log(`  Content:     bytes 0..${sigTagStart-1} (${sigTagStart} bytes)`);
    console.log(`  Signature:   bytes ${sigTagStart}..${sigTagEnd-1}`);
    console.log(`  Sep1:        bytes ${sigTagEnd}..${certTagStart-1} = ${JSON.stringify(str.substring(sigTagEnd, certTagStart))}`);
    console.log(`  Certificate: bytes ${certTagStart}..${certTagEnd-1}`);
    console.log(`  Sep2:        bytes ${certTagEnd}..${verTagStart-1} = ${JSON.stringify(str.substring(certTagEnd, verTagStart))}`);
    console.log(`  Version:     bytes ${verTagStart}..${verTagEnd-1}`);
    console.log(`  Trailing:    bytes ${verTagEnd}..${buf.length-1} = ${JSON.stringify(str.substring(verTagEnd))}`);
    console.log(`  Total:       ${buf.length} bytes`);
    console.log('');
}

showStructure(failedBuf, 'FAILED');
showStructure(successBuf, 'SUCCESS');
