import fs from 'fs';

const FS = '\x1D';

function parse(file) {
    const content = fs.readFileSync(file, 'latin1');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    return lines.map(l => l.split(FS));
}

const mine = parse('server/tools/AMD_EXP_SEA_00286_26-27_SB.sb');
const soft = parse('server/tools/28602026-signed.sb');

console.log('--- HREC Comparison ---');
console.log('Mine:', mine[0]);
console.log('Soft:', soft[0]);

console.log('\n--- SB Table Comparison ---');
console.log('Mine:', mine[2]);
console.log('Soft:', soft[2]);

console.log('\n--- INVOICE Table Comparison ---');
console.log('Mine:', mine[4]);
console.log('Soft:', soft[4]);
