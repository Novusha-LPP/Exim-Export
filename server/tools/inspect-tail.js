import fs from 'fs';
const buf = fs.readFileSync('server/tools/28602026-signed.sb');
const last = buf.slice(-2000);
console.log(last.toString('latin1'));
console.log('--- HEX ---');
console.log(last.slice(-100).toString('hex').match(/../g).join(' '));
