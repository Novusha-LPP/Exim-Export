#!/usr/bin/env node
/**
 * find-signed-content.js — Brute-force find what content was signed in the success file
 * 
 * The V-NCODE signer (successful file) used SHA-1 and produced digest:
 *   2c83bc9b8004c4b718a4f54569fbf27c7dfb9a26
 * 
 * This script tries every possible content boundary to find what was hashed.
 */

import fs from 'fs';
import crypto from 'crypto';

const TARGET_SHA1 = '2c83bc9b8004c4b718a4f54569fbf27c7dfb9a26';

const buf = fs.readFileSync('server/tools/962026Signed.sb');
const str = buf.toString('latin1');

console.log('File size:', buf.length, 'bytes');
console.log('Target SHA-1:', TARGET_SHA1);
console.log('');

// Find key positions
const sigStart = str.indexOf('<START-SIGNATURE>');
console.log('<START-SIGNATURE> at offset:', sigStart);
const endSb = str.indexOf('<END-SB>');
console.log('<END-SB> at offset:', endSb);
const trec = str.indexOf('TREC');
console.log('TREC at offset:', trec);

// Show bytes around each key position
function showBytesAround(pos, label, radius = 10) {
    const start = Math.max(0, pos - radius);
    const end = Math.min(buf.length, pos + radius);
    const bytes = [];
    for (let i = start; i < end; i++) {
        const b = buf[i];
        const hex = '0x' + b.toString(16).padStart(2, '0');
        let ch;
        if (b === 0x0D) ch = '\\r';
        else if (b === 0x0A) ch = '\\n';
        else if (b === 0x1D) ch = 'FS';
        else if (b >= 0x20 && b <= 0x7E) ch = String.fromCharCode(b);
        else ch = '.';
        bytes.push(`${i}:${hex}(${ch})`);
    }
    console.log(`  ${label} @${pos}: ${bytes.join(' ')}`);
}

showBytesAround(sigStart, 'sigStart', 5);
showBytesAround(endSb, 'endSb', 15);
showBytesAround(trec, 'trec', 15);

console.log('\n=== Brute-force boundary search ===\n');

// Try every possible end position from 1 to sigStart
// Also try with both raw buffer and LF-normalized
let found = false;

for (let endPos = 1; endPos <= sigStart + 1; endPos++) {
    const slice = buf.slice(0, endPos);
    const hash = crypto.createHash('sha1').update(slice).digest('hex');
    if (hash === TARGET_SHA1) {
        console.log(`✅ FOUND! End position: ${endPos}`);
        console.log(`   Content: bytes 0..${endPos - 1} (${endPos} bytes)`);
        // Show last 20 bytes
        const tail = slice.slice(Math.max(0, slice.length - 20));
        const tailInfo = Array.from(tail).map((b, i) => {
            const pos = endPos - 20 + i;
            const hex = '0x' + b.toString(16).padStart(2, '0');
            let ch;
            if (b === 0x0D) ch = '\\r';
            else if (b === 0x0A) ch = '\\n';
            else if (b === 0x1D) ch = 'FS';
            else if (b >= 0x20 && b <= 0x7E) ch = String.fromCharCode(b);
            else ch = '.';
            return `${hex}(${ch})`;
        }).join(' ');
        console.log(`   Last 20 bytes: ${tailInfo}`);
        
        // Identify what's at the boundary
        if (endPos === endSb + 8) console.log('   → Ends right after <END-SB> tag');
        if (endPos === trec) console.log('   → Ends right before TREC');
        
        // Compute what line this is on
        const contentStr = str.substring(0, endPos);
        const lineCount = contentStr.split('\n').length;
        console.log(`   Lines in content: ${lineCount}`);
        
        found = true;
    }
}

// Also try LF-normalized versions
console.log('\n=== Trying LF-normalized content ===\n');

for (let endPos = 1; endPos <= sigStart + 1; endPos++) {
    const slice = buf.slice(0, endPos);
    // Normalize CRLF -> LF
    const normalized = Buffer.from(slice.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    const hash = crypto.createHash('sha1').update(normalized).digest('hex');
    if (hash === TARGET_SHA1) {
        console.log(`✅ FOUND with LF-normalized! End position: ${endPos} (normalized: ${normalized.length} bytes)`);
        const tail = normalized.slice(Math.max(0, normalized.length - 20));
        console.log(`   Last 20 bytes: ${Array.from(tail).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
        found = true;
    }
}

// Try CRLF-normalized versions  
console.log('\n=== Trying CRLF-normalized content ===\n');

for (let endPos = 1; endPos <= sigStart + 1; endPos++) {
    const slice = buf.slice(0, endPos);
    // Normalize LF -> CRLF
    const normalized = Buffer.from(slice.toString('latin1').replace(/(?<!\r)\n/g, '\r\n'), 'latin1');
    const hash = crypto.createHash('sha1').update(normalized).digest('hex');
    if (hash === TARGET_SHA1) {
        console.log(`✅ FOUND with CRLF-normalized! End position: ${endPos} (normalized: ${normalized.length} bytes)`);
        const tail = normalized.slice(Math.max(0, normalized.length - 20));
        console.log(`   Last 20 bytes: ${Array.from(tail).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
        found = true;
    }
}

// Try stripping the TREC line entirely
console.log('\n=== Trying without TREC line ===\n');
const withoutTREC = buf.slice(0, trec);
const withoutTRECnorm = Buffer.from(withoutTREC.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
console.log(`Without TREC (raw): SHA1=${crypto.createHash('sha1').update(withoutTREC).digest('hex')}`);
console.log(`Without TREC (LF):  SHA1=${crypto.createHash('sha1').update(withoutTRECnorm).digest('hex')}`);

// Try content between various markers
console.log('\n=== Trying content ranges ===\n');
// From start to just before <END-SB>\r\n
const endSbLineEnd = str.indexOf('\n', endSb) + 1;
for (let start = 0; start <= 5; start++) {
    for (let end = endSb; end <= endSbLineEnd + 5; end++) {
        const slice = buf.slice(start, end);
        const hash = crypto.createHash('sha1').update(slice).digest('hex');
        if (hash === TARGET_SHA1) {
            console.log(`✅ FOUND! Range [${start}..${end}) = ${end - start} bytes`);
        }
        // Also LF-normalized
        const norm = Buffer.from(slice.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
        const normHash = crypto.createHash('sha1').update(norm).digest('hex');
        if (normHash === TARGET_SHA1) {
            console.log(`✅ FOUND (LF-norm)! Range [${start}..${end}) = ${norm.length} bytes`);
        }
    }
}

// Try from TREC boundaries 
const trecEnd = str.indexOf('\n', trec);
for (let end = trec; end <= trecEnd + 5 && end <= sigStart + 1; end++) {
    const slice = buf.slice(0, end);
    const hash = crypto.createHash('sha1').update(slice).digest('hex');
    if (hash === TARGET_SHA1) {
        console.log(`✅ FOUND! [0..${end}) = ${end} bytes`);
    }
    const norm = Buffer.from(slice.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    if (crypto.createHash('sha1').update(norm).digest('hex') === TARGET_SHA1) {
        console.log(`✅ FOUND (LF-norm)! [0..${end}) → ${norm.length} bytes`);
    }
    // All CRLF
    const allCrlf = Buffer.from(slice.toString('latin1').replace(/\r?\n/g, '\r\n'), 'latin1');
    if (crypto.createHash('sha1').update(allCrlf).digest('hex') === TARGET_SHA1) {
        console.log(`✅ FOUND (all-CRLF)! [0..${end}) → ${allCrlf.length} bytes`);
    }
}

if (!found) {
    console.log('\n❌ Could not find matching content boundary');
    console.log('\nThis suggests the V-NCODE signer may be:');
    console.log('  1. Modifying content before signing (e.g., re-encoding, trimming whitespace)');
    console.log('  2. Signing a different representation of the data');
    console.log('  3. Including/excluding specific metadata bytes');
}
