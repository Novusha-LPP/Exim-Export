const crypto = require('crypto');
const fs = require('fs');

const fileBytes = fs.readFileSync('1072026Signed.sb');
const content = fileBytes.toString('binary');
const sigStart = content.indexOf('<START-SIGNATURE>');
const b64Sig = content.substring(sigStart + 17, content.indexOf('</START-SIGNATURE>'));
const b64Cert = content.substring(content.indexOf('<START-CERTIFICATE>') + 19, content.indexOf('</START-CERTIFICATE>'));
const pemCert = '-----BEGIN CERTIFICATE-----\n' + b64Cert.match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';
const rawPayload = fileBytes.slice(0, sigStart);
const sigBytes = Buffer.from(b64Sig, 'base64');

function verify(payload) {
    try {
        const verify = crypto.createVerify('SHA256');
        verify.update(payload);
        return verify.verify(pemCert, sigBytes);
    } catch(e) { return false; }
}

const p2 = rawPayload.slice(0, rawPayload.length - 1);
const p3 = Buffer.concat([p2, Buffer.from('\r\n')]);

// Test 4: All \n to \r\n
const s1 = rawPayload.toString('binary').replace(/\r?\n/g, '\r\n');
const p4 = Buffer.from(s1, 'binary');

// Test 5: All \r\n to \n
const s2 = rawPayload.toString('binary').replace(/\r\n/g, '\n');
const p5 = Buffer.from(s2, 'binary');

// Test 6: include <START-SIGNATURE>
const p6 = fileBytes.slice(0, sigStart + 17);

console.log('Test 1 (Exact):', verify(rawPayload));
console.log('Test 2 (Strip last \\n):', verify(p2));
console.log('Test 3 (With \\r\\n at end):', verify(p3));
console.log('Test 4 (All to CRLF):', verify(p4));
console.log('Test 5 (All to LF):', verify(p5));
console.log('Test 6 (With <START-SIGNATURE>):', verify(p6));

// Try without trailing space/newlines
const s7 = rawPayload.toString('binary').trimEnd();
console.log('Test 7 (trimEnd):', verify(Buffer.from(s7, 'binary')));
console.log('Test 8 (trimEnd + \\n):', verify(Buffer.from(s7 + '\n', 'binary')));
console.log('Test 9 (trimEnd + \\r\\n):', verify(Buffer.from(s7 + '\r\n', 'binary')));

