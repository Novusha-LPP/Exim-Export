import { submitHandoverToOdex } from './odexService.js';
import { submitHandoverToMmd3 } from './mmd3Service.js';

export const handleAutomatedExportHandover = async (ExportHandover) => {
  // Try sending to ODEx
  try {
    const odexResp = await submitHandoverToOdex(ExportHandover);
    ExportHandover.integrationLogs.push({
      system: 'ODEX',
      requestPayload: ExportHandover,
      responsePayload: odexResp,
      status: 'SUCCESS',
      timestamp: new Date()
    });
  } catch (err) {
    ExportHandover.integrationLogs.push({
      system: 'ODEX',
      requestPayload: ExportHandover,
      status: 'ERROR',
      errorMessage: err.message,
      timestamp: new Date()
    });
    ExportHandover.status = 'FAILED';
  }

  // Try sending to MMD3
  try {
    const mmd3Resp = await submitHandoverToMmd3(ExportHandover);
    ExportHandover.integrationLogs.push({
      system: 'MMD3',
      requestPayload: ExportHandover,
      responsePayload: mmd3Resp,
      status: 'SUCCESS',
      timestamp: new Date()
    });
  } catch (err) {
    ExportHandover.integrationLogs.push({
      system: 'MMD3',
      requestPayload: ExportHandover,
      status: 'ERROR',
      errorMessage: err.message,
      timestamp: new Date()
    });
    ExportHandover.status = 'FAILED';
  }

  if (ExportHandover.status !== 'FAILED') ExportHandover.status = 'COMPLETED';
  await ExportHandover.save();
  return ExportHandover;
};
