import fs from 'fs';
const buf = fs.readFileSync('server/tools/28602026-signed.sb');
const content = buf.toString('latin1');
const sigStart = content.indexOf('<START-SIGNATURE>');
const sigEnd = content.indexOf('</START-SIGNATURE>', sigStart);
if (sigStart !== -1 && sigEnd !== -1) {
    const block = buf.slice(sigStart, sigEnd + '</START-SIGNATURE>'.length + 2);
    console.log('Block:', block.toString('latin1'));
    console.log('Hex:', block.toString('hex').match(/../g).join(' '));
}
