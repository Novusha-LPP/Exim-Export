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

const variations = [];

// 1. Exact
variations.push({name: 'Exact', buf: rawPayload});

// 2. Strip trailing \n
variations.push({name: 'Strip \\n', buf: rawPayload.slice(0, -1)});

// 3. Strip trailing \r\n
if(rawPayload[rawPayload.length-2] === 13) {
    variations.push({name: 'Strip \\r\\n', buf: rawPayload.slice(0, -2)});
}

// 4. CRLF -> LF
const strLf = content.substring(0, sigStart).replace(/\r\n/g, '\n');
variations.push({name: 'CRLF -> LF', buf: Buffer.from(strLf, 'binary')});

// 5. LF -> CRLF
const strCrlf = strLf.replace(/\n/g, '\r\n');
variations.push({name: 'LF -> CRLF', buf: Buffer.from(strCrlf, 'binary')});

// 6. LF -> CRLF but stripped last \r\n
variations.push({name: 'LF -> CRLF (strip end)', buf: Buffer.from(strCrlf.replace(/\r\n$/, ''), 'binary')});

// 7. CRLF -> LF but stripped last \n
variations.push({name: 'CRLF -> LF (strip end)', buf: Buffer.from(strLf.replace(/\n$/, ''), 'binary')});

// 8. No newlines at all?
variations.push({name: 'No newlines', buf: Buffer.from(content.substring(0, sigStart).replace(/\r?\n/g, ''), 'binary')});

for(let v of variations) {
    if(verify(v.buf)) {
        console.log('SUCCESS: ' + v.name);
        process.exit(0);
    }
}
console.log('NONE WORKED');
