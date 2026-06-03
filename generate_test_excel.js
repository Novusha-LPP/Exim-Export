const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Mock imageToBase64
async function imageToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  return `data:image/${ext};base64,${fileBuffer.toString('base64')}`;
}

async function run() {
  const concorLogo = 'c:\\Users\\india\\Desktop\\projects\\Exim-Export\\client\\src\\assets\\images\\concor.png';
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("CONCOR Note");

  worksheet.columns = [
    { width: 5 },   // A
    { width: 18 },  // B
    { width: 10 },  // C
    { width: 8 },   // D
    { width: 12 },  // E
    { width: 12 },  // F
    { width: 35 },  // G
    { width: 14 },  // H
    { width: 12 },  // I
    { width: 12 },  // J
    { width: 12 },  // K
    { width: 14 },  // L
    { width: 14 },  // M
    { width: 16 }   // N
  ];

  for (let r = 1; r <= 100; r++) {
    worksheet.getRow(r).height = 20;
  }

  // Add logo images
  const base64Logo = await imageToBase64(concorLogo);
  if (base64Logo && base64Logo.startsWith("data:image")) {
    const base64Data = base64Logo.split(",")[1];
    const extension = base64Logo.match(/image\/(\w+)/)?.[1] || "png";
    const imageId1 = workbook.addImage({ base64: base64Data, extension });
    const imageId2 = workbook.addImage({ base64: base64Data, extension });
    
    worksheet.addImage(imageId1, {
      tl: { col: 0.3, row: 0.3 },
      ext: { width: 50, height: 50 },
      editAs: 'oneCell'
    });
    worksheet.addImage(imageId2, {
      tl: { col: 12.3, row: 0.3 },
      ext: { width: 50, height: 50 },
      editAs: 'oneCell'
    });
  }

  worksheet.mergeCells("A1:B3"); // Left logo placeholder
  worksheet.mergeCells("M1:N3"); // Right logo placeholder

  const outPath = 'test_concor.xlsx';
  await workbook.xlsx.writeFile(outPath);
  console.log('Generated test_concor.xlsx successfully!');
}

run().catch(console.error);
