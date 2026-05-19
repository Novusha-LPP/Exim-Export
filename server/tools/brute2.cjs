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

function verify(payload, algo) {
    try {
        const verify = crypto.createVerify(algo);
        verify.update(payload);
        return verify.verify(pemCert, sigBytes);
    } catch(e) { return false; }
}

const variations = [];
variations.push({name: 'Exact', buf: rawPayload});
variations.push({name: 'Strip \\n', buf: rawPayload.slice(0, -1)});
if(rawPayload[rawPayload.length-2] === 13) {
    variations.push({name: 'Strip \\r\\n', buf: rawPayload.slice(0, -2)});
}
const strLf = content.substring(0, sigStart).replace(/\r\n/g, '\n');
variations.push({name: 'CRLF -> LF', buf: Buffer.from(strLf, 'binary')});
const strCrlf = strLf.replace(/\n/g, '\r\n');
variations.push({name: 'LF -> CRLF', buf: Buffer.from(strCrlf, 'binary')});
variations.push({name: 'LF -> CRLF (strip end)', buf: Buffer.from(strCrlf.replace(/\r\n$/, ''), 'binary')});
variations.push({name: 'CRLF -> LF (strip end)', buf: Buffer.from(strLf.replace(/\n$/, ''), 'binary')});

const algos = ['SHA256', 'SHA1', 'MD5', 'RSA-SHA256', 'RSA-SHA1'];

for(let v of variations) {
    for(let algo of algos) {
        if(verify(v.buf, algo)) {
            console.log('SUCCESS! Algo: ' + algo + ', Variation: ' + v.name);
            process.exit(0);
        }
    }
}
console.log('NONE WORKED');
