import axios from 'axios';
import FormData from 'form-data'; // Standard in modern Node, but good to have as fallback if needed
import fs from 'fs';

/**
 * Utility to communicate with the Java DSC Signing Server.
 * The Java server must be running on the designated Signing PC.
 */
class SigningUtility {
  constructor() {
    // Default to localhost, can be overridden by env
    this.baseUrl = process.env.SIGNING_SERVER_URL || 'http://localhost:5000';
  }

  /**
   * Check if the signing server is reachable and DSC is connected.
   */
  async checkStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/status`, { timeout: 3000 });
      return response.data;
    } catch (error) {
      console.error('❌ Signing Server Unreachable:', error.message);
      return { status: 'offline', error: error.message };
    }
  }

  /**
   * Sign a PDF file (Embedded PAdES signature).
   * @param {Buffer|Stream} fileContent - The raw bytes of the PDF.
   * @param {string} fileName - Optional filename for the form field.
   * @returns {Promise<Buffer>} - The signed PDF bytes.
   */
  async signPdf(fileContent, fileName = 'document.pdf') {
    return this._sendSignRequest('/sign/pdf', fileContent, fileName);
  }

  /**
   * Sign a Flat File (ICEGATE .sb format).
   * @param {Buffer|Stream} fileContent - The raw bytes of the flat file.
   * @param {string} fileName - Optional filename for the form field.
   * @returns {Promise<Buffer>} - The signed .sb file bytes.
   */
  async signFlatFile(fileContent, fileName = 'file.sb') {
    return this._sendSignRequest('/sign/flatfile', fileContent, fileName);
  }

  /**
   * Internal helper to send multipart/form-data request.
   */
  async _sendSignRequest(endpoint, content, fileName) {
    try {
      const form = new FormData();
      
      // Handle Buffers, Streams, or File Paths
      if (typeof content === 'string' && fs.existsSync(content)) {
        form.append('file', fs.createReadStream(content));
      } else {
        form.append('file', content, fileName);
      }

      const response = await axios.post(`${this.baseUrl}${endpoint}`, form, {
        headers: {
          ...form.getHeaders(),
        },
        responseType: 'arraybuffer',
        timeout: 30000, // Signing can take a few seconds
      });

      return Buffer.from(response.data);
    } catch (error) {
      let errorMessage = error.message;
      let detailedError = '';

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        detailedError = `Status: ${error.response.status}`;
        if (error.response.data) {
          try {
            const dataStr = Buffer.from(error.response.data).toString();
            const json = JSON.parse(dataStr);
            errorMessage = json.error || errorMessage;
            detailedError += ` | Data: ${dataStr}`;
          } catch (e) {
            detailedError += ` | Raw: ${Buffer.from(error.response.data).toString().substring(0, 100)}`;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        detailedError = `No response received from signing server. Code: ${error.code}. Is it running?`;
        if (error.code === 'ECONNREFUSED') {
            detailedError = 'Connection Refused: The Java Signer is NOT running on the specified port. Please start the Local Signer app.';
        }
      } else {
        // Something happened in setting up the request that triggered an Error
        detailedError = error.message;
      }

      console.error(`❌ Signing Request Failed [${endpoint}]:`, errorMessage);
      console.error(`🔍 Detailed Error Info:`, detailedError);
      throw new Error(`Signing Failed: ${errorMessage} (${error.code || 'Unknown'})`);
    }
  }
}

export default new SigningUtility();
