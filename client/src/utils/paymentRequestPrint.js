import jsPDF from 'jspdf';
import 'jspdf-autotable';

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'overflow';
    const nArr = (`000000000${n}`).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!nArr) return '';
    let str = '';
    str += Number(nArr[1]) !== 0 ? (a[Number(nArr[1])] || `${b[nArr[1][0]]} ${a[nArr[1][1]]}`) + 'Crore ' : '';
    str += Number(nArr[2]) !== 0 ? (a[Number(nArr[2])] || `${b[nArr[2][0]]} ${a[nArr[2][1]]}`) + 'Lakh ' : '';
    str += Number(nArr[3]) !== 0 ? (a[Number(nArr[3])] || `${b[nArr[3][0]]} ${a[nArr[3][1]]}`) + 'Thousand ' : '';
    str += Number(nArr[4]) !== 0 ? (a[Number(nArr[4])] || `${b[nArr[4][0]]} ${a[nArr[4][1]]}`) + 'Hundred ' : '';
    str += Number(nArr[5]) !== 0 ? (a[Number(nArr[5])] || `${b[nArr[5][0]]} ${a[nArr[5][1]]}`) + 'Rupees ' : '';
    return str;
  };

  const parts = String(num || 0).split('.');
  let words = inWords(parts[0]);
  if (parts.length > 1 && Number(parts[1]) > 0) {
    words += `and ${(a[Number(parts[1])] || `${b[parts[1][0]]} ${a[parts[1][1]]}`)}Paise `;
  }
  return `${words}Only`;
};

const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const generatePaymentRequestPDF = (data, logoUrl) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  const buildPdf = (logoImgBase64 = null) => {
    let currentY = 10;

    // Outer Header Box
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.rect(margin, currentY, contentWidth, 25);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAJ FORWARDERS PVT LTD', margin + 2, currentY + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('A/204-205, WALL STREET II, OPP. ORIENT CLUB,', margin + 2, currentY + 10);
    doc.text('NR. GUJARAT COLLEGE, ELLIS BRIDGE,', margin + 2, currentY + 14);
    doc.text('AHMEDABAD - 380006, GUJARAT', margin + 2, currentY + 18);

    if (logoImgBase64) {
      const logoWidth = 35;
      const logoHeight = 20;
      const logoX = margin + contentWidth - logoWidth - 2;
      const logoY = currentY + 2.5;
      doc.setFillColor(255, 255, 255);
      doc.rect(logoX, logoY, logoWidth, logoHeight, 'F');
      doc.addImage(logoImgBase64, 'JPEG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    }

    currentY += 25;

    // Title Box
    doc.rect(margin, currentY, contentWidth, 8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Payment Advice', pageWidth / 2, currentY + 5.5, { align: 'center' });
    currentY += 8;

    // To and Payment Detail Box
    const detailHeight = 45;
    doc.rect(margin, currentY, contentWidth, detailHeight);
    doc.line(margin + contentWidth / 2, currentY, margin + contentWidth / 2, currentY + detailHeight);

    // Left Side: To section
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('To,', margin + 2, currentY + 5);
    const recipientName = data.paymentTo || 'N/A';
    doc.text(recipientName, margin + 2, currentY + 10);
    doc.setFont('helvetica', 'normal');
    const supplierAddr = data.address || '-';
    const splitAddr = doc.splitTextToSize(supplierAddr, (contentWidth / 2) - 5);
    doc.text(splitAddr, margin + 2, currentY + 15);

    // Right Side: Payment Detail
    const rx = margin + (contentWidth / 2) + 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Detail', rx, currentY + 5);
    doc.setFont('helvetica', 'normal');

    const netAmount = Number(data.amount || 0);
    const tdsAmount = Number(data.tdsAmount || 0);
    const grossAmount = data.grossAmount ? Number(data.grossAmount) : (netAmount + tdsAmount);

    const drawDetailRow = (label, value, y) => {
      doc.text(label, rx, y);
      doc.text(`: ${String(value || '-').substring(0, 45)}`, rx + 25, y);
    };

    drawDetailRow('Voucher No.', data.requestNo, currentY + 10);
    drawDetailRow('Date', formatDate(data.requestDate), currentY + 15);
    drawDetailRow('Mode', data.transactionType || 'Bank Payment', currentY + 20);
    drawDetailRow('RTGS No.', data.instrumentNo || '-', currentY + 25);
    drawDetailRow('Ref Date', formatDate(data.requestDate), currentY + 30);
    
    doc.setFont('helvetica', 'bold');
    drawDetailRow('Gross Payment', `INR ${grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, currentY + 35);
    doc.setFont('helvetica', 'normal');
    drawDetailRow('Less TDS.', tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), currentY + 40);
    doc.setFont('helvetica', 'bold');
    drawDetailRow('Net Payment.', `INR ${netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} CR`, currentY + 45);

    currentY += detailHeight + 5;

    // Dear Sir/Madam section
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Dear Sir/Madam', margin, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('We are hereby making payment of the following bills as per the details mentioned herein', margin, currentY);
    currentY += 5;

    // Table
    doc.autoTable({
      startY: currentY,
      head: [['Sr', 'Invoice No', 'Date', 'Amount (INR)', 'Balance Amt (INR)', 'Gross Amt Paid', 'TDS Category and Rate', 'TDS (INR)', 'Net Amt Paid (INR)']],
      body: [[
        '1',
        data.againstBill || '-',
        formatDate(data.requestDate),
        grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        data.tdsCategory || 'U/S N/A 0.00 %',
        tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        `${netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} DR`
      ]],
      foot: [[
        '',
        'Total',
        '',
        grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        '',
        tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        `${netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} DR`
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', textColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 18 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { cellWidth: 30 },
        7: { halign: 'right' },
        8: { halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = doc.lastAutoTable.finalY;
    
    // In Words Box
    doc.rect(margin, currentY, contentWidth, 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`In Words INR ${numberToWords(netAmount)}`, margin + 2, currentY + 5.5);

    currentY += 13;
    
    // Signatory Box
    doc.rect(margin, currentY, contentWidth, 20);
    doc.text('For SURAJ FORWARDERS PVT LTD', margin + 2, currentY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorised Signatory', margin + 2, currentY + 17);

    const identifier = data.requestNo || 'N-A';
    doc.save(`PaymentRequest_${recipientName.replace(/\s+/g, '_')}_${identifier.replace(/\//g, '-')}.pdf`);
  };

  if (logoUrl) {
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      buildPdf(canvas.toDataURL('image/jpeg', 1.0));
    };
    img.onerror = () => buildPdf(null);
  } else {
    buildPdf(null);
  }
};
