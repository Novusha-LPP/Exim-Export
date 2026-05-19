const fs = require('fs');
const a = fs.readFileSync('1072026Signed.sb', 'binary').split('<START-SIGNATURE>')[0];
const b = fs.readFileSync('GIM_EXP_SEA_00107_26-27_3315740.sb', 'binary').split('<START-SIGNATURE>')[0];

const aLines = a.split('\n');
const bLines = b.split('\n');

console.log('Length A:', aLines.length);
console.log('Length B:', bLines.length);

for(let i = 0; i < Math.max(aLines.length, bLines.length); i++) {
    const la = aLines[i] || '';
    const lb = bLines[i] || '';
    if(la !== lb) {
        console.log(`Line ${i+1} differs!`);
        console.log(`A: ${JSON.stringify(la)}`);
        console.log(`B: ${JSON.stringify(lb)}`);
    }
}
