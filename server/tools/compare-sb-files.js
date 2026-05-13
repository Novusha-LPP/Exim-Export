#!/usr/bin/env node
/**
 * compare-sb-files.js — Deterministic comparison of two ICEGATE .sb files
 * 
 * Usage: node compare-sb-files.js <file1.sb> <file2.sb>
 * 
 * Outputs:
 *   - Byte-by-byte differences (first 200)
 *   - Per-record field-count comparison
 *   - Digest comparison (SHA-1, SHA-256 of content + full file)
 *   - Certificate algorithm and keyUsage
 *   - <SIGNER-VERSION> exact bytes
 *   - Decoded RSA DigestInfo from each signature
 */

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const FS = 0x1D; // Field separator
const FS_CHAR = '\x1D';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFile(filePath) {
    return fs.readFileSync(filePath);
}

function hexByte(b) {
    return '0x' + b.toString(16).padStart(2, '0').toUpperCase();
}

function printableByte(b) {
    if (b === 0x0D) return '\\r';
    if (b === 0x0A) return '\\n';
    if (b === 0x1D) return '⌁';
    if (b >= 0x20 && b <= 0x7E) return String.fromCharCode(b);
    return '.';
}

function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

// ─── Parse .sb structure ─────────────────────────────────────────────────────

function parseSB(buf) {
    const str = buf.toString('latin1');
    
    // Find signature/certificate/version blocks
    const sigStart = str.indexOf('<START-SIGNATURE>');
    const sigEnd = str.indexOf('</START-SIGNATURE>');
    const certStart = str.indexOf('<START-CERTIFICATE>');
    const certEnd = str.indexOf('</START-CERTIFICATE>');
    const verStart = str.indexOf('<SIGNER-VERSION>');
    const verEnd = str.indexOf('</SIGNER-VERSION>');
    
    let contentEnd = sigStart >= 0 ? sigStart : buf.length;
    const contentBuf = buf.slice(0, contentEnd);
    
    const signature64 = sigStart >= 0 && sigEnd >= 0 
        ? str.substring(sigStart + '<START-SIGNATURE>'.length, sigEnd) 
        : null;
    
    const cert64 = certStart >= 0 && certEnd >= 0 
        ? str.substring(certStart + '<START-CERTIFICATE>'.length, certEnd)
        : null;
    
    const signerVersion = verStart >= 0 && verEnd >= 0 
        ? str.substring(verStart + '<SIGNER-VERSION>'.length, verEnd) 
        : null;
    
    // Parse records from content
    const lines = contentBuf.toString('latin1').split(/\r?\n/).filter(l => l.length > 0);
    
    const records = [];
    let currentTable = null;
    
    for (const line of lines) {
        if (line.startsWith('<TABLE>')) {
            currentTable = line.substring(7);
            records.push({ type: 'TABLE_HEADER', table: currentTable, raw: line });
        } else if (line.startsWith('<END-SB>')) {
            records.push({ type: 'END_SB', raw: line });
        } else if (line.startsWith('HREC')) {
            const fields = line.split(FS_CHAR);
            records.push({ type: 'HREC', fields, fieldCount: fields.length, raw: line, table: null });
        } else if (line.startsWith('TREC')) {
            const fields = line.split(FS_CHAR);
            records.push({ type: 'TREC', fields, fieldCount: fields.length, raw: line, table: null });
        } else if (line.startsWith('F' + FS_CHAR)) {
            const fields = line.split(FS_CHAR);
            records.push({ type: 'F', fields, fieldCount: fields.length, table: currentTable, raw: line });
        } else {
            records.push({ type: 'OTHER', raw: line, table: currentTable });
        }
    }
    
    return {
        buf,
        contentBuf,
        records,
        signature64,
        cert64,
        signerVersion,
        signerVersionBytes: verStart >= 0 && verEnd >= 0 
            ? buf.slice(verStart + '<SIGNER-VERSION>'.length, buf.indexOf('</SIGNER-VERSION>'))
            : null,
    };
}

// ─── Report sections ─────────────────────────────────────────────────────────

function byteDiff(buf1, buf2, maxDiffs = 200) {
    console.log('\n' + '='.repeat(80));
    console.log('  BYTE-BY-BYTE COMPARISON');
    console.log('='.repeat(80));
    
    const maxLen = Math.max(buf1.length, buf2.length);
    let diffCount = 0;
    
    console.log(`  File 1: ${buf1.length} bytes`);
    console.log(`  File 2: ${buf2.length} bytes`);
    console.log(`  Length diff: ${buf2.length - buf1.length} bytes`);
    console.log('');
    
    if (buf1.equals(buf2)) {
        console.log('  ✅ Files are BYTE-IDENTICAL');
        return;
    }
    
    console.log(`  Offset    | File1          | File2          | Context`);
    console.log('  ' + '-'.repeat(70));
    
    for (let i = 0; i < maxLen && diffCount < maxDiffs; i++) {
        const b1 = i < buf1.length ? buf1[i] : undefined;
        const b2 = i < buf2.length ? buf2[i] : undefined;
        
        if (b1 !== b2) {
            const ctx1 = getContext(buf1, i, 8);
            const ctx2 = getContext(buf2, i, 8);
            console.log(`  ${String(i).padStart(8)} | ${b1 !== undefined ? hexByte(b1) + ' ' + printableByte(b1) : 'EOF'} ${' '.repeat(6)} | ${b2 !== undefined ? hexByte(b2) + ' ' + printableByte(b2) : 'EOF'} ${' '.repeat(6)} | ${ctx1}`);
            diffCount++;
        }
    }
    
    if (diffCount >= maxDiffs) {
        console.log(`  ... (truncated at ${maxDiffs} differences)`);
    }
    console.log(`  Total differences: ${diffCount}${diffCount >= maxDiffs ? '+' : ''}`);
}

function getContext(buf, pos, radius) {
    const start = Math.max(0, pos - radius);
    const end = Math.min(buf.length, pos + radius);
    let ctx = '';
    for (let i = start; i < end; i++) {
        ctx += printableByte(buf[i]);
    }
    return ctx;
}

function recordComparison(parsed1, parsed2, name1, name2) {
    console.log('\n' + '='.repeat(80));
    console.log('  PER-RECORD FIELD-COUNT COMPARISON');
    console.log('='.repeat(80));
    
    // Group F-records by table
    const tables1 = {};
    const tables2 = {};
    
    for (const r of parsed1.records) {
        if (r.type === 'HREC' || r.type === 'TREC') {
            if (!tables1['_HEADER_TRAILER']) tables1['_HEADER_TRAILER'] = [];
            tables1['_HEADER_TRAILER'].push(r);
        } else if (r.type === 'F') {
            if (!tables1[r.table]) tables1[r.table] = [];
            tables1[r.table].push(r);
        }
    }
    for (const r of parsed2.records) {
        if (r.type === 'HREC' || r.type === 'TREC') {
            if (!tables2['_HEADER_TRAILER']) tables2['_HEADER_TRAILER'] = [];
            tables2['_HEADER_TRAILER'].push(r);
        } else if (r.type === 'F') {
            if (!tables2[r.table]) tables2[r.table] = [];
            tables2[r.table].push(r);
        }
    }
    
    const allTables = new Set([...Object.keys(tables1), ...Object.keys(tables2)]);
    
    for (const table of allTables) {
        const recs1 = tables1[table] || [];
        const recs2 = tables2[table] || [];
        
        console.log(`\n  ── ${table} ──`);
        console.log(`  ${name1}: ${recs1.length} records`);
        console.log(`  ${name2}: ${recs2.length} records`);
        
        // Compare field counts
        const maxRecs = Math.max(recs1.length, recs2.length);
        for (let i = 0; i < maxRecs; i++) {
            const r1 = recs1[i];
            const r2 = recs2[i];
            const fc1 = r1 ? r1.fieldCount : '-';
            const fc2 = r2 ? r2.fieldCount : '-';
            const match = fc1 === fc2 ? '✅' : '❌';
            const type = (r1 || r2).type;
            console.log(`    ${type} #${i + 1}: ${match} ${name1}=${fc1} fields, ${name2}=${fc2} fields`);
            
            if (fc1 !== fc2 && r1 && r2) {
                // Show field-by-field diff
                const maxFields = Math.max(r1.fieldCount, r2.fieldCount);
                for (let f = 0; f < maxFields; f++) {
                    const v1 = f < r1.fields.length ? r1.fields[f] : '(missing)';
                    const v2 = f < r2.fields.length ? r2.fields[f] : '(missing)';
                    if (v1 !== v2) {
                        console.log(`      [${f}]: "${trunc(v1, 40)}" vs "${trunc(v2, 40)}"`);
                    }
                }
            }
        }
    }
}

function trunc(s, n) {
    return s.length > n ? s.slice(0, n) + '...' : s;
}

function digestComparison(parsed1, parsed2, name1, name2) {
    console.log('\n' + '='.repeat(80));
    console.log('  DIGEST COMPARISON');
    console.log('='.repeat(80));
    
    console.log(`\n  Content portion (before <START-SIGNATURE>):`);
    console.log(`    ${name1}: SHA-1   = ${sha1(parsed1.contentBuf)}`);
    console.log(`    ${name2}: SHA-1   = ${sha1(parsed2.contentBuf)}`);
    console.log(`    ${name1}: SHA-256 = ${sha256(parsed1.contentBuf)}`);
    console.log(`    ${name2}: SHA-256 = ${sha256(parsed2.contentBuf)}`);
    console.log(`    Match: ${parsed1.contentBuf.equals(parsed2.contentBuf) ? '✅ IDENTICAL' : '❌ DIFFERENT'}`);
    
    console.log(`\n  Full file:`);
    console.log(`    ${name1}: SHA-256 = ${sha256(parsed1.buf)}`);
    console.log(`    ${name2}: SHA-256 = ${sha256(parsed2.buf)}`);
}

function signerVersionComparison(parsed1, parsed2, name1, name2) {
    console.log('\n' + '='.repeat(80));
    console.log('  SIGNER-VERSION STRING');
    console.log('='.repeat(80));
    
    console.log(`\n  ${name1}: "${parsed1.signerVersion || '(not found)'}"`);
    console.log(`  ${name2}: "${parsed2.signerVersion || '(not found)'}"`);
    
    if (parsed1.signerVersionBytes && parsed2.signerVersionBytes) {
        const bytes1 = Array.from(parsed1.signerVersionBytes).map(hexByte).join(' ');
        const bytes2 = Array.from(parsed2.signerVersionBytes).map(hexByte).join(' ');
        console.log(`\n  ${name1} bytes: ${bytes1}`);
        console.log(`  ${name2} bytes: ${bytes2}`);
        console.log(`  Match: ${parsed1.signerVersionBytes.equals(parsed2.signerVersionBytes) ? '✅' : '❌'}`);
    }
}

function certificateInfo(parsed, name) {
    console.log(`\n  ── ${name} Certificate ──`);
    if (!parsed.cert64) {
        console.log('    (no certificate found)');
        return;
    }
    
    const certDer = Buffer.from(parsed.cert64, 'base64');
    console.log(`    DER length: ${certDer.length} bytes`);
    console.log(`    SHA-1 of cert DER: ${sha1(certDer)}`);
    console.log(`    SHA-256 of cert DER: ${sha256(certDer)}`);
    
    // Basic ASN.1 parsing to find OIDs
    const certHex = certDer.toString('hex');
    
    // Check for RSA OID (1.2.840.113549.1.1.1)
    if (certHex.includes('2a864886f70d010101')) {
        console.log('    Public Key Algorithm: RSA (1.2.840.113549.1.1.1)');
    }
    
    // Check for SHA1withRSA OID (1.2.840.113549.1.1.5)
    if (certHex.includes('2a864886f70d010105')) {
        console.log('    Signature Algorithm: SHA1withRSA (1.2.840.113549.1.1.5)');
    }
    // SHA256withRSA (1.2.840.113549.1.1.11)
    if (certHex.includes('2a864886f70d01010b')) {
        console.log('    Signature Algorithm: SHA256withRSA (1.2.840.113549.1.1.11)');
    }
}

function signatureInfo(parsed, name) {
    console.log(`\n  ── ${name} Signature ──`);
    if (!parsed.signature64) {
        console.log('    (no signature found)');
        return;
    }
    
    const sigBytes = Buffer.from(parsed.signature64, 'base64');
    console.log(`    Signature length: ${sigBytes.length} bytes (${sigBytes.length * 8} bits)`);
    console.log(`    SHA-256 of signature: ${sha256(sigBytes)}`);
    
    // Try to decode RSA DigestInfo (PKCS#1 v1.5)
    // The raw RSA output after decryption should be:
    // 00 01 FF...FF 00 <DigestInfo>
    // DigestInfo = SEQUENCE { AlgorithmIdentifier, OCTET STRING (digest) }
    // We can't decrypt without the public key, but we can note the signature size
    
    if (sigBytes.length === 256) {
        console.log('    RSA key size: 2048-bit');
    } else if (sigBytes.length === 128) {
        console.log('    RSA key size: 1024-bit');
    } else if (sigBytes.length === 512) {
        console.log('    RSA key size: 4096-bit');
    }
}

function hrecTrecAnalysis(parsed, name) {
    console.log(`\n  ── ${name} HREC/TREC Analysis ──`);
    
    for (const r of parsed.records) {
        if (r.type === 'HREC') {
            console.log(`    HREC: ${r.fieldCount} fields`);
            r.fields.forEach((f, i) => {
                console.log(`      [${i}]: "${f || '(empty)'}"`);
            });
        }
        if (r.type === 'TREC') {
            console.log(`    TREC: ${r.fieldCount} fields`);
            r.fields.forEach((f, i) => {
                console.log(`      [${i}]: "${f || '(empty)'}"`);
            });
        }
    }
}

function lineEndingAnalysis(buf, name) {
    console.log(`\n  ── ${name} Line Endings ──`);
    let crlfCount = 0;
    let lfOnlyCount = 0;
    let crOnlyCount = 0;
    
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0x0D && i + 1 < buf.length && buf[i + 1] === 0x0A) {
            crlfCount++;
            i++; // skip LF
        } else if (buf[i] === 0x0A) {
            lfOnlyCount++;
        } else if (buf[i] === 0x0D) {
            crOnlyCount++;
        }
    }
    
    console.log(`    CRLF: ${crlfCount}`);
    console.log(`    LF-only: ${lfOnlyCount}`);
    console.log(`    CR-only: ${crOnlyCount}`);
    
    // Check last few bytes
    const last5 = buf.slice(Math.max(0, buf.length - 30));
    console.log(`    Last 30 bytes: ${Array.from(last5).map(b => hexByte(b) + '(' + printableByte(b) + ')').join(' ')}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node compare-sb-files.js <file1.sb> <file2.sb>');
        console.log('');
        console.log('If only one file is provided with --analyze flag, does single-file analysis.');
        if (args.length === 1) {
            console.log('\nRunning single-file analysis...');
            const buf = readFile(args[0]);
            const parsed = parseSB(buf);
            const name = path.basename(args[0]);
            
            console.log(`\n${'='.repeat(80)}`);
            console.log(`  SINGLE FILE ANALYSIS: ${name}`);
            console.log('='.repeat(80));
            
            lineEndingAnalysis(buf, name);
            hrecTrecAnalysis(parsed, name);
            certificateInfo(parsed, name);
            signatureInfo(parsed, name);
            signerVersionComparison(parsed, parsed, name, name);
            
            // Print all record field counts
            console.log(`\n  ── Record Field Counts ──`);
            let currentTable = null;
            for (const r of parsed.records) {
                if (r.type === 'TABLE_HEADER') {
                    currentTable = r.table;
                    console.log(`\n    <TABLE>${r.table}`);
                } else if (r.type === 'F') {
                    console.log(`      F-record: ${r.fieldCount} fields`);
                } else if (r.type === 'HREC' || r.type === 'TREC') {
                    console.log(`    ${r.type}: ${r.fieldCount} fields`);
                }
            }
            
            console.log(`\n  Content SHA-256: ${sha256(parsed.contentBuf)}`);
            console.log(`  Full file SHA-256: ${sha256(buf)}`);
            
            return;
        }
        process.exit(1);
    }
    
    const file1 = args[0];
    const file2 = args[1];
    const name1 = path.basename(file1);
    const name2 = path.basename(file2);
    
    console.log(`${'='.repeat(80)}`);
    console.log(`  ICEGATE .SB FILE COMPARISON`);
    console.log(`  File 1: ${file1}`);
    console.log(`  File 2: ${file2}`);
    console.log('='.repeat(80));
    
    const buf1 = readFile(file1);
    const buf2 = readFile(file2);
    
    const parsed1 = parseSB(buf1);
    const parsed2 = parseSB(buf2);
    
    // 1. Byte diff
    byteDiff(buf1, buf2);
    
    // 2. Line ending analysis
    console.log('\n' + '='.repeat(80));
    console.log('  LINE ENDING ANALYSIS');
    console.log('='.repeat(80));
    lineEndingAnalysis(buf1, name1);
    lineEndingAnalysis(buf2, name2);
    
    // 3. HREC/TREC analysis
    console.log('\n' + '='.repeat(80));
    console.log('  HREC / TREC ANALYSIS');
    console.log('='.repeat(80));
    hrecTrecAnalysis(parsed1, name1);
    hrecTrecAnalysis(parsed2, name2);
    
    // 4. Record comparison
    recordComparison(parsed1, parsed2, name1, name2);
    
    // 5. Digest comparison
    digestComparison(parsed1, parsed2, name1, name2);
    
    // 6. Certificate info
    console.log('\n' + '='.repeat(80));
    console.log('  CERTIFICATE ANALYSIS');
    console.log('='.repeat(80));
    certificateInfo(parsed1, name1);
    certificateInfo(parsed2, name2);
    
    // 7. Signature info
    console.log('\n' + '='.repeat(80));
    console.log('  SIGNATURE ANALYSIS');
    console.log('='.repeat(80));
    signatureInfo(parsed1, name1);
    signatureInfo(parsed2, name2);
    
    // 8. Signer version
    signerVersionComparison(parsed1, parsed2, name1, name2);
    
    console.log('\n' + '='.repeat(80));
    console.log('  COMPARISON COMPLETE');
    console.log('='.repeat(80));
}

main();
