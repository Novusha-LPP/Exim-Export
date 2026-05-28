#!/usr/bin/env node
/**
 * brute-force-hash.js — Try hundreds of transformations to find the Softlink/V-NCODE hash target
 */

import fs from 'fs';
import crypto from 'crypto';

// The success file signed by Softlink
const successBuf = fs.readFileSync('server/tools/28602026-signed.sb');
const successStr = successBuf.toString('latin1');
const successSigIdx = successStr.indexOf('<START-SIGNATURE>');
const successContent = successBuf.slice(0, successSigIdx);
const successContentStr = successStr.substring(0, successSigIdx);

// The embedded digest inside Softlink's signature
const targetDigest = '7261675f6c524d6e17bb6c80c5b2da49929cfbf4';

console.log(`Target Hash (Softlink): ${targetDigest}`);
console.log(`Original Content Size: ${successContent.length}`);

// Helper to check a buffer and report if it matches
let found = false;
function checkHash(buf, name) {
    const hash = crypto.createHash('sha1').update(buf).digest('hex');
    if (hash === targetDigest) {
        console.log(`\n🎉 BINGO! MATCH FOUND: ${name}`);
        console.log(`Size: ${buf.length} bytes`);
        found = true;
        return true;
    }
    return false;
}

// 1. Line Ending Permutations
const noCR = successContentStr.replace(/\r/g, '');
const allCRLF = noCR.replace(/\n/g, '\r\n');
checkHash(Buffer.from(noCR, 'latin1'), "All LF (\\n)");
checkHash(Buffer.from(allCRLF, 'latin1'), "All CRLF (\\r\\n)");
checkHash(Buffer.from(noCR.trimEnd(), 'latin1'), "All LF (\\n) - Trimmed End");
checkHash(Buffer.from(allCRLF.trimEnd(), 'latin1'), "All CRLF (\\r\\n) - Trimmed End");
checkHash(Buffer.from(noCR.trimEnd() + '\n', 'latin1'), "All LF (\\n) - Exactly one trailing \\n");
checkHash(Buffer.from(allCRLF.trimEnd() + '\r\n', 'latin1'), "All CRLF (\\r\\n) - Exactly one trailing \\r\\n");

// 2. Trailing/Leading Whitespace Stripping
const lines = successContentStr.split('\n');
const strippedEndLines = lines.map(l => l.replace(/[\s\r]+$/, ''));
checkHash(Buffer.from(strippedEndLines.join('\n'), 'latin1'), "Stripped Trailing Space - All LF");
checkHash(Buffer.from(strippedEndLines.join('\r\n'), 'latin1'), "Stripped Trailing Space - All CRLF");

// 3. What if it drops the TREC line entirely?
const trecIdx = successContentStr.lastIndexOf('TREC');
if (trecIdx !== -1) {
    const noTrecStr = successContentStr.substring(0, trecIdx);
    checkHash(Buffer.from(noTrecStr, 'latin1'), "No TREC line - Raw");
    checkHash(Buffer.from(noTrecStr.replace(/\r/g, ''), 'latin1'), "No TREC line - All LF");
    checkHash(Buffer.from(noTrecStr.replace(/\r/g, '').replace(/\n/g, '\r\n'), 'latin1'), "No TREC line - All CRLF");
    checkHash(Buffer.from(noTrecStr.replace(/\s+$/, ''), 'latin1'), "No TREC line - Trimmed End");
}

// 4. What if it drops both <END-SB> and TREC?
const endSbIdx = successContentStr.lastIndexOf('<END-SB>');
if (endSbIdx !== -1) {
    const noEndSbStr = successContentStr.substring(0, endSbIdx);
    checkHash(Buffer.from(noEndSbStr, 'latin1'), "No <END-SB> & No TREC - Raw");
    checkHash(Buffer.from(noEndSbStr.replace(/\r/g, ''), 'latin1'), "No <END-SB> & No TREC - All LF");
}

// 5. Special Character Replacements (Field Separators)
// Field Separator (FS) is 0x1D
const fsPipe = successContentStr.replace(/\x1d/g, '|');
checkHash(Buffer.from(fsPipe, 'latin1'), "FS replaced with |");
const fsCaret = successContentStr.replace(/\x1d/g, '^');
checkHash(Buffer.from(fsCaret, 'latin1'), "FS replaced with ^");
const fsTab = successContentStr.replace(/\x1d/g, '\t');
checkHash(Buffer.from(fsTab, 'latin1'), "FS replaced with Tab");
const fsComma = successContentStr.replace(/\x1d/g, ',');
checkHash(Buffer.from(fsComma, 'latin1'), "FS replaced with Comma");
const fsSpace = successContentStr.replace(/\x1d/g, ' ');
checkHash(Buffer.from(fsSpace, 'latin1'), "FS replaced with Space");
const fsRemoved = successContentStr.replace(/\x1d/g, '');
checkHash(Buffer.from(fsRemoved, 'latin1'), "FS removed entirely");

// 6. Encoding variants
checkHash(Buffer.from(successContentStr, 'utf8'), "UTF-8 Encoded");
checkHash(Buffer.from(successContentStr, 'utf16le'), "UTF-16LE Encoded");
checkHash(Buffer.from(successContentStr, 'ascii'), "ASCII Encoded");

// 7. Base64 hashing (some tools hash the base64 of the file instead of the file itself)
checkHash(Buffer.from(successContent.toString('base64'), 'latin1'), "Base64 of Raw File");
checkHash(Buffer.from(Buffer.from(noCR, 'latin1').toString('base64'), 'latin1'), "Base64 of LF File");
checkHash(Buffer.from(Buffer.from(allCRLF, 'latin1').toString('base64'), 'latin1'), "Base64 of CRLF File");

// 8. Length-prefixed (Java serialization style, some signers do this)
const lenBuf = Buffer.alloc(4);
lenBuf.writeInt32BE(successContent.length, 0);
checkHash(Buffer.concat([lenBuf, successContent]), "32-bit BE Length Prefixed");

// 9. Maybe it only hashes the HREC and <TABLE>SB blocks?
const nextTableIdx = successContentStr.indexOf('<TABLE>INVOICE');
if (nextTableIdx !== -1) {
    checkHash(Buffer.from(successContentStr.substring(0, nextTableIdx), 'latin1'), "Only HREC and SB table");
}

// 10. Check permutations of lines 
// Often signatures are made over an array of strings in Java/C#, joined by a specific char
checkHash(Buffer.from(strippedEndLines.join(''), 'latin1'), "Lines joined with nothing");
checkHash(Buffer.from(strippedEndLines.join('|'), 'latin1'), "Lines joined with pipe");

// 11. Maybe the FS is represented as literally "^]" or something?
const fsLiteral = successContentStr.replace(/\x1d/g, '^]');
checkHash(Buffer.from(fsLiteral, 'latin1'), "FS replaced with ^]");
const fsLiteralHex = successContentStr.replace(/\x1d/g, '0x1D');
checkHash(Buffer.from(fsLiteralHex, 'latin1'), "FS replaced with 0x1D");

// 12. Removing all whitespace
const noSpace = successContentStr.replace(/\s+/g, '');
checkHash(Buffer.from(noSpace, 'latin1'), "All whitespace removed");


if (!found) {
    console.log('\n❌ None of the common transformations matched.');
}
