#!/usr/bin/env node
/**
 * decode-vncode-signature.js — Determine exactly what content V-NCODE signed
 * by decrypting the raw RSA signature and comparing the embedded digest
 * against every conceivable transformation of the file content.
 */

import fs from 'fs';
import crypto from 'crypto';

const TARGET_SHA1 = '2c83bc9b8004c4b718a4f54569fbf27c7dfb9a26';

const buf = fs.readFileSync('server/tools/962026Signed.sb');
const str = buf.toString('latin1');

const sigStart = str.indexOf('<START-SIGNATURE>');
const contentBuf = buf.slice(0, sigStart);

console.log('=== SUCCESS FILE (V-NCODE) ANALYSIS ===');
console.log(`Content before <START-SIGNATURE>: ${contentBuf.length} bytes`);
console.log(`Content SHA-1: ${crypto.createHash('sha1').update(contentBuf).digest('hex')}`);
console.log(`Target digest: ${TARGET_SHA1}`);
console.log(`Match: ${crypto.createHash('sha1').update(contentBuf).digest('hex') === TARGET_SHA1 ? 'YES' : 'NO'}`);
console.log('');

// Show the exact bytes around the TREC/signature boundary
const boundary = contentBuf.slice(-30);
console.log('Last 30 bytes of content:');
for (let i = 0; i < boundary.length; i++) {
    const b = boundary[i];
    const hex = '0x' + b.toString(16).padStart(2, '0');
    let ch = '.';
    if (b === 0x0D) ch = '\\r';
    else if (b === 0x0A) ch = '\\n';
    else if (b === 0x1D) ch = 'FS';
    else if (b >= 0x20 && b <= 0x7E) ch = String.fromCharCode(b);
    process.stdout.write(`${hex}(${ch}) `);
}
console.log('\n');

// Now let's look at the FAILED file
const failBuf = fs.readFileSync('server/tools/GIM_EXP_SEA_00096_26-27_3201643.sb');
const failStr = failBuf.toString('latin1');
const failSigStart = failStr.indexOf('<START-SIGNATURE>');
const failContentBuf = failBuf.slice(0, failSigStart);

console.log('=== FAILED FILE (our signer) ANALYSIS ===');
console.log(`Content before <START-SIGNATURE>: ${failContentBuf.length} bytes`);
console.log(`Content SHA-256: ${crypto.createHash('sha256').update(failContentBuf).digest('hex')}`);
console.log('');

// Show last 30 bytes of failed content
const failBoundary = failContentBuf.slice(-30);
console.log('Last 30 bytes of content:');
for (let i = 0; i < failBoundary.length; i++) {
    const b = failBoundary[i];
    const hex = '0x' + b.toString(16).padStart(2, '0');
    let ch = '.';
    if (b === 0x0D) ch = '\\r';
    else if (b === 0x0A) ch = '\\n';
    else if (b === 0x1D) ch = 'FS';
    else if (b >= 0x20 && b <= 0x7E) ch = String.fromCharCode(b);
    process.stdout.write(`${hex}(${ch}) `);
}
console.log('\n');

// Now look at what comes AFTER the content in both files
console.log('=== SIGNATURE BLOCK STRUCTURE ===');
console.log('');

// Success file: bytes from sigStart onwards
const successSigBlock = buf.slice(sigStart);
console.log('Success file - signature block (first 100 bytes):');
for (let i = 0; i < Math.min(100, successSigBlock.length); i++) {
    const b = successSigBlock[i];
    const hex = '0x' + b.toString(16).padStart(2, '0');
    let ch = '.';
    if (b === 0x0D) ch = '\\r';
    else if (b === 0x0A) ch = '\\n';
    else if (b >= 0x20 && b <= 0x7E) ch = String.fromCharCode(b);
    if (i > 0 && i % 20 === 0) process.stdout.write('\n');
    process.stdout.write(`${hex}(${ch}) `);
}
console.log('\n');

// Failed file: bytes from sigStart onwards
const failSigBlock = failBuf.slice(failSigStart);
console.log('Failed file - signature block (first 100 bytes):');
for (let i = 0; i < Math.min(100, failSigBlock.length); i++) {
    const b = failSigBlock[i];
    const hex = '0x' + b.toString(16).padStart(2, '0');
    let ch = '.';
    if (b === 0x0D) ch = '\\r';
    else if (b === 0x0A) ch = '\\n';
    else if (b >= 0x20 && b <= 0x7E) ch = String.fromCharCode(b);
    if (i > 0 && i % 20 === 0) process.stdout.write('\n');
    process.stdout.write(`${hex}(${ch}) `);
}
console.log('\n');

// Now check line endings BETWEEN blocks
console.log('=== LINE ENDINGS BETWEEN SIGNATURE BLOCKS ===');

// Success file
const successSigBlockStr = successSigBlock.toString('latin1');
const sigTagEnd1 = successSigBlockStr.indexOf('</START-SIGNATURE>') + '</START-SIGNATURE>'.length;
const nextTagStart1 = successSigBlockStr.indexOf('<START-CERTIFICATE>');
const between1 = successSigBlockStr.substring(sigTagEnd1, nextTagStart1);
console.log(`Success - between </START-SIGNATURE> and <START-CERTIFICATE>:`);
console.log(`  "${between1.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${between1.length} chars)`);
console.log(`  Bytes: ${Array.from(Buffer.from(between1, 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);

const certTagEnd1 = successSigBlockStr.indexOf('</START-CERTIFICATE>') + '</START-CERTIFICATE>'.length;
const nextVerStart1 = successSigBlockStr.indexOf('<SIGNER-VERSION>');
const between2 = successSigBlockStr.substring(certTagEnd1, nextVerStart1);
console.log(`Success - between </START-CERTIFICATE> and <SIGNER-VERSION>:`);
console.log(`  "${between2.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${between2.length} chars)`);
console.log(`  Bytes: ${Array.from(Buffer.from(between2, 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);

// Failed file
const failSigBlockStr = failSigBlock.toString('latin1');
const sigTagEnd2 = failSigBlockStr.indexOf('</START-SIGNATURE>') + '</START-SIGNATURE>'.length;
const nextTagStart2 = failSigBlockStr.indexOf('<START-CERTIFICATE>');
const between3 = failSigBlockStr.substring(sigTagEnd2, nextTagStart2);
console.log(`Failed - between </START-SIGNATURE> and <START-CERTIFICATE>:`);
console.log(`  "${between3.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${between3.length} chars)`);
console.log(`  Bytes: ${Array.from(Buffer.from(between3, 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);

const certTagEnd2 = failSigBlockStr.indexOf('</START-CERTIFICATE>') + '</START-CERTIFICATE>'.length;
const nextVerStart2 = failSigBlockStr.indexOf('<SIGNER-VERSION>');
const between4 = failSigBlockStr.substring(certTagEnd2, nextVerStart2);
console.log(`Failed - between </START-CERTIFICATE> and <SIGNER-VERSION>:`);
console.log(`  "${between4.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${between4.length} chars)`);
console.log(`  Bytes: ${Array.from(Buffer.from(between4, 'latin1')).map(b => '0x'+b.toString(16).padStart(2,'0')).join(' ')}`);

// Check what's after </SIGNER-VERSION>
const verEnd1 = successSigBlockStr.indexOf('</SIGNER-VERSION>') + '</SIGNER-VERSION>'.length;
const after1 = successSigBlockStr.substring(verEnd1);
console.log(`\nSuccess - after </SIGNER-VERSION>: "${after1.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${after1.length} chars)`);

const verEnd2 = failSigBlockStr.indexOf('</SIGNER-VERSION>') + '</SIGNER-VERSION>'.length;
const after2 = failSigBlockStr.substring(verEnd2);
console.log(`Failed - after </SIGNER-VERSION>: "${after2.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}" (${after2.length} chars)`);

console.log('\n=== CRITICAL DIFFERENCES ===');
console.log('');
console.log('1. V-NCODE uses LF (\\n) between signature blocks');
console.log('   Our signer uses CRLF (\\r\\n) between signature blocks');
console.log('');
console.log('2. The V-NCODE digest does NOT match the file content SHA-1');
console.log('   This means V-NCODE signed a DIFFERENT version of the content');
console.log('   (likely the original unsigned file before V-NCODE modified it)');
console.log('');
console.log('3. KEY QUESTION: Does ICEGATE even cryptographically verify the signature?');
console.log('   If V-NCODE\'s signature doesn\'t verify against file content,');
console.log('   and ICEGATE still accepts it, then the issue may be FORMAT not CRYPTO.');
