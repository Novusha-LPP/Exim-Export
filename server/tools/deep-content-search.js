#!/usr/bin/env node
/**
 * deep-content-search.js — Exhaustive search for what the V-NCODE signer actually hashed
 */

import fs from 'fs';
import crypto from 'crypto';

const TARGET_SHA1 = '2c83bc9b8004c4b718a4f54569fbf27c7dfb9a26';
const buf = fs.readFileSync('server/tools/962026Signed.sb');
const str = buf.toString('latin1');
const sigStart = str.indexOf('<START-SIGNATURE>');
const contentBuf = buf.slice(0, sigStart);

// Get raw lines (split by LF, keeping CR if present)
const rawLines = [];
let pos = 0;
const rawStr = contentBuf.toString('latin1');
while (pos < rawStr.length) {
    let nextLF = rawStr.indexOf('\n', pos);
    if (nextLF < 0) {
        rawLines.push(rawStr.substring(pos));
        break;
    }
    rawLines.push(rawStr.substring(pos, nextLF + 1)); // include LF
    pos = nextLF + 1;
}

console.log(`Content has ${rawLines.length} lines`);
for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const last3 = Buffer.from(line.slice(-5), 'latin1');
    console.log(`  Line ${i + 1}: ${line.length} chars, ends with: ${Array.from(last3).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
}

function sha1(data) { return crypto.createHash('sha1').update(data).digest('hex'); }

console.log('\n=== Strategy 1: Different line ending combinations per line ===\n');

// The success file has CRLF for lines 1-25 and LF for line 26 (TREC)
// Maybe V-NCODE normalizes ALL lines to CRLF (including TREC)
const allCRLF_lines = rawLines.map(line => {
    // Strip any \r\n or \n at end, then add \r\n
    return line.replace(/\r?\n$/, '') + '\r\n';
});
// Last line might not get trailing newline
const allCRLF_noTrail = [...allCRLF_lines];
allCRLF_noTrail[allCRLF_noTrail.length - 1] = allCRLF_noTrail[allCRLF_noTrail.length - 1].replace(/\r?\n$/, '');

let tests = {
    'all_CRLF': Buffer.from(allCRLF_lines.join(''), 'latin1'),
    'all_CRLF_no_trailing': Buffer.from(allCRLF_noTrail.join(''), 'latin1'),
    'all_LF': Buffer.from(rawLines.map(l => l.replace(/\r?\n$/, '\n')).join(''), 'latin1'),
    'all_LF_no_trailing': Buffer.from(rawLines.map((l, i) => {
        const stripped = l.replace(/\r?\n$/, '');
        return i < rawLines.length - 1 ? stripped + '\n' : stripped;
    }).join(''), 'latin1'),
};

for (const [name, testBuf] of Object.entries(tests)) {
    const hash = sha1(testBuf);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    console.log(`  ${match} ${name}: ${testBuf.length} bytes → ${hash}`);
}

console.log('\n=== Strategy 2: Content without TREC line ===\n');

// Maybe V-NCODE signs up to <END-SB>\r\n only (without TREC)
const endSbIdx = rawStr.indexOf('<END-SB>');
const afterEndSb = rawStr.indexOf('\n', endSbIdx) + 1;
const contentUpToEndSb = contentBuf.slice(0, afterEndSb);
const contentUpToEndSbNoNewline = contentBuf.slice(0, afterEndSb - 1); // without trailing \n
const contentUpToEndSbNoCRLF = contentBuf.slice(0, afterEndSb - 2); // without \r\n

tests = {
    'up_to_endSB_incl_crlf': contentUpToEndSb,
    'up_to_endSB_no_lf': contentUpToEndSbNoNewline,
    'up_to_endSB_no_crlf': contentUpToEndSbNoCRLF,
    'up_to_endSB_tag_only': contentBuf.slice(0, endSbIdx + '<END-SB>'.length),
};

for (const [name, testBuf] of Object.entries(tests)) {
    const hash = sha1(testBuf);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    console.log(`  ${match} ${name}: ${testBuf.length} bytes → ${hash}`);
}

console.log('\n=== Strategy 3: UTF-16 / other encodings ===\n');

// Maybe V-NCODE converts to UTF-16LE or UTF-16BE before hashing
const contentStr = contentBuf.toString('latin1');
tests = {
    'utf16le': Buffer.from(contentStr, 'utf16le'),
    'utf16le_with_bom': Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(contentStr, 'utf16le')]),
};

for (const [name, testBuf] of Object.entries(tests)) {
    const hash = sha1(testBuf);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    console.log(`  ${match} ${name}: ${testBuf.length} bytes → ${hash}`);
}

console.log('\n=== Strategy 4: Line trimming (strip trailing spaces/FS) ===\n');

// Maybe each line's trailing whitespace or FS chars are stripped
const trimmedLines = rawLines.map(line => {
    const stripped = line.replace(/\r?\n$/, '');
    return stripped.replace(/[\x1D\x20]+$/, ''); // strip trailing FS and spaces
});

tests = {
    'trimmed_CRLF': Buffer.from(trimmedLines.join('\r\n') + '\r\n', 'latin1'),
    'trimmed_CRLF_no_trail': Buffer.from(trimmedLines.join('\r\n'), 'latin1'),
    'trimmed_LF': Buffer.from(trimmedLines.join('\n') + '\n', 'latin1'),
    'trimmed_LF_no_trail': Buffer.from(trimmedLines.join('\n'), 'latin1'),
};

for (const [name, testBuf] of Object.entries(tests)) {
    const hash = sha1(testBuf);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    console.log(`  ${match} ${name}: ${testBuf.length} bytes → ${hash}`);
}

console.log('\n=== Strategy 5: Only data records (skip TABLE headers) ===\n');

// Maybe V-NCODE only signs the F-records and HREC/TREC, not <TABLE> lines
const dataOnlyLines = rawLines.filter(line => {
    const stripped = line.replace(/\r?\n$/, '');
    return !stripped.startsWith('<TABLE>') && !stripped.startsWith('<END-SB>');
});

tests = {
    'data_only_CRLF': Buffer.from(dataOnlyLines.map(l => l.replace(/\r?\n$/, '\r\n')).join(''), 'latin1'),
    'data_only_LF': Buffer.from(dataOnlyLines.map(l => l.replace(/\r?\n$/, '\n')).join(''), 'latin1'),
    'data_only_CRLF_no_trail': Buffer.from(dataOnlyLines.map((l, i) => {
        const s = l.replace(/\r?\n$/, '');
        return i < dataOnlyLines.length - 1 ? s + '\r\n' : s;
    }).join(''), 'latin1'),
};

for (const [name, testBuf] of Object.entries(tests)) {
    const hash = sha1(testBuf);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    console.log(`  ${match} ${name}: ${testBuf.length} bytes → ${hash}`);
}

console.log('\n=== Strategy 6: Check if HREC timestamp differs ===\n');

// Both files have different HREC timestamps (0709 vs 0718)
// Maybe the content was signed BEFORE the HREC was finalized
// Let's try with the other file's time
const otherBuf = fs.readFileSync('server/tools/GIM_EXP_SEA_00096_26-27_3201643.sb');
const otherStr = otherBuf.toString('latin1');
const otherSigStart = otherStr.indexOf('<START-SIGNATURE>');
const otherContent = otherBuf.slice(0, otherSigStart);

// The only difference in content should be the timestamp in HREC
// Success: 0709, Failed: 0718
// Let's verify
console.log('Success HREC time:', rawLines[0].match(/\d{4}$/m));
console.log('Content hash with time replaced to 0718:');
const modContent = Buffer.from(contentStr.replace('0709\r\n', '0718\r\n'), 'latin1');
console.log(`  SHA1: ${sha1(modContent)} (target: ${TARGET_SHA1})`);

console.log('\n=== Strategy 7: File without signature block ===\n');

// Maybe V-NCODE creates an unsigned file first, then signs it
// The unsigned file would be the content + TREC line but with CRLF on TREC too
// Let's try: content where TREC line has CRLF instead of LF
const contentWithCRLF_TREC = Buffer.from(rawStr.replace('TREC\x1D96\n', 'TREC\x1D96\r\n'), 'latin1');
console.log(`  TREC with CRLF: ${sha1(contentWithCRLF_TREC)} (${contentWithCRLF_TREC.length} bytes)`);

// Without trailing newline on TREC
const contentTREC_noline = Buffer.from(rawStr.replace('TREC\x1D96\n', 'TREC\x1D96'), 'latin1');
console.log(`  TREC no newline: ${sha1(contentTREC_noline)} (${contentTREC_noline.length} bytes)`);

console.log('\n=== Strategy 8: Check if V-NCODE prepends/appends anything ===\n');

// Some signers prepend filenames or metadata
const filename = '962026Signed.sb';
const filenameBuf = Buffer.from(filename, 'latin1');

tests = {
    'filename+content': Buffer.concat([filenameBuf, contentBuf]),
    'content+filename': Buffer.concat([contentBuf, filenameBuf]),
};

for (const [name, testBuf] of Object.entries(tests)) {
    const hash = sha1(testBuf);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    console.log(`  ${match} ${name}: ${testBuf.length} bytes → ${hash}`);
}

// Try with original unsigned filename pattern
const origFilename = 'GIM_EXP_SEA_00096_26-27_3201643.sb';
tests = {
    'orig_filename+content': Buffer.concat([Buffer.from(origFilename), contentBuf]),
    'content+orig_filename': Buffer.concat([contentBuf, Buffer.from(origFilename)]),
};

for (const [name, testBuf] of Object.entries(tests)) {
    const hash = sha1(testBuf);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    console.log(`  ${match} ${name}: ${testBuf.length} bytes → ${hash}`);
}

console.log('\n=== Strategy 9: Content up to different points with all CRLF ===\n');

// The TREC line in the success file ends with LF (not CRLF)
// Maybe V-NCODE generates the file with ALL CRLF, then signs, 
// then the upload process converts the TREC line ending
const allCRLF = Buffer.from(rawStr.replace(/\r?\n/g, '\r\n'), 'latin1');
console.log(`  All CRLF content: ${sha1(allCRLF)} (${allCRLF.length} bytes)`);

// All CRLF but without the last newline
const allCRLFnoTrail = Buffer.from(rawStr.replace(/\r?\n/g, '\r\n').replace(/\r\n$/, ''), 'latin1');
console.log(`  All CRLF no trail: ${sha1(allCRLFnoTrail)} (${allCRLFnoTrail.length} bytes)`);

console.log('\n=== Strategy 10: V-NCODE specific — check if content is unsigned file ===\n');

// V-NCODE might read the file BEFORE signature was appended 
// The file before signing would have been:
// HREC...\r\n ... <END-SB>\r\n TREC\x1D96\r\n  (all CRLF, no signature block)
// But after signing, the signer appends the signature blocks and may convert TREC ending to LF

// The actual unsigned content would be the same but with CRLF on the TREC line
const unsignedContent = Buffer.from(rawStr.replace(/TREC\x1D96\n$/, 'TREC\x1D96\r\n'), 'latin1');
console.log(`  Unsigned (TREC CRLF): ${sha1(unsignedContent)} (${unsignedContent.length} bytes)`);

// Without ANY trailing after TREC\x1D96
const noTrail = Buffer.from(rawStr.replace(/TREC\x1D96\n$/, 'TREC\x1D96'), 'latin1');
console.log(`  No trailing (TREC no NL): ${sha1(noTrail)} (${noTrail.length} bytes)`);

// Check with different TREC formats
const trecVariants = [
    'TREC\x1D96',
    'TREC\x1D96\n',
    'TREC\x1D96\r\n',
    'TREC\x1D96\r',
];

const baseContent = rawStr.replace(/TREC\x1D96\n$/, '');
console.log(`\nBase (without TREC line): ${sha1(Buffer.from(baseContent, 'latin1'))} (${baseContent.length} bytes)`);

for (const variant of trecVariants) {
    const test = Buffer.from(baseContent + variant, 'latin1');
    const hash = sha1(test);
    const match = hash === TARGET_SHA1 ? '✅' : '❌';
    const desc = variant.replace('\x1D', 'FS').replace('\r', '\\r').replace('\n', '\\n');
    console.log(`  ${match} TREC="${desc}": ${hash} (${test.length} bytes)`);
}

console.log('\n=== ALL DONE ===');
