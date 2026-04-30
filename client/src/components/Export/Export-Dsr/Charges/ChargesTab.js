import React from "react";
import ChargesGrid from "../../../chargesGrid/index.jsx";
import { FieldArray, FormikProvider } from "formik";
import FileUpload from "../../../gallery/FileUpload.js";
import ImagePreview from "../../../gallery/ImagePreview.js";
import DateInput from "../../../common/DateInput.js";

const ChargesTab = ({ job, formik, isEditable = true }) => {
  const [chargesCount, setChargesCount] = React.useState(0);
  // Try every known location where the job _id could live
  const parentId =
    job?._id ||
    job?.id ||
    formik?.values?._id ||
    formik?.values?.id ||
    null;

  const jobData = job || formik?.values || {};
  const jobNo = jobData.job_no || jobData.jobNumber || "";
  const jobYear = jobData.year || "";
  const shippingLine = jobData.shipping_line_airline || "";
  const exporterName = jobData.exporter || "";
  const invoices = jobData.invoices || [];
  const firstInvoice = invoices[0] || {};

  const containerCount = jobData.containers?.length || 0;
  const invoiceCount = jobData.invoices?.length || 0;

  if (!parentId) {
    return (
      <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>
        Loading charges… (waiting for job data)
      </div>
    );
  }

  return (
    <FormikProvider value={formik}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ChargesGrid
          parentId={parentId}
          parentModule="ExportJob"
          jobNumber={jobNo}
          jobDisplayNumber={jobNo}
          jobYear={jobYear}
          jobDate={jobData.job_date || jobData.jobDate || ""}
          shippingLineAirline={shippingLine}
          exporterName={exporterName}
          invoiceNumber={firstInvoice.invoiceNumber || ""}
          invoiceDate={firstInvoice.invoiceDate || ""}
          invoiceValue={firstInvoice.invoiceValue || ""}
          invoiceCount={invoiceCount}
          containerCount={containerCount}
          hideTabs={false}
          isEditable={isEditable}
          onChargesCountChange={setChargesCount}
        />

        {/* Fine Section */}
        <fieldset disabled={!isEditable} style={{ border: 'none', padding: 0, margin: 0, width: '100%' }}>
          <div className="grid-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ width: '4px', height: '16px', background: '#e11d48', marginRight: '8px', borderRadius: '2px' }}></span>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Fine Report & Penalties</h3>
            </div>

            <div style={{ padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
              <FieldArray name="fines">
                {({ push, remove }) => (
                  <div>
                    <div className="charge-table-wrap" style={{ margin: 0, border: '1px solid #e2e8f0' }}>
                      <table className="charge-table">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', paddingLeft: '12px' }}>Fine Type</th>
                            <th style={{ textAlign: 'left', paddingLeft: '12px' }}>Accountability</th>
                            <th style={{ textAlign: 'right', paddingRight: '12px' }}>Amount (INR)</th>
                            <th style={{ textAlign: 'left', paddingLeft: '12px' }}>Remarks</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formik.values.fines && formik.values.fines.length > 0 ? (
                            formik.values.fines.map((fine, index) => (
                              <tr key={index}>
                                <td style={{ padding: '4px 12px' }}>
                                  <select
                                    name={`fines.${index}.fineType`}
                                    value={fine.fineType || ""}
                                    onChange={formik.handleChange}
                                    className="ep-select"
                                    style={{ width: '100%', height: '28px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                  >
                                    <option value="Challan">Challan</option>
                                    <option value="Fine by Officer">Fine by Officer</option>
                                    <option value="Notesheet Amount">Notesheet Amount</option>
                                    <option value="Misc">Miscellaneous</option>
                                  </select>
                                </td>
                                <td style={{ padding: '4px 12px' }}>
                                  <select
                                    name={`fines.${index}.accountability`}
                                    value={fine.accountability || ""}
                                    onChange={formik.handleChange}
                                    className="ep-select"
                                    style={{ width: '100%', height: '28px', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                  >
                                    <option value="By Us">By Us</option>
                                    <option value="By Exporter">By Exporter</option>
                                  </select>
                                </td>
                                <td style={{ padding: '4px 12px' }}>
                                  <input
                                    type="number"
                                    name={`fines.${index}.amount`}
                                    value={fine.amount || ""}
                                    onChange={formik.handleChange}
                                    className="ep-desc-input"
                                    placeholder="0"
                                    style={{ width: '100%', height: '28px', textAlign: 'right', fontWeight: 600 }}
                                  />
                                </td>
                                <td style={{ padding: '4px 12px' }}>
                                  <input
                                    type="text"
                                    name={`fines.${index}.remarks`}
                                    value={fine.remarks || ""}
                                    onChange={formik.handleChange}
                                    className="ep-desc-input"
                                    placeholder="Details..."
                                    style={{ width: '100%', height: '28px' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center', padding: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    title="Remove Penalty"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontStyle: 'italic' }}>
                                No fines recorded for this shipment.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => push({ fineType: "Challan", accountability: "By Exporter", amount: 0, remarks: "" })}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <span style={{ fontSize: '14px' }}>+</span> Add Penalty Entry
                      </button>
                    </div>
                  </div>
                )}
              </FieldArray>
            </div>
          </div>

          {/* Invoice & Documents Section */}
          <div className="grid-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ width: '4px', height: '16px', background: '#2563eb', marginRight: '8px', borderRadius: '2px' }}></span>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Billing Submission & Document Proof</h3>
            </div>

            <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '250px', maxWidth: '300px' }}>
                <span className="form-label" style={{ display: 'block', textAlign: 'left', marginBottom: '8px', width: 'auto' }}>Billing Date</span>
                <DateInput
                  name="operations[0].statusDetails[0].billingDocsSentDt"
                  value={formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentDt || ""}
                  onChange={(e) => formik.setFieldValue("operations[0].statusDetails[0].billingDocsSentDt", e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    padding: "0 8px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    height: "28px",
                    background: "#f9fafb",
                    outline: "none",
                    boxSizing: "border-box",
                    fontWeight: 500,
                    color: '#1e293b'
                  }}
                />
              </div>
              <div style={{ flex: '2', minWidth: '350px' }}>
                <span className="form-label" style={{ display: 'block', textAlign: 'left', marginBottom: '8px', width: 'auto' }}>Invoice Document / Bill Copy</span>
                <div style={{
                  padding: '12px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <FileUpload
                    bucketPath="billing_docs"
                    onFilesUploaded={(urls) => {
                      const current = formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentUpload || [];
                      formik.setFieldValue("operations[0].statusDetails[0].billingDocsSentUpload", [...current, ...urls]);
                    }}
                  />
                  <ImagePreview
                    images={formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentUpload || []}
                    onDeleteImage={(index) => {
                      const current = formik.values.operations?.[0]?.statusDetails?.[0]?.billingDocsSentUpload || [];
                      const updated = current.filter((_, i) => i !== index);
                      formik.setFieldValue("operations[0].statusDetails[0].billingDocsSentUpload", updated);
                    }}
                    readOnly={!isEditable}
                  />
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="grid-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
          <div style={{ padding: '16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '32px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: !isEditable ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              <input
                type="checkbox"
                checked={formik.values.financial_lock || false}
                onChange={(e) => formik.setFieldValue("financial_lock", e.target.checked)}
                disabled={!isEditable}
                style={{ width: '16px', height: '16px', cursor: !isEditable ? 'not-allowed' : 'pointer' }}
              />
              Financial Lock
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: (!isEditable || (chargesCount === 0 && (formik.values.charges || []).length === 0)) ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              color: (chargesCount > 0 || (formik.values.charges || []).length > 0) ? '#16a34a' : '#94a3b8'
            }}>
              <input
                type="checkbox"
                checked={formik.values.send_for_billing || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  formik.setFieldValue("send_for_billing", checked);
                  if (checked) {
                    formik.setFieldValue("send_for_billing_date", new Date().toISOString());
                  }
                }}
                disabled={!isEditable || (chargesCount === 0 && (formik.values.charges || []).length === 0)}
                style={{ width: '16px', height: '16px', cursor: (!isEditable || (chargesCount === 0 && (formik.values.charges || []).length === 0)) ? 'not-allowed' : 'pointer' }}
              />
              Send for Billing
            </label>
          </div>
        </div>
      </div>
    </FormikProvider>
  );
};

export default ChargesTab;
