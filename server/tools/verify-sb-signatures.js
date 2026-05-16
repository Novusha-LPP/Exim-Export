#!/usr/bin/env node
/**
 * verify-sb-signatures.js — Deep cryptographic analysis of ICEGATE .sb file signatures
 * 
 * Verifies the digital signature against the embedded certificate for each file.
 * Determines exactly what content was hashed and what algorithm was used.
 * 
 * Usage: node verify-sb-signatures.js <file1.sb> [file2.sb]
 */

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const FS_CHAR = '\x1D';

function readFile(filePath) {
    return fs.readFileSync(filePath);
}

function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function parseSB(buf) {
    const str = buf.toString('latin1');
    
    const sigStart = str.indexOf('<START-SIGNATURE>');
    const sigEnd = str.indexOf('</START-SIGNATURE>');
    const certStart = str.indexOf('<START-CERTIFICATE>');
    const certEnd = str.indexOf('</START-CERTIFICATE>');
    const verStart = str.indexOf('<SIGNER-VERSION>');
    const verEnd = str.indexOf('</SIGNER-VERSION>');
    
    // Content boundary is the start of the signature tag
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
    
    return { buf, str, contentBuf, signature64, cert64, signerVersion };
}

function extractPublicKeyFromCert(certDer) {
    // Build PEM from DER
    const b64 = certDer.toString('base64');
    const lines = [];
    for (let i = 0; i < b64.length; i += 64) {
        lines.push(b64.substring(i, i + 64));
    }
    const pem = '-----BEGIN CERTIFICATE-----\n' + lines.join('\n') + '\n-----END CERTIFICATE-----';
    
    try {
        const x509 = new crypto.X509Certificate(pem);
        return {
            pem,
            x509,
            publicKey: x509.publicKey,
            subject: x509.subject,
            issuer: x509.issuer,
            serialNumber: x509.serialNumber,
            validFrom: x509.validFrom,
            validTo: x509.validTo,
        };
    } catch (e) {
        console.error('Failed to parse X.509 cert:', e.message);
        return { pem, x509: null, publicKey: null };
    }
}

function verifySignature(contentBuf, signatureBytes, publicKey, algorithm) {
    try {
        const verify = crypto.createVerify(algorithm);
        verify.update(contentBuf);
        verify.end();
        return verify.verify(publicKey, signatureBytes);
    } catch (e) {
        return { error: e.message };
    }
}

function analyzeLineEndings(buf, label) {
    let crlfCount = 0, lfCount = 0, crCount = 0;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0x0D && i + 1 < buf.length && buf[i + 1] === 0x0A) {
            crlfCount++; i++;
        } else if (buf[i] === 0x0A) {
            lfCount++;
        } else if (buf[i] === 0x0D) {
            crCount++;
        }
    }
    return { crlfCount, lfCount, crCount };
}

function analyzeFile(filePath) {
    const name = path.basename(filePath);
    const buf = readFile(filePath);
    const parsed = parseSB(buf);
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`  FILE: ${name}`);
    console.log(`  Size: ${buf.length} bytes`);
    console.log(`${'═'.repeat(80)}`);
    
    // 1. Certificate
    console.log('\n  ── Certificate Details ──');
    if (!parsed.cert64) {
        console.log('    ❌ No certificate found!');
        return null;
    }
    
    const certDer = Buffer.from(parsed.cert64, 'base64');
    const certInfo = extractPublicKeyFromCert(certDer);
    
    if (certInfo.x509) {
        console.log(`    Subject: ${certInfo.x509.subject}`);
        console.log(`    Issuer: ${certInfo.x509.issuer}`);
        console.log(`    Serial: ${certInfo.x509.serialNumber}`);
        console.log(`    Valid: ${certInfo.x509.validFrom} → ${certInfo.x509.validTo}`);
        console.log(`    Key type: ${certInfo.x509.publicKey.asymmetricKeyType}`);
        console.log(`    Key size: ${certInfo.x509.publicKey.asymmetricKeySize} bits`);
        console.log(`    Sig algorithm (cert self): ${certInfo.x509.sigAlgName || 'N/A'}`);
    }
    
    // 2. Content Analysis
    console.log('\n  ── Content (Signed Payload) ──');
    const contentBuf = parsed.contentBuf;
    console.log(`    Content length: ${contentBuf.length} bytes`);
    console.log(`    SHA-1:   ${sha1(contentBuf)}`);
    console.log(`    SHA-256: ${sha256(contentBuf)}`);
    
    const lineEndings = analyzeLineEndings(contentBuf, name);
    console.log(`    Line endings in content: CRLF=${lineEndings.crlfCount}, LF=${lineEndings.lfCount}, CR=${lineEndings.crCount}`);
    
    // Show last bytes of content to check for trailing newline
    const tail = contentBuf.slice(Math.max(0, contentBuf.length - 20));
    const tailHex = Array.from(tail).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
    const tailPrint = Array.from(tail).map(b => {
        if (b === 0x0D) return '\\r';
        if (b === 0x0A) return '\\n';
        if (b >= 0x20 && b <= 0x7E) return String.fromCharCode(b);
        return '.';
    }).join('');
    console.log(`    Last 20 bytes of content: ${tailHex}`);
    console.log(`    Last 20 printable:        ${tailPrint}`);
    
    // 3. Signature
    console.log('\n  ── Signature ──');
    if (!parsed.signature64) {
        console.log('    ❌ No signature found!');
        return { parsed, certInfo };
    }
    
    const sigBytes = Buffer.from(parsed.signature64, 'base64');
    console.log(`    Signature length: ${sigBytes.length} bytes (${sigBytes.length * 8} bits)`);
    console.log(`    Signature base64 length: ${parsed.signature64.length} chars`);
    
    // Check for any whitespace/newlines in the base64
    const trimmedSig = parsed.signature64.replace(/\s+/g, '');
    if (trimmedSig.length !== parsed.signature64.length) {
        console.log(`    ⚠️  Signature base64 contains whitespace! Trimmed: ${trimmedSig.length} chars`);
    }
    
    // 4. Signer Version
    console.log('\n  ── Signer Version ──');
    console.log(`    Version: "${parsed.signerVersion || '(none)'}"`);
    
    // 5. Signature Verification with different algorithms and content slices
    console.log('\n  ── Signature Verification ──');
    
    if (!certInfo.publicKey) {
        console.log('    ❌ Cannot verify: no public key extracted');
        return { parsed, certInfo };
    }
    
    // Try various combinations
    const algorithms = ['SHA1', 'SHA256', 'SHA384', 'SHA512'];
    
    // Different content candidates:
    const contentCandidates = {};
    
    // 1. Raw content buffer (everything before <START-SIGNATURE>)
    contentCandidates['raw_before_sig_tag'] = contentBuf;
    
    // 2. Content ending at TREC line (including TREC\x1D96\n)
    const trecIdx = parsed.str.indexOf('TREC');
    if (trecIdx >= 0) {
        // Find end of TREC line
        let trecLineEnd = parsed.str.indexOf('\n', trecIdx);
        if (trecLineEnd >= 0) {
            contentCandidates['up_to_TREC_incl_LF'] = buf.slice(0, trecLineEnd + 1);
            // Without trailing LF
            contentCandidates['up_to_TREC_no_LF'] = buf.slice(0, trecLineEnd);
            // Check if CR before LF
            if (trecLineEnd > 0 && buf[trecLineEnd - 1] === 0x0D) {
                contentCandidates['up_to_TREC_no_CRLF'] = buf.slice(0, trecLineEnd - 1);
            }
        }
    }
    
    // 3. Content up to and including <END-SB>
    const endSbIdx = parsed.str.indexOf('<END-SB>');
    if (endSbIdx >= 0) {
        // Find end of <END-SB> line
        let endSbLineEnd = parsed.str.indexOf('\n', endSbIdx);
        if (endSbLineEnd >= 0) {
            contentCandidates['up_to_END-SB_incl_LF'] = buf.slice(0, endSbLineEnd + 1);
            contentCandidates['up_to_END-SB_no_LF'] = buf.slice(0, endSbLineEnd);
            if (endSbLineEnd > 0 && buf[endSbLineEnd - 1] === 0x0D) {
                contentCandidates['up_to_END-SB_no_CRLF'] = buf.slice(0, endSbLineEnd - 1);
            }
        }
        contentCandidates['up_to_END-SB_tag_end'] = buf.slice(0, endSbIdx + '<END-SB>'.length);
    }
    
    // 4. Try stripping all CRLF -> LF
    contentCandidates['raw_LF_only'] = Buffer.from(contentBuf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    
    // 5. Try stripping all LF -> CRLF
    contentCandidates['raw_CRLF_only'] = Buffer.from(contentBuf.toString('latin1').replace(/(?<!\r)\n/g, '\r\n'), 'latin1');
    
    // 6. Try just the content with consistent CRLF
    const allCRLF = Buffer.from(contentBuf.toString('latin1').replace(/\r?\n/g, '\r\n'), 'latin1');
    contentCandidates['all_CRLF'] = allCRLF;
    
    // 7. Try UTF-8 content
    contentCandidates['raw_utf8'] = Buffer.from(contentBuf.toString('utf8'));

    let foundMatch = false;
    
    for (const algo of algorithms) {
        for (const [candidateName, candidateBuf] of Object.entries(contentCandidates)) {
            const result = verifySignature(candidateBuf, sigBytes, certInfo.publicKey, algo);
            if (result === true) {
                console.log(`    ✅ VERIFIED! Algorithm: ${algo}, Content: ${candidateName} (${candidateBuf.length} bytes)`);
                foundMatch = true;
            } else if (typeof result === 'object' && result.error) {
                // Only log errors for the primary candidate
                if (candidateName === 'raw_before_sig_tag') {
                    // console.log(`    ❌ ${algo} + ${candidateName}: ${result.error}`);
                }
            }
        }
    }
    
    if (!foundMatch) {
        console.log('    ❌ NO VALID COMBINATION FOUND!');
        console.log('    Tried algorithms: ' + algorithms.join(', '));
        console.log('    Tried content candidates: ' + Object.keys(contentCandidates).join(', '));
        
        // Try raw RSA decrypt to see what digest was actually signed
        console.log('\n  ── Raw RSA Decrypt (DigestInfo analysis) ──');
        try {
            const decrypted = crypto.publicDecrypt(
                {
                    key: certInfo.publicKey,
                    padding: crypto.constants.RSA_PKCS1_PADDING,
                },
                sigBytes
            );
            console.log(`    Decrypted DigestInfo: ${decrypted.toString('hex')}`);
            console.log(`    Decrypted length: ${decrypted.length} bytes`);
            
            // Parse DigestInfo ASN.1
            // DigestInfo ::= SEQUENCE { AlgorithmIdentifier, OCTET STRING }
            // SHA-1 OID: 06 05 2b0e03021a (1.3.14.3.2.26)
            // SHA-256 OID: 06 09 608648016503040201 (2.16.840.1.101.3.4.2.1)
            const hex = decrypted.toString('hex');
            
            if (hex.includes('2b0e03021a')) {
                console.log('    Digest Algorithm in DigestInfo: SHA-1');
                // Extract the digest (last 20 bytes for SHA-1)
                const digestHex = hex.slice(-40);
                console.log(`    Embedded digest: ${digestHex}`);
                
                // Check against our content hashes
                for (const [candidateName, candidateBuf] of Object.entries(contentCandidates)) {
                    const candidateSha1 = sha1(candidateBuf);
                    if (candidateSha1 === digestHex) {
                        console.log(`    ✅ DIGEST MATCHES: SHA-1 of "${candidateName}" (${candidateBuf.length} bytes)`);
                        foundMatch = true;
                    }
                }
            }
            
            if (hex.includes('608648016503040201')) {
                console.log('    Digest Algorithm in DigestInfo: SHA-256');
                const digestHex = hex.slice(-64);
                console.log(`    Embedded digest: ${digestHex}`);
                
                for (const [candidateName, candidateBuf] of Object.entries(contentCandidates)) {
                    const candidateSha256 = sha256(candidateBuf);
                    if (candidateSha256 === digestHex) {
                        console.log(`    ✅ DIGEST MATCHES: SHA-256 of "${candidateName}" (${candidateBuf.length} bytes)`);
                        foundMatch = true;
                    }
                }
            }
            
            if (!foundMatch) {
                console.log('    ❌ Could not match embedded digest to any content candidate');
                
                // Print SHA-1 and SHA-256 of all candidates for manual comparison
                console.log('\n    Candidate digests:');
                for (const [candidateName, candidateBuf] of Object.entries(contentCandidates)) {
                    console.log(`      ${candidateName}: SHA1=${sha1(candidateBuf)} SHA256=${sha256(candidateBuf)}`);
                }
            }
        } catch (e) {
            console.log(`    Raw decrypt failed: ${e.message}`);
            
            // Try NO_PADDING
            try {
                const decryptedRaw = crypto.publicDecrypt(
                    {
                        key: certInfo.publicKey,
                        padding: crypto.constants.RSA_NO_PADDING,
                    },
                    sigBytes
                );
                console.log(`    Raw (no padding) decrypted: ${decryptedRaw.toString('hex')}`);
                
                // PKCS#1 v1.5: should be 00 01 FF...FF 00 <DigestInfo>
                const rawHex = decryptedRaw.toString('hex');
                if (rawHex.startsWith('0001')) {
                    console.log('    ✅ PKCS#1 v1.5 padding detected');
                    // Find the 00 separator after FF padding
                    const ffEnd = rawHex.indexOf('00', 4 + rawHex.substring(4).search(/[^f]/i));
                    if (ffEnd >= 0) {
                        const digestInfoHex = rawHex.substring(ffEnd + 2);
                        console.log(`    DigestInfo: ${digestInfoHex}`);
                        
                        if (digestInfoHex.includes('2b0e03021a')) {
                            console.log('    Algorithm: SHA-1');
                            const digestHex = digestInfoHex.slice(-40);
                            console.log(`    Digest: ${digestHex}`);
                            
                            for (const [candidateName, candidateBuf] of Object.entries(contentCandidates)) {
                                if (sha1(candidateBuf) === digestHex) {
                                    console.log(`    ✅ MATCHES: ${candidateName}`);
                                }
                            }
                        }
                        if (digestInfoHex.includes('608648016503040201')) {
                            console.log('    Algorithm: SHA-256');
                            const digestHex = digestInfoHex.slice(-64);
                            console.log(`    Digest: ${digestHex}`);
                            
                            for (const [candidateName, candidateBuf] of Object.entries(contentCandidates)) {
                                if (sha256(candidateBuf) === digestHex) {
                                    console.log(`    ✅ MATCHES: ${candidateName}`);
                                }
                            }
                        }
                    }
                }
            } catch (e2) {
                console.log(`    Raw (no-padding) decrypt also failed: ${e2.message}`);
            }
        }
    }
    
    // 6. Line ending analysis of the signed region
    console.log('\n  ── Line Ending Difference (Content vs Full File) ──');
    const fullLE = analyzeLineEndings(buf, 'full');
    const contentLE = analyzeLineEndings(contentBuf, 'content');
    console.log(`    Content: CRLF=${contentLE.crlfCount}, LF-only=${contentLE.lfCount}`);
    console.log(`    Full:    CRLF=${fullLE.crlfCount}, LF-only=${fullLE.lfCount}`);
    
    // Line-by-line ending analysis
    const lines = contentBuf.toString('latin1').split(/\n/);
    let crlf_lines = 0, lf_lines = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].endsWith('\r')) {
            crlf_lines++;
        } else if (i < lines.length - 1) { // Not last line
            lf_lines++;
        }
    }
    console.log(`    Lines ending CRLF: ${crlf_lines}`);
    console.log(`    Lines ending LF-only: ${lf_lines}`);
    
    // Show which specific lines are LF-only vs CRLF
    console.log('\n  ── Per-Line Ending Detail ──');
    let pos = 0;
    const rawStr = contentBuf.toString('latin1');
    let lineNum = 0;
    while (pos < rawStr.length) {
        lineNum++;
        let nextLF = rawStr.indexOf('\n', pos);
        if (nextLF < 0) {
            // No more newlines
            const lastLine = rawStr.substring(pos);
            console.log(`    Line ${lineNum}: no trailing newline, ${lastLine.length} chars — "${lastLine.substring(0, 50)}..."`);
            break;
        }
        const hasCR = nextLF > 0 && rawStr[nextLF - 1] === '\r';
        const lineContent = rawStr.substring(pos, hasCR ? nextLF - 1 : nextLF);
        const ending = hasCR ? 'CRLF' : 'LF';
        const preview = lineContent.substring(0, 50).replace(/\x1D/g, '⌁');
        console.log(`    Line ${lineNum}: ${ending}  "${preview}${lineContent.length > 50 ? '...' : ''}"`);
        pos = nextLF + 1;
    }
    
    return { parsed, certInfo };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('Usage: node verify-sb-signatures.js <file1.sb> [file2.sb]');
        process.exit(1);
    }
    
    const results = [];
    for (const filePath of args) {
        results.push(analyzeFile(filePath));
    }
    
    if (args.length === 2) {
        console.log(`\n${'═'.repeat(80)}`);
        console.log('  CROSS-FILE COMPARISON SUMMARY');
        console.log(`${'═'.repeat(80)}`);
        
        const [r1, r2] = results;
        if (r1 && r2) {
            const name1 = path.basename(args[0]);
            const name2 = path.basename(args[1]);
            
            // Check if same certificate
            const sameCert = r1.parsed.cert64 === r2.parsed.cert64;
            console.log(`\n  Same certificate: ${sameCert ? '✅ YES' : '❌ NO'}`);
            
            // Check signer version
            console.log(`  ${name1} signer: "${r1.parsed.signerVersion}"`);
            console.log(`  ${name2} signer: "${r2.parsed.signerVersion}"`);
            
            // Content comparison
            const sameContent = r1.parsed.contentBuf.equals(r2.parsed.contentBuf);
            console.log(`  Same content: ${sameContent ? '✅ YES' : '❌ NO'}`);
            
            if (!sameContent) {
                console.log(`  Content diff: ${name1}=${r1.parsed.contentBuf.length} bytes, ${name2}=${r2.parsed.contentBuf.length} bytes`);
            }
        }
    }
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log('  ANALYSIS COMPLETE');
    console.log(`${'═'.repeat(80)}`);
}

main();
