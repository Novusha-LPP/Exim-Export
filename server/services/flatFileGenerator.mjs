/**
 * ICEGATE Flat File Generator for Shipping Bills (CHCOE01)
 * Generates ICES 1.5 compliant flat files with HREC header and TREC footer
 */

/**
 * Generate ICEGATE-compliant Shipping Bill flat file
 * @param {Object} job - The export job document
 * @returns {String} - The complete flat file content
 */
export function generateShippingBillFlatFile(job) {
  const delimiter = "^]"; // ICEGATE uses ^] as delimiter
  const now = new Date();
  
  // Format date as YYYYMMDD
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  // Format time as HHMM
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  
  // Extract required fields with defaults
  const senderId = job.custom_house || "INCUR6"; // Customs House Code
  const receiverId = job.custom_house || "INCUR6"; // ICD Custodian
  const messageId = "CHCOE01"; // Shipping Bill Details
  const sequenceNo = job.sb_no || job.jobNumber || "000001";
  const version = "ICES1_5";
  const testOrProd = "P"; // P for Production, T for Test
  
  // HREC Header
  const header = [
    "HREC",
    "ZZ",
    senderId,
    "ZZ",
    receiverId,
    version,
    testOrProd,
    messageId,
    sequenceNo,
    dateStr,
    timeStr
  ].join(delimiter);
  
  // SB Body - Extract data from job
  const messageType = "F"; // F for Fresh SB
  const customsHouseCode = (job.custom_house || "INCUR6").substring(0, 6);
  const sbNumber = (job.sb_no || "0000000").padStart(7, "0");
  const sbDate = job.sb_date || dateStr;
  const iecCode = (job.ieCode || "0000000000").padStart(10, "0");
  const businessId = (job.gstin || "").substring(0, 15);
  const exporterName = (job.exporter || "EXPORTER").substring(0, 50);
  const exporterAddress = (job.exporter_address || "ADDRESS").substring(0, 35);
  const exporterAddress2 = (job.exporter_address || "").substring(35, 70) || "";
  const city = (job.exporter_state || "CITY").substring(0, 35);
  const pinCode = (job.exporter_pincode || "000000").substring(0, 6);
  const chaCode = (job.cha_code || "CHA0000000000000").substring(0, 15);
  const fobValue = job.invoices?.[0]?.total_invoice_value || "0";
  const portOfDestination = (job.destination_port || "USNYC").substring(0, 6);
  
  // Build SB record lines
  const sbLines = [];
  sbLines.push("<sb>");
  
  // Main SB line (F record)
  const sbMainLine = [
    messageType,             // 1. Message Type (F)
    customsHouseCode,        // 2. Customs House Code
    sbNumber,                // 3. Shipping Bill Number
    sbDate,                  // 4. Shipping Bill Date
    iecCode,                 // 5. IEC Code
    businessId,              // 6. Business Identification No.
    exporterName,            // 7. Exporter Name
    exporterAddress,         // 8. Exporter Address
    exporterAddress2,        // 9. Exporter Address Line 2
    city,                    // 10. City
    pinCode,                 // 11. Pin Code
    chaCode,                 // 12. CHA Code
    fobValue,                // 13. FOB Value (Rs)
    portOfDestination        // 14. Port of Destination
  ].join(delimiter);
  
  sbLines.push(sbMainLine);
  
  // Add invoice lines if available
  if (job.invoices && job.invoices.length > 0) {
    job.invoices.forEach((inv, idx) => {
      const invLine = [
        "I",                                    // Invoice record type
        (idx + 1).toString(),                   // Invoice Serial No
        inv.invoice_number || "",               // Invoice Number
        inv.invoice_date || "",                 // Invoice Date
        inv.currency || "USD",                  // Currency
        inv.total_invoice_value || "0"          // Invoice Value
      ].join(delimiter);
      sbLines.push(invLine);
      
      // Add product lines for this invoice
      if (inv.products && inv.products.length > 0) {
        inv.products.forEach((prod, pIdx) => {
          const prodLine = [
            "P",                                  // Product record type
            (idx + 1).toString(),                 // Invoice Serial No
            (pIdx + 1).toString(),                // Item Serial No
            prod.ritc || "",                      // RITC/HS Code
            prod.description || "",               // Description
            prod.quantity || "0",                 // Quantity
            prod.qtyUnit || "NOS",                // Unit
            prod.amount || "0"                    // FOB Value
          ].join(delimiter);
          sbLines.push(prodLine);
        });
      }
    });
  }
  
  sbLines.push("<END-sb>");
  
  // TREC Footer
  const footer = ["TREC", sequenceNo].join(delimiter);
  
  // Combine all parts
  return [header, ...sbLines, footer].join("\n");
}

/**
 * Generate flat file and return file name
 * @param {Object} job - The export job document  
 * @returns {Object} - { fileName, content }
 */
export function generateFlatFileWithName(job) {
  const content = generateShippingBillFlatFile(job);
  const fileName = `${job.job_no || job.jobNumber || "SB"}_${job.sb_no || Date.now()}.sb`;
  return { fileName, content };
}

export default {
  generateShippingBillFlatFile,
  generateFlatFileWithName
};
