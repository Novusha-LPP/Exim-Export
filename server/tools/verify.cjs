const crypto = require('crypto');
const fs = require('fs');

const fileBytes = fs.readFileSync('1072026Signed.sb');
const content = fileBytes.toString('binary');

const sigStart = content.indexOf('<START-SIGNATURE>');
const sigEnd = content.indexOf('</START-SIGNATURE>');
const certStart = content.indexOf('<START-CERTIFICATE>');
const certEnd = content.indexOf('</START-CERTIFICATE>');

const b64Sig = content.substring(sigStart + 17, sigEnd);
const b64Cert = content.substring(certStart + 19, certEnd);

const pemCert = '-----BEGIN CERTIFICATE-----\n' + b64Cert.match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';

const rawPayload = fileBytes.slice(0, sigStart);
console.log('Payload length:', rawPayload.length);

const sigBytes = Buffer.from(b64Sig, 'base64');

function verify(payload, algo = 'SHA256') {
    const verify = crypto.createVerify(algo);
    verify.update(payload);
    return verify.verify(pemCert, sigBytes);
}

for (const algo of ['SHA256', 'SHA1', 'MD5', 'RSA-SHA256', 'RSA-SHA1']) {
    console.log(`\nTesting with ${algo}:`);
    console.log('Test 1 (Exact bytes from file):', verify(rawPayload, algo));
    console.log('Test 2 (Stripped trailing \\n):', verify(p2, algo));
    console.log('Test 3 (With \\r\\n at end):', verify(p3, algo));
}
