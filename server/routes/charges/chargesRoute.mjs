import express from 'express';
import ExJobModel from '../../model/export/ExJobModel.mjs';
import ChargeHeadModel from '../../model/export/chargesHead.mjs';
import ShippingLine from '../../model/Directorties/ShippingLine.js';
import Directory from '../../model/Directorties/Directory.js';

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
        const { name, category } = req.body;

        // Check dupe (case insensitive)
        const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            return res.status(409).json({ success: false, message: "Charge head already exists" });
        }

        const newHead = new ChargeHeadModel({ name, category, isSystem: false });
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
        const { name, category, isActive } = req.body;

        // Optional: check dupe name if name is provided
        if (name) {
            const existing = await ChargeHeadModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: id } });
            if (existing) {
                return res.status(409).json({ success: false, message: "Charge head with this name already exists" });
            }
        }

        const updated = await ChargeHeadModel.findByIdAndUpdate(
            id,
            { $set: { name, category, isActive } },
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
        res.json(items);
    } catch (error) {
        res.status(500).json([]);
    }
});

router.get('/get-suppliers', async (req, res) => {
    try {
        // Map directories of type Vendor/Transporter to suppliers
        const items = await Directory.find({ 
            "generalInfo.entityType": { $in: ["Vendor", "Transporter"] } 
        }).sort({ organization: 1 });
        
        // Map to format chargesGrid expects
        const mapped = items.map(i => ({
            name: i.organization,
            city: i.branches?.[0]?.city || '',
            branches: i.branches || []
        }));
        res.json(mapped);
    } catch (error) {
        res.status(500).json([]);
    }
});

router.get('/organization', async (req, res) => {
    try {
        // Map directories of type Exporter/Importer to organizations
        const items = await Directory.find({ 
            "generalInfo.entityType": { $in: ["Exporter", "Importer"] } 
        }).sort({ organization: 1 });
        
        const mapped = items.map(i => ({
            name: i.organization,
            city: i.branches?.[0]?.city || '',
            branches: i.branches || []
        }));
        res.json({ success: true, organizations: mapped });
    } catch (error) {
        res.status(500).json({ success: false, organizations: [] });
    }
});

// --- CHARGES API (Embedded in ExJobModel) ---

router.get('/charges', async (req, res) => {
    try {
        const { parentId, parentModule } = req.query;
        if (!parentId || !['Job', 'ExportJob'].includes(parentModule)) {
            return res.status(400).json({ success: false, message: 'Valid Job parentId required' });
        }
        const job = await ExJobModel.findById(parentId);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        res.json({ success: true, data: job.charges || [] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/charges', async (req, res) => {
    try {
        const { parentId, parentModule } = req.body;
        if (!parentId || !['Job', 'ExportJob'].includes(parentModule)) return res.status(400).json({ success: false, message: 'Valid Job parentId required' });

        const job = await ExJobModel.findById(parentId);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        job.charges.push(req.body);
        await job.save();

        const newCharge = job.charges[job.charges.length - 1];
        res.json({ success: true, data: newCharge });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Add multiple charges at once
router.post('/charges/bulk', async (req, res) => {
    try {
        const { charges } = req.body;
        if (!Array.isArray(charges) || charges.length === 0) {
            return res.status(400).json({ success: false, message: "Expected 'charges' array." });
        }

        const parentId = charges[0].parentId;
        const job = await ExJobModel.findById(parentId);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        charges.forEach(chargeData => job.charges.push(chargeData));
        await job.save();

        const savedCharges = job.charges.slice(-charges.length);
        res.json({ success: true, data: savedCharges });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/charges/:id', async (req, res) => {
    try {
        const job = await ExJobModel.findOne({ 'charges._id': req.params.id });
        if (!job) return res.status(404).json({ success: false, message: 'Charge not found' });

        const charge = job.charges.id(req.params.id);

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

        await job.save();
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

        job.charges.pull(req.params.id);
        await job.save();

        res.json({ success: true, message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
