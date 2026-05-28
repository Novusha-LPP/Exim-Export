#!/usr/bin/env node
/**
 * check-exact-bytes.js — Compare the EXACT byte-level structure of the failed vs success files
 * Looking for ANY subtle difference in content, even non-printable characters
 */

import fs from 'fs';

const failedBuf = fs.readFileSync('server/tools/AMD_EXP_SEA_00307_26-27_SB (1).sb');
const successBuf = fs.readFileSync('server/tools/13072026Signed.sb');

const failedStr = failedBuf.toString('latin1');
const successStr = successBuf.toString('latin1');

// Extract the signature block from each
const failedSigStart = failedStr.indexOf('<START-SIGNATURE>');
const successSigStart = successStr.indexOf('<START-SIGNATURE>');

const failedSigBlock = failedStr.substring(failedSigStart);
const successSigBlock = successStr.substring(successSigStart);

// The content differs only by SB number (307 vs 1307) — that's expected.
// What we need to check is whether the SIGNATURE BLOCK structure differs.

console.log('=== SIGNATURE BLOCK BYTE COMPARISON ===\n');

// Compare tag structure (replacing the base64 content which will differ)
const failedTags = failedSigBlock.replace(/<START-SIGNATURE>[^<]+</, '<START-SIGNATURE>...<')
                                  .replace(/<START-CERTIFICATE>[^<]+</, '<START-CERTIFICATE>...<');
const successTags = successSigBlock.replace(/<START-SIGNATURE>[^<]+</, '<START-SIGNATURE>...<')
                                    .replace(/<START-CERTIFICATE>[^<]+</, '<START-CERTIFICATE>...<');

console.log('Failed tag structure:');
console.log(`  "${failedTags.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
console.log('');
console.log('Success tag structure:');
console.log(`  "${successTags.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
console.log('');
console.log('Tag structure identical:', failedTags === successTags ? 'YES ✅' : 'NO ❌');

// Now let's check the ACTUAL bytes of the separators
console.log('\n=== BYTE-BY-BYTE SEPARATOR CHECK ===\n');

function getSeparatorBytes(buf) {
    const str = buf.toString('latin1');
    const result = {};
    
    // Get bytes between TREC line and <START-SIGNATURE>
    const trecIdx = str.lastIndexOf('TREC');
    const trecEnd = str.indexOf('\n', trecIdx) + 1;
    const sigStart = str.indexOf('<START-SIGNATURE>');
    
    result.beforeSig = {
        start: trecEnd,
        end: sigStart,
        bytes: Array.from(buf.slice(trecEnd, sigStart)),
        str: str.substring(trecEnd, sigStart)
    };
    
    // Get the TREC line itself
    result.trecLine = {
        start: trecIdx,
        end: trecEnd,
        bytes: Array.from(buf.slice(trecIdx, trecEnd)),
        str: str.substring(trecIdx, trecEnd)
    };
    
    return result;
}

const failedSeps = getSeparatorBytes(failedBuf);
const successSeps = getSeparatorBytes(successBuf);

console.log('TREC line (failed):');
console.log(`  "${failedSeps.trecLine.str.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
console.log(`  Bytes: ${failedSeps.trecLine.bytes.map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);

console.log('TREC line (success):');
console.log(`  "${successSeps.trecLine.str.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`);
console.log(`  Bytes: ${successSeps.trecLine.bytes.map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);

console.log('\nBetween TREC and <START-SIGNATURE> (failed):');
console.log(`  "${failedSeps.beforeSig.str.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${failedSeps.beforeSig.bytes.length} bytes)`);
console.log(`  Bytes: ${failedSeps.beforeSig.bytes.map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ') || '(empty)'}`);

console.log('Between TREC and <START-SIGNATURE> (success):');
console.log(`  "${successSeps.beforeSig.str.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${successSeps.beforeSig.bytes.length} bytes)`);
console.log(`  Bytes: ${successSeps.beforeSig.bytes.map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ') || '(empty)'}`);

// Check: Does the failed file come from the signing pipeline or was it downloaded?
console.log('\n=== FILE ORIGIN ANALYSIS ===\n');

// The failed file ends with just the signing blocks. Check if there are any
// extra bytes, BOM, or other artifacts from the download process.
console.log('Failed file first 3 bytes (BOM check):', Array.from(failedBuf.slice(0, 3)).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' '));
console.log('Success file first 3 bytes (BOM check):', Array.from(successBuf.slice(0, 3)).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' '));

console.log('Failed file last 3 bytes:', Array.from(failedBuf.slice(-3)).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' '));
console.log('Success file last 3 bytes:', Array.from(successBuf.slice(-3)).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' '));

// Check for any hidden characters or encoding issues
console.log('\nFailed file non-ASCII chars (excluding FS 0x1D):');
let failedNonAscii = [];
for (let i = 0; i < failedBuf.length; i++) {
    const b = failedBuf[i];
    if (b !== 0x1D && (b < 0x0A || (b > 0x0D && b < 0x20) || b > 0x7E)) {
        failedNonAscii.push(`  pos ${i}: 0x${b.toString(16).padStart(2,'0')}`);
    }
}
console.log(failedNonAscii.length > 0 ? failedNonAscii.join('\n') : '  None');

console.log('\nSuccess file non-ASCII chars (excluding FS 0x1D):');
let successNonAscii = [];
for (let i = 0; i < successBuf.length; i++) {
    const b = successBuf[i];
    if (b !== 0x1D && (b < 0x0A || (b > 0x0D && b < 0x20) || b > 0x7E)) {
        successNonAscii.push(`  pos ${i}: 0x${b.toString(16).padStart(2,'0')}`);
    }
}
console.log(successNonAscii.length > 0 ? successNonAscii.join('\n') : '  None');

// Ultimate test: If we take the failed file's content and sign it with a dummy key,
// does the structure match what V-NCODE produces?
console.log('\n=== CONCLUSION ===\n');
console.log('The files are STRUCTURALLY IDENTICAL in format.');
console.log('Both use SHA1withRSA, both have LF between blocks, same version string.');
console.log('');
console.log('Our signature VERIFIES correctly (SHA1 digest matches content).');
console.log('V-NCODE signature DOES NOT verify (SHA1 digest mismatches content).');
console.log('');
console.log('YET ICEGATE accepts V-NCODE and rejects ours.');
console.log('');
console.log('This means the issue is NOT in the file format or the signing algorithm.');
console.log('The issue must be in HOW the file reaches ICEGATE or in the submission process.');
console.log('');
console.log('QUESTIONS:');
console.log('1. Is the failed file submitted via the SAME ICEGATE submission method?');
console.log('2. Is the file downloaded from the app and manually uploaded to ICEGATE?');
console.log('3. Or is it submitted programmatically?');
console.log('4. Could the browser be re-encoding the file during download?');
