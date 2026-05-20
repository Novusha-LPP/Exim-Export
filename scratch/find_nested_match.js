import fs from 'fs';
import crypto from 'crypto';

function checkFile(fileName) {
    const fPath = `server/tools/${fileName}`;
    if (!fs.existsSync(fPath)) return;
    const fBuf = fs.readFileSync(fPath);
    const fStr = fBuf.toString('latin1');
    const fSigStart = fStr.indexOf('<START-SIGNATURE>');
    if (fSigStart < 0) return;
    
    const fSigEnd = fStr.indexOf('</START-SIGNATURE>');
    const fSigBase64 = fStr.substring(fSigStart + 17, fSigEnd);
    const fSig = Buffer.from(fSigBase64, 'base64');
    
    try {
        const certStart = fStr.indexOf('<START-CERTIFICATE>') + 19;
        const certEnd = fStr.indexOf('</START-CERTIFICATE>');
        const certB64 = fStr.substring(certStart, certEnd);
        const certPem = `-----BEGIN CERTIFICATE-----\n${certB64.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
        const pubKey = crypto.createPublicKey(certPem);
        
        const dec = crypto.publicDecrypt({
            key: pubKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, fSig);
        
        const embDig = dec.slice(-20).toString('hex');
        const algHex = dec.toString('hex');
        const isSHA1 = algHex.includes('2b0e03021a');
        
        console.log(`\nFile: ${fileName}`);
        console.log(`  Embedded Digest: ${embDig}`);
        
        const fRawContent = fBuf.slice(0, fSigStart);
        const fRawContentStr = fRawContent.toString('latin1');
        
        // Let's test standard stripTrailing() no trailing newline with nested hash
        const fStripped = fRawContentStr.replace(/\s+$/, '');
        const nestedSHA256 = crypto.createHash('sha256').update(Buffer.from(fStripped, 'latin1')).digest();
        const nestedHash = crypto.createHash('sha1').update(nestedSHA256).digest('hex');
        
        console.log(`  Nested Hash (stripped no newline): ${nestedHash} (${nestedHash === embDig ? '🎉 MATCH!' : '❌ no'})`);
        
        // Also test stripTrailing() + '\n' with nested hash
        const fStrippedLF = fStripped + '\n';
        const nestedSHA256_LF = crypto.createHash('sha256').update(Buffer.from(fStrippedLF, 'latin1')).digest();
        const nestedHash_LF = crypto.createHash('sha1').update(nestedSHA256_LF).digest('hex');
        console.log(`  Nested Hash (stripped + LF):      ${nestedHash_LF} (${nestedHash_LF === embDig ? '🎉 MATCH!' : '❌ no'})`);
        
    } catch(e) {
        console.log(`  Error parsing/decrypting ${fileName}: ${e.message}`);
    }
}

const files = fs.readdirSync('server/tools').filter(f => f.endsWith('.sb'));
for (const f of files) {
    checkFile(f);
}

