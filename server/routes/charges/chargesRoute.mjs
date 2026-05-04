import express from 'express';
import ExJobModel from '../../model/export/ExJobModel.mjs';
import FreightEnquiryModel from '../../model/export/FreightEnquiryModel.mjs';
import ChargeHeadModel from '../../model/export/chargesHead.mjs';
import PurchaseBookEntryModel from '../../model/export/purchaseBookEntryModel.mjs';
import PaymentRequestModel from '../../model/export/paymentRequestModel.mjs';
import ShippingLine from '../../model/Directorties/ShippingLine.js';
import Directory from '../../model/Directorties/Directory.js';
import Transporter from '../../model/Directorties/Transporter.js';
import TerminalCode from '../../model/Directorties/TerminalCode.js';

const router = express.Router();

// --- CHARGE HEADS API ---

router.get('/charge-heads', async (req, res) => {
    try {
        const { search } = req.query;
        let query = { isActive: true };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        const heads = await ChargeHeadModel.find(query).sort({ isSystem: -1, name: 1 });
        res.json({ success: true, data: heads });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/charge-heads', async (req, res) => {
    try {
        const { name, category, hsnCode, chargeType, isPbMandatory, tdsCategory } = req.body;

        // Check dupe (case insensitive)
        const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            return res.status(409).json({ success: false, message: "Charge head already exists" });
        }

        const newHead = new ChargeHeadModel({ name, category, hsnCode, chargeType, isPbMandatory, tdsCategory, isSystem: false });
        await newHead.save();
        res.json({ success: true, data: newHead });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Seed API (optional helper to initialize system charges)
router.post('/charge-heads/seed', async (req, res) => {
    try {
        const defaultCharges = [
            { name: 'EDI CHARGES', category: 'Service Charge', isSystem: true },
            { name: 'ODEX INDIA SOLUTIONS PVT LTD', category: 'Reimbursement', isSystem: true },
            { name: 'HASTI PETRO CHEMICALS & SHIPPING LTD - IMPORT', category: 'Freight', isSystem: true },
            { name: 'CONTAINER CORPN OF INDIA LTD.', category: 'Freight', isSystem: true },
            { name: 'SR CONTAINER CARRIERS', category: 'Transport', isSystem: true },
            { name: 'BOND PAPER EXP.', category: 'Document', isSystem: true },
            { name: 'THAR LOGISTICS', category: 'Transport', isSystem: true },
            { name: 'CUSTOMS DUTY', category: 'Customs', isSystem: true },
            { name: 'LABOUR & MISC CHARGES', category: 'Miscellaneous', isSystem: true },
            { name: 'OTHER DOCUMENT', category: 'Document', isSystem: true },
        ];

        let addedCount = 0;
        for (const charge of defaultCharges) {
            const existing = await ChargeHeadModel.findOne({ name: charge.name });
            if (!existing) {
                await ChargeHeadModel.create(charge);
                addedCount++;
            }
        }

        res.json({ success: true, message: `Seeded ${addedCount} new system charges.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/charge-heads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, isActive, hsnCode, chargeType, isPbMandatory, tdsCategory } = req.body;

        // Optional: check dupe name if name is provided
        if (name) {
            const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: id } });
            if (existing) {
                return res.status(409).json({ success: false, message: "Charge head with this name already exists" });
            }
        }

        const updateObj = { name, category, isActive };
        if (hsnCode !== undefined) updateObj.hsnCode = hsnCode;
        if (chargeType !== undefined) updateObj.chargeType = chargeType;
        if (isPbMandatory !== undefined) updateObj.isPbMandatory = isPbMandatory;
        if (tdsCategory !== undefined) updateObj.tdsCategory = tdsCategory;

        const updated = await ChargeHeadModel.findByIdAndUpdate(
            id,
            { $set: updateObj },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Charge head not found' });
        }

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/charge-heads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ChargeHeadModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Charge head not found' });
        }
        res.json({ success: true, message: 'Charge head deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- MASTER DATA FOR CHARGES GRID ---

router.get('/get-shipping-lines', async (req, res) => {
    try {
        const items = await ShippingLine.find().sort({ name: 1 });
        const mapped = items.map(i => {
            const obj = i.toObject();
            return {
                ...obj,
                name: obj.name,
                branches: obj.branches || []
            };
        });
        res.json(mapped);
    } catch (error) {
        res.status(500).json([]);
    }
});

router.get('/get-suppliers', async (req, res) => {
    try {
        const items = await Directory.find({ 
            "generalInfo.entityType": { $in: ["Vendor"] } 
        }).sort({ organization: 1 });
        
        const mapped = items.map(i => ({
            name: i.organization,
            city: i.branchInfo?.[0]?.city || i.address?.city || '',
            branches: i.branchInfo?.map(b => ({ ...b, branch_no: b.branchCode, branchName: b.branchName, city: b.city, gst: b.gstNo })) || [],
            pan: i.registrationDetails?.panNo || '',
            tds_percent: i.accountCreditInfo?.tds_percent || 0
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json([]);
    }
});

router.get('/organization', async (req, res) => {
    try {
        const items = await Directory.find({ 
            "generalInfo.entityType": { $in: ["Exporter", "Importer"] } 
        }).sort({ organization: 1 });
        
        const mapped = items.map(i => ({
            name: i.organization,
            city: i.branchInfo?.[0]?.city || i.address?.city || '',
            branches: i.branchInfo?.map(b => ({ ...b, branch_no: b.branchCode, branchName: b.branchName, city: b.city, gst: b.gstNo })) || [],
            pan: i.registrationDetails?.panNo || '',
            tds_percent: i.accountCreditInfo?.tds_percent || 0
        }));
        res.json({ success: true, organizations: mapped });
    } catch (error) {
        res.status(500).json({ success: false, organizations: [] });
    }
});

router.get('/get-cfs-list', async (req, res) => {
    try {
        const items = await Directory.find({ 
            "generalInfo.entityType": { $in: ["CFS", "Warehouse"] } 
        }).sort({ organization: 1 });
        
        const mapped = items.map(i => ({
            name: i.organization,
            city: i.branchInfo?.[0]?.city || i.address?.city || '',
            branches: i.branchInfo?.map(b => ({ ...b, branch_no: b.branchCode, branchName: b.branchName, city: b.city, gst: b.gstNo })) || [],
            pan: i.registrationDetails?.panNo || '',
            tds_percent: i.accountCreditInfo?.tds_percent || 0
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json([]);
    }
});

router.get('/get-transporters', async (req, res) => {
    try {
        const items = await Transporter.find().sort({ name: 1 });
        const mapped = items.map(i => {
            const obj = i.toObject();
            return {
                ...obj,
                name: obj.name,
                branches: obj.branches || []
            };
        });
        res.json(mapped);
    } catch (error) {
        res.status(500).json([]);
    }
});

router.get('/get-terminal-codes', async (req, res) => {
    try {
        const items = await TerminalCode.find().sort({ name: 1 });
        const mapped = items.map(i => {
            const obj = i.toObject();
            return {
                ...obj,
                name: obj.name,
                branches: obj.branches || []
            };
        });
        res.json(mapped);
    } catch (error) {
        res.status(500).json([]);
    }
});

// --- CHARGES API (Embedded in ExJobModel) ---

router.get('/charges', async (req, res) => {
    try {
        const { parentId, parentModule } = req.query;
        if (!parentId || !['Job', 'ExportJob', 'FreightEnquiry'].includes(parentModule)) {
            return res.status(400).json({ success: false, message: 'Valid parentId and parentModule required' });
        }
        const model = parentModule === 'FreightEnquiry' ? FreightEnquiryModel : ExJobModel;
        const record = await model.findById(parentId);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        res.json({ success: true, data: record.charges || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/get-payment-request-details/:requestNo(*)', async (req, res) => {
    try {
        const raw = req.params.requestNo || "";
        const requestNo = decodeURIComponent(raw);
        if (!requestNo) {
            return res.status(400).json({ success: false, message: 'requestNo required' });
        }

        const purchaseEntry = await PurchaseBookEntryModel.findOne({ entryNo: requestNo }).lean();
        if (purchaseEntry) {
            const enriched = { ...purchaseEntry };

            if (purchaseEntry.chargeRef && purchaseEntry.jobRef) {
                try {
                    const job = await ExJobModel.findById(purchaseEntry.jobRef).lean();
                    if (job) {
                        const charge = job.charges?.find(c => c._id?.toString() === purchaseEntry.chargeRef);
                        if (charge) {
                            enriched.url = charge.cost?.url || [];
                            enriched.chargeHead = charge.chargeHead || '';
                        }
                    }
                } catch (error) {
                    console.error('Error enriching purchase entry:', error);
                }
            }

            enriched.address = [
                purchaseEntry.address1,
                purchaseEntry.address2,
                purchaseEntry.address3,
                purchaseEntry.state,
                purchaseEntry.country,
                purchaseEntry.pinCode
            ].filter(Boolean).join(', ');
            enriched.gstin = purchaseEntry.gstinNo || '';
            enriched.pan = purchaseEntry.pan || (purchaseEntry.gstinNo ? purchaseEntry.gstinNo.substring(2, 12) : '');

            return res.json(enriched);
        }

        const paymentRequest = await PaymentRequestModel.findOne({ requestNo }).lean();
        if (paymentRequest) {
            const enriched = { ...paymentRequest };

            if (paymentRequest.chargeRef && paymentRequest.jobRef) {
                try {
                    const job = await ExJobModel.findById(paymentRequest.jobRef).lean();
                    if (job) {
                        const charge = job.charges?.find(c => c._id?.toString() === paymentRequest.chargeRef);
                        if (charge) {
                            const cost = charge.cost || {};
                            enriched.chargeHead = charge.chargeHead || '';
                            enriched.category = charge.category || '';
                            enriched.invoiceNo = charge.invoice_number || cost.invoiceNo || '';
                            enriched.invoiceDate = charge.invoice_date || cost.invoiceDate || '';
                            enriched.description = cost.chargeDescription || charge.chargeHead || '';
                            enriched.url = cost.url || [];
                            enriched.isGst = cost.isGst || false;
                            enriched.gstPercent = cost.gstRate || 18;
                            enriched.taxableValue = cost.basicAmount || 0;
                            enriched.gstAmount = cost.gstAmount || 0;
                            enriched.cgstAmt = cost.cgst || 0;
                            enriched.sgstAmt = cost.sgst || 0;
                            enriched.igstAmt = cost.igst || 0;
                            enriched.isTds = cost.isTds || false;
                            enriched.tdsPercent = cost.tdsPercent || 0;
                            enriched.tdsAmount = enriched.tdsAmount || cost.tdsAmount || 0;
                            enriched.netPayable = cost.netPayable || paymentRequest.amount || 0;
                            enriched.partyName = cost.partyName || paymentRequest.paymentTo || '';
                            enriched.partyType = cost.partyType || '';
                        }

                        enriched.jobNo = enriched.jobNo || job.job_no || '';
                    }
                } catch (error) {
                    console.error('Error enriching payment request:', error);
                }
            }

            if (enriched.paymentTo) {
                try {
                    const escaped = enriched.paymentTo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const supplier = await Directory.findOne({
                        organization: { $regex: new RegExp(`^${escaped}$`, 'i') }
                    }).lean();

                    if (supplier) {
                        const branch = supplier.branchInfo?.[0] || {};
                        enriched.address = [
                            branch.address,
                            branch.city,
                            branch.state,
                            branch.country,
                            branch.pinCode ? `- ${branch.pinCode}` : ''
                        ].filter(Boolean).join(', ');
                        enriched.gstin = branch.gst || supplier.gstin || '';
                        enriched.pan = supplier.pan || enriched.gstin?.substring(2, 12) || '';
                    }
                } catch (error) {
                    console.error('Directory lookup error:', error);
                }
            }

            return res.json(enriched);
        }

        return res.status(404).json({ success: false, message: 'Request details not found' });
    } catch (error) {
        console.error('Request details fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/charges', async (req, res) => {
    try {
        const { parentId, parentModule } = req.body;
        if (!parentId || !['Job', 'ExportJob', 'FreightEnquiry'].includes(parentModule)) {
            return res.status(400).json({ success: false, message: 'Valid parentId and parentModule required' });
        }

        const model = parentModule === 'FreightEnquiry' ? FreightEnquiryModel : ExJobModel;
        const record = await model.findById(parentId);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        record.charges.push(req.body);
        await record.save();

        const newCharge = record.charges[record.charges.length - 1];
        res.json({ success: true, data: newCharge });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update bulk charges to support FreightEnquiry as well
router.post('/charges/bulk', async (req, res) => {
    try {
        const { charges } = req.body;
        if (!Array.isArray(charges) || charges.length === 0) {
            return res.status(400).json({ success: false, message: "Expected 'charges' array." });
        }

        const { parentId, parentModule } = charges[0];
        if (!['Job', 'ExportJob', 'FreightEnquiry'].includes(parentModule)) {
             return res.status(400).json({ success: false, message: 'Invalid parentModule' });
        }

        const model = parentModule === 'FreightEnquiry' ? FreightEnquiryModel : ExJobModel;
        const record = await model.findById(parentId);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        charges.forEach(chargeData => record.charges.push(chargeData));
        await record.save();

        const savedCharges = record.charges.slice(-charges.length);
        res.json({ success: true, data: savedCharges });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/charges/:id', async (req, res) => {
    try {
        // Find in either Job or FreightEnquiry
        let record = await ExJobModel.findOne({ 'charges._id': req.params.id });
        if (!record) {
            record = await FreightEnquiryModel.findOne({ 'charges._id': req.params.id });
        }
        if (!record) return res.status(404).json({ success: false, message: 'Charge not found' });

        const charge = record.charges.id(req.params.id);

        // Assign fields
        if (req.body.revenue) {
            charge.revenue = { ...(charge.revenue ? charge.revenue.toObject() : {}), ...req.body.revenue };
        }
        if (req.body.cost) {
            charge.cost = { ...(charge.cost ? charge.cost.toObject() : {}), ...req.body.cost };
        }

        // Other top level fields
        const excludedFields = ['revenue', 'cost', '_id', 'createdAt', 'updatedAt', 'parentId', 'parentModule'];
        for (const key of Object.keys(req.body)) {
            if (!excludedFields.includes(key)) {
                charge[key] = req.body[key];
            }
        }

        await record.save();
        res.json({ success: true, data: charge });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- APPROVAL WORKFLOW ---
router.post('/approve-purchase-entry', async (req, res) => {
    try {
        const { requestNo } = req.body;
        const job = await ExJobModel.findOne({ 'charges.purchase_book_no': requestNo });
        if (!job) return res.status(404).json({ success: false, message: 'Purchase book entry not found' });

        job.charges.forEach(charge => {
            if (charge.purchase_book_no === requestNo) {
                charge.purchase_book_is_approved = true;
                charge.purchase_book_status = 'Approved';
            }
        });
        await job.save();
        res.json({ success: true, message: 'Approved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/reject-purchase-entry', async (req, res) => {
    try {
        const { requestNo, reason } = req.body;
        const job = await ExJobModel.findOne({ 'charges.purchase_book_no': requestNo });
        if (!job) return res.status(404).json({ success: false, message: 'Purchase book entry not found' });

        job.charges.forEach(charge => {
            if (charge.purchase_book_no === requestNo) {
                charge.purchase_book_no = null;
                charge.purchase_book_status = null;
                charge.purchase_book_is_approved = false;
                charge.remark = (charge.remark ? charge.remark + " | " : "") + `Rejected PB: ${reason || 'No reason'}`;
            }
        });
        await job.save();
        res.json({ success: true, message: 'Rejected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/approve-payment-request', async (req, res) => {
    try {
        const { requestNo } = req.body;
        const job = await ExJobModel.findOne({ 'charges.payment_request_no': requestNo });
        if (!job) return res.status(404).json({ success: false, message: 'Payment request not found' });

        job.charges.forEach(charge => {
            if (charge.payment_request_no === requestNo) {
                charge.payment_request_is_approved = true;
                charge.payment_request_status = 'Approved';
            }
        });
        await job.save();
        res.json({ success: true, message: 'Approved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/reject-payment-request', async (req, res) => {
    try {
        const { requestNo, reason } = req.body;
        const job = await ExJobModel.findOne({ 'charges.payment_request_no': requestNo });
        if (!job) return res.status(404).json({ success: false, message: 'Payment request not found' });

        job.charges.forEach(charge => {
            if (charge.payment_request_no === requestNo) {
                charge.payment_request_no = null;
                charge.payment_request_status = null;
                charge.payment_request_is_approved = false;
                charge.remark = (charge.remark ? charge.remark + " | " : "") + `Rejected PR: ${reason || 'No reason'}`;
            }
        });
        await job.save();
        res.json({ success: true, message: 'Rejected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/update-purchase-utr', async (req, res) => {
    try {
        const { requestNo, bankName, utr } = req.body;
        const job = await ExJobModel.findOne({ 'charges.purchase_book_no': requestNo });
        if (!job) return res.status(404).json({ success: false, message: 'Purchase book entry not found' });

        job.charges.forEach(charge => {
            if (charge.purchase_book_no === requestNo) {
                charge.purchase_book_status = 'Completed';
                charge.remark = (charge.remark ? charge.remark + " | " : "") + `UTR: ${utr}, Bank: ${bankName}`;
            }
        });
        await job.save();
        res.json({ success: true, message: 'UTR updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/update-payment-utr', async (req, res) => {
    try {
        const { requestNo, bankName, utr } = req.body;
        const job = await ExJobModel.findOne({ 'charges.payment_request_no': requestNo });
        if (!job) return res.status(404).json({ success: false, message: 'Payment request not found' });

        job.charges.forEach(charge => {
            if (charge.payment_request_no === requestNo) {
                charge.payment_request_status = 'Completed';
                charge.remark = (charge.remark ? charge.remark + " | " : "") + `UTR: ${utr}, Bank: ${bankName}`;
            }
        });
        await job.save();
        res.json({ success: true, message: 'UTR updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/charges/:id', async (req, res) => {
    try {
        const job = await ExJobModel.findOne({ 'charges._id': req.params.id });
        if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });

        // Block deletion if payment request is approved
        const charge = job.charges.id(req.params.id);
        if (charge && charge.payment_request_is_approved) {
            return res.status(403).json({ success: false, message: 'Cannot delete charge with approved payment request' });
        }

        job.charges.pull(req.params.id);
        await job.save();

        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
