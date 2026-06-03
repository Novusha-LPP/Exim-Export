const fs = require('fs');
const path = require('path');

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG IHDR chunk starts at byte 12, height and width are 4 bytes each starting at byte 16
  const width = buffer.readInt32BE(16);
  const height = buffer.readInt32BE(20);
  return { width, height };
}

function getJpegDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  let i = 4;
  while (i < buffer.length) {
    const marker = buffer.readUInt16BE(i);
    const length = buffer.readUInt16BE(i + 2);
    if (marker === 0xFFC0 || marker === 0xFFC2) {
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + length;
  }
  return null;
}

const assetsDir = 'c:\\Users\\india\\Desktop\\projects\\Exim-Export\\client\\src\\assets\\images';
const concorPng = path.join(assetsDir, 'concor.png');
const concorLogoPng = path.join(assetsDir, 'concor-logo.png');
const thatLogoPng = path.join(assetsDir, 'that-logo.png');

console.log('concor.png:', getPngDimensions(concorPng));
console.log('concor-logo.png:', getPngDimensions(concorLogoPng));
console.log('that-logo.png:', getPngDimensions(thatLogoPng));
