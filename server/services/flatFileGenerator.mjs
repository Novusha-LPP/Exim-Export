/**
 * ICEGATE Modern Table-based Flat File Generator for Shipping Bills
 * Generates ICES 1.5 compliant flat files with <TABLE> structure
 */

/**
 * Generate ICEGATE-compliant Shipping Bill flat file (Table Format)
 * @param {Object} job - The export job document
 * @returns {String} - The complete flat file content
 */
export function generateShippingBillFlatFile(job) {
  const delimiter = "\x02"; // ASCII 0x02 is the standard delimiter for Table format
  const now = new Date();
  
  // Format date as YYYYMMDD
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  // Format time as HHMM
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  
  const senderId = job.custom_house || "INCUR6";
  const receiverId = "ICES1_5";
  const messageId = "SB"; // Table format often uses SB as message ID
  const sequenceNo = job.sb_no || "0000001";

  // HREC Header
  const header = [
    "HREC",
    senderId,
    receiverId,
    "ICES1_5",
    "P",
    "CACHE01", // Typical message ID for table format
    sequenceNo,
    dateStr,
    timeStr
  ].join(delimiter);

  const lines = [header];

  // 1. SB TABLE
  lines.push("<TABLE>SB");
  const sbLine = [
    "F",
    senderId,
    sequenceNo + dateStr,
    (job.job_no || "JOB").substring(0, 16),
    (job.ieCode || "0000000000").padStart(10, "0"),
    (job.exporter || "EXPORTER NAME").substring(0, 50),
    (job.exporter_address || "ADDRESS").substring(0, 35),
    (job.exporter_state || "CITY").substring(0, 35),
    (job.exporter_pincode || "000000").substring(0, 6),
    (job.cha_code || "CHA0001").substring(0, 15)
  ].join(delimiter);
  lines.push(sbLine);

  // 2. INVOICE TABLE
  if (job.invoices && job.invoices.length > 0) {
    lines.push("<TABLE>INVOICE");
    job.invoices.forEach((inv) => {
      const invLine = [
        "F",
        senderId,
        sequenceNo + dateStr,
        (inv.invoice_number || "INV01").substring(0, 16),
        (inv.invoice_date || dateStr).replace(/-/g, ""),
        inv.currency || "USD",
        inv.total_invoice_value || "0"
      ].join(delimiter);
      lines.push(invLine);
    });
  }

  // 3. ITEM TABLE (Products)
  if (job.invoices && job.invoices.some(inv => inv.products && inv.products.length > 0)) {
    lines.push("<TABLE>ITEM");
    job.invoices.forEach((inv) => {
      if (inv.products) {
        inv.products.forEach((prod) => {
          const itemLine = [
            "F",
            senderId,
            sequenceNo + dateStr,
            (inv.invoice_number || "INV01").substring(0, 16),
            (prod.ritc || "00000000").substring(0, 8),
            (prod.description || "PRODUCT").substring(0, 50),
            prod.quantity || "0",
            prod.qtyUnit || "NOS",
            prod.amount || "0"
          ].join(delimiter);
          lines.push(itemLine);
        });
      }
    });
  }

  // 4. CONTAINER TABLE (Mock if empty)
  lines.push("<TABLE>CONTAINER");
  const contLine = [
    "F",
    senderId,
    sequenceNo + dateStr,
    (job.container_no || "CONT0000001").substring(0, 11),
    "20", // Default size
    "FCL"
  ].join(delimiter);
  lines.push(contLine);

  return lines.join("\n") + "\n";
}

/**
 * Generate flat file and return file name
 */
export function generateFlatFileWithName(job) {
  const content = generateShippingBillFlatFile(job);
  const fileName = `${job.job_no || "SB"}_${Date.now()}.sb`;
  return { fileName, content };
}

export default {
  generateShippingBillFlatFile,
  generateFlatFileWithName
};
