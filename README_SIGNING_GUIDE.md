# DSC Signing & ICEGATE Integration Guide

This guide explains how the Digital Signature Certificate (DSC) signing process works within the Exim-Export system, how it integrates with CHA software requirements, and provides a comparison between successful and rejected file structures.

## 1. System Architecture

The signing system consists of three main components:
1.  **Exim Cloud App**: Generates the raw Flat Files (.sb) for ICEGATE.
2.  **Local Signing Server (Bridge)**: A Java application running on the local PC where the USB Token is plugged in.
3.  **USB Token**: The hardware containing the DSC private key.

### The Workflow
1.  User clicks **"Sign File"** in the Web Dashboard.
2.  The Cloud App sends the raw file bytes to the **Local Signing Server** via a `POST` request.
3.  The Local Server **normalizes** the file, signs it using the USB Token, and appends the required ICEGATE metadata.
4.  The signed file is returned to the user for download/submission.

---

## 2. Technical Integration (CHA Software Standards)

To ensure 100% compliance with ICEGATE (matching the behavior of Softlink or VNCODE software), the following standards are implemented in the `FlatFileSignHandler`:

### Line Endings (CRLF vs LF)
*   **Content Body**: Uses standard Windows `\r\n` (CRLF) for records.
*   **Normalization**: Before signing, the content is stripped of trailing spaces and forced to end with a single `\n` (LF).
*   **Metadata Blocks**: The signature and certificate tags MUST be separated by `\n` (LF). Using `\r\n` in the metadata block often causes validation failure.

### Signer Version
The version string is hardcoded to the ICEGATE-accepted standard:
```xml
<SIGNER-VERSION>V-NCODE_01.05.2013</SIGNER-VERSION>
```

### Encoding
All files are processed using **ISO-8859-1 (Latin-1)**. This is critical because:
*   UTF-8 may corrupt the **Field Separator** (`0x1D`).
*   ICEGATE servers expect single-byte character encoding.

---

## 3. Comparison Findings: Success vs. Rejected

Based on byte-level analysis of successful vs. rejected submissions, here are the key differences an agent should check when troubleshooting:

| Feature | Successful File (Accepted) | Rejected File (DSC Validation Failed) |
| :--- | :--- | :--- |
| **Trailing Newlines** | Exactly one `\n` before `<START-SIGNATURE>` | Multiple `\r\n` or spaces before tags |
| **Metadata Delimiters** | Tags separated by `\n` (Hex: `0A`) | Tags separated by `\r\n` (Hex: `0D 0A`) |
| **Signer Version** | `V-NCODE_01.05.2013` | Missing or generic version like `1.0` |
| **Field Separators** | ASCII `29` (Hex: `1D`) | Literal commas or spaces |
| **HREC Field Count** | 17 fields | Less than or more than 17 |
| **TREC Field Count** | 13 fields | Less than or more than 13 |
| **Signature Format** | PKCS#1 v1.5 RSA Signature (Base64) | CMS/PKCS#7 (Too large/incorrect format) |

---

## 4. Troubleshooting for Agents

### Common Error: "DSC Validation Failed"
1.  **Check Line Endings**: Open the file in a Hex Editor (like HxD). Ensure the bytes before `<START-SIGNATURE>` are `...0D 0A 0A` or just `...0A`.
2.  **Verify Field Counts**:
    *   Count the `0x1D` separators in the `HREC` line. There should be exactly **16** separators (for 17 fields).
    *   Count the `0x1D` separators in the `TREC` line. There should be exactly **12** separators (for 13 fields).
3.  **Token Connectivity**:
    *   Ensure the local server logs show `✅ DSC Initialized`.
    *   If the log shows `CKR_USER_NOT_LOGGED_IN`, the user needs to re-enter their PIN in the Local Signer UI.

### Manual Verification Tool
An agent can run the comparison script to identify discrepancies:
```bash
node server/tools/compare-sb-files.js <generated_file>.sb <known_good_file>.sb
```
This will provide a byte-by-byte diff and highlight exactly where the structure deviates from the requirement.

---

## 5. Local Server Setup

1.  Plug in USB Token.
2.  Run `local-signer-1.0-SNAPSHOT.jar`.
3.  Configure the **DLL Path** (e.g., `C:\Windows\System32\eps2003csp11.dll`).
4.  Enter the **Token PIN**.
5.  Status should show **"Connected"** with the certificate subject name.
