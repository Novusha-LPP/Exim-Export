import mongoose from "mongoose";

const { Schema } = mongoose;

export const areDetailsSchema = new Schema(
    {
        serialNumber: { type: Number },
        areNumber: { type: String, trim: true },
        areDate: { type: String, trim: true }, // Changed to String for dd-mm-yyyy
        commissionerate: { type: String, trim: true },
        division: { type: String, trim: true },
        range: { type: String, trim: true },
        remark: { type: String, trim: true },
    },
    { _id: true },
);

export const deecSchema = new Schema(
    {
        isDeecItem: { type: Boolean, default: false },
        itemSnoPartE: { type: String, trim: true },
        exportQtyUnderLicence: { type: Number, default: 0 },
        exportQtyUnit: { type: String, trim: true },

        // DEEC Items table
        deecItems: [
            {
                serialNumber: { type: Number },
                itemSnoPartC: { type: String, trim: true },
                description: { type: String, trim: true },
                quantity: { type: Number, default: 0 },
                unit: { type: String, trim: true },
                itemType: {
                    type: String,
                    enum: ["Indigenous", "Imported"],
                    default: "Indigenous",
                },
            },
        ],

        // Reference information
        deec_reg_obj: [
            {
                licRefNo: { type: String, trim: true },
                regnNo: { type: String, trim: true },
                licDate: { type: String, trim: true },
            },
        ],
    },
    { _id: true },
);

export const epcgSchema = new Schema(
    {
        isEpcgItem: { type: Boolean, default: false },
        itemSnoPartE: { type: String, trim: true },
        exportQtyUnderLicence: { type: Number, default: 0 },
        exportQtyUnit: { type: String, trim: true },

        // EPCG Items table
        epcgItems: [
            {
                serialNumber: { type: Number },
                itemSnoPartC: { type: String, trim: true },
                description: { type: String, trim: true },
                quantity: { type: Number, default: 0 },
                unit: { type: String, trim: true },
                itemType: {
                    type: String,
                    enum: ["Indigenous", "Imported"],
                    default: "Indigenous",
                },
            },
        ],

        // Reference information
        epcg_reg_obj: [
            {
                licRefNo: { type: String, trim: true },
                regnNo: { type: String, trim: true },
                licDate: { type: String, trim: true },
            },
        ],
    },
    { _id: true },
);

export const cessExpDutySchema = new Schema(
    {
        // master flag
        cessDutyApplicable: { type: Boolean, default: false },

        // each row has: code dropdown, rate value+unit, TV value+factor, qty, desc
        exportDutyCode: { type: String, trim: true },
        exportDuty: { type: Number, default: 0 }, // base amount if needed
        exportDutyRate: { type: Number, default: 0 },
        exportDutyRateUnit: { type: String, trim: true }, // "% or Rs"
        exportDutyTariffValue: { type: Number, default: 0 },
        exportDutyTariffFactor: { type: Number, default: 0 },
        exportDutyQty: { type: Number, default: 0 },
        exportDutyDesc: { type: String, trim: true },

        cessCode: { type: String, trim: true },
        cess: { type: Number, default: 0 },
        cessRate: { type: Number, default: 0 },
        cessRateUnit: { type: String, trim: true },
        cessTariffValue: { type: Number, default: 0 },
        cessTariffFactor: { type: Number, default: 0 },
        cessQty: { type: Number, default: 0 },
        cessDesc: { type: String, trim: true },

        otherDutyCessCode: { type: String, trim: true },
        otherDutyCess: { type: Number, default: 0 },
        otherDutyCessRate: { type: Number, default: 0 },
        otherDutyCessRateUnit: { type: String, trim: true },
        otherDutyCessTariffValue: { type: Number, default: 0 },
        otherDutyCessTariffFactor: { type: Number, default: 0 },
        otherDutyCessQty: { type: Number, default: 0 },
        otherDutyCessDesc: { type: String, trim: true },

        tariffValue_tv: { type: Number, default: 0 },
        tariffUnit_tv: { type: String, trim: true },

        thirdCessCode: { type: String, trim: true },
        thirdCess: { type: Number, default: 0 },
        thirdCessRate: { type: Number, default: 0 },
        thirdCessRateUnit: { type: String, trim: true },
        thirdCessTariffValue: { type: Number, default: 0 },
        thirdCessTariffFactor: { type: Number, default: 0 },
        thirdCessQty: { type: Number, default: 0 },
        thirdCessDesc: { type: String, trim: true },

        // common unit field at bottom right
        cessUnit: { type: String, trim: true },

        // nested CENVAT block from screenshot
        cenvat: {
            certificateNumber: { type: String, trim: true },
            date: { type: String, trim: true },
            validUpto: { type: String, trim: true },
            cexOfficeCode: { type: String, trim: true },
            assesseeCode: { type: String, trim: true },
        },
    },
    { _id: false },
);

export const freightInsuranceChargesSchema = new Schema(
    {
        freight: {
            currency: { type: String, ref: "Currency" },
            exchangeRate: { type: Number },
            rate: { type: Number },
            baseValue: { type: Number },
            amount: { type: Number },
        },
        insurance: {
            currency: { type: String, ref: "Currency" },
            exchangeRate: { type: Number },
            rate: { type: Number },
            baseValue: { type: Number },
            amount: { type: Number },
        },
        discount: {
            currency: { type: String, ref: "Currency" },
            exchangeRate: { type: Number },
            rate: { type: Number },
            amount: { type: Number },
        },
        otherDeduction: {
            currency: { type: String, ref: "Currency" },
            exchangeRate: { type: Number },
            rate: { type: Number },
            amount: { type: Number },
        },
        commission: {
            currency: { type: String, ref: "Currency" },
            exchangeRate: { type: Number },
            rate: { type: Number },
            amount: { type: Number },
        },
        fobValue: {
            currency: { type: String, ref: "Currency" },
            fobValueUSD: { type: Number },
            amount: { type: Number },
        },
    },
    { _id: false },
);

export const drawbackDetailsSchema = new Schema(
    {
        dbkitem: { type: Boolean, default: false },
        dbkSrNo: { type: String },
        fobValue: { type: String, min: 0 },
        quantity: { type: Number, min: 0 },
        unit: { type: String, trim: true },
        dbkUnder: {
            type: String,
            enum: ["Actual", "Provisional"],
            default: "Actual",
        },
        dbkDescription: { type: String, maxlength: 500 },
        dbkRate: { type: Number, default: 0, min: 0 },
        dbkCap: { type: Number, default: 0, min: 0 },
        dbkCapunit: { type: String, trim: true },
        dbkAmount: { type: Number, default: 0, min: 0 },
        percentageOfFobValue: { type: String },
        // ROSCTL fields
        slRate: { type: Number, default: 0 },
        slCap: { type: Number, default: 0 },
        ctlRate: { type: Number, default: 0 },
        ctlCap: { type: Number, default: 0 },
        rosctlAmount: { type: Number, default: 0 },
        rosctlCategory: { type: String, trim: true }, // "B" or "D"
        showRosctl: { type: Boolean, default: false },
        drawback_scroll_date: { type: String, trim: true },
        drawback_scroll_no: { type: String, trim: true },
        rosctl_scroll_no: { type: String, trim: true },
        rosctl_scroll_date: { type: String, trim: true },
        manualQuantity: { type: Boolean, default: false },
        manualUnit: { type: Boolean, default: false },
    },
    { _id: true },
);

export const productDetailsSchema = new Schema(
    {
        serialNumber: { type: String },
        description: { type: String, maxlength: 500 },
        ritc: { type: String, ref: "TariffHead" },
        quantity: { type: String },
        qtyUnit: { type: String },
        socQuantity: { type: String, default: "0" },
        socunit: { type: String },
        isSqcQuantityManual: { type: Boolean, default: false },
        isSqcUnitManual: { type: Boolean, default: false },
        unitPrice: { type: String },
        priceUnit: { type: String },
        per: { type: String },
        perUnit: { type: String },
        amount: { type: String },
        amountUnit: { type: String },

        // --- General / Origin Details ---
        eximCode: { type: String, trim: true },
        nfeiCategory: { type: String, trim: true },
        rewardItem: { type: Boolean, default: false }, // Changed to Boolean
        strCode: { type: String, trim: true },
        endUse: { type: String, trim: true },
        originDistrict: { type: String, trim: true },
        originState: { type: String, trim: true },
        ptaFtaInfo: { type: String, trim: true },
        alternateQty: { type: String, default: "0" },
        materialCode: { type: String, trim: true },
        medicinalPlant: { type: String, trim: true },
        formulation: { type: String, trim: true },
        surfaceMaterialInContact: { type: String, trim: true },
        labGrownDiamond: { type: String, trim: true },

        // --- PMV Info (Grouped) ---
        pmvInfo: {
            currency: { type: String },
            calculationMethod: { type: String, trim: true }, // 'percentage' or 'value'
            percentage: { type: String, default: "110" },
            pmvPerUnit: { type: String, default: "0" },
            totalPMV: { type: String, default: "0" },
        },

        // --- IGST & Compensation Cess Info (Grouped) ---
        igstCompensationCess: {
            igstPaymentStatus: { type: String, trim: true, default: "LUT" },
            taxableValueINR: { type: String, default: "0" },
            isTaxableValueManual: { type: Boolean, default: false },
            igstRate: { type: String, default: "0" },
            igstAmountINR: { type: String, default: "0" },
            isIgstManual: { type: Boolean, default: false },
            compensationCessRate: { type: String, default: "0" },
            compensationCessAmountINR: { type: String, default: "0" },
        },

        // --- RODTEP Info (Grouped) ---
        rodtepInfo: {
            claim: { type: String, trim: true, default: "Yes" },
            quantity: { type: String, default: "0" },
            ratePercent: { type: String, default: "0" },
            capValue: { type: String, default: "0" },
            capValuePerUnits: { type: String, default: "0" },
            amountINR: { type: String, default: "0" },
            unit: { type: String, trim: true }, // Added unit if needed
            capUnit: { type: String, trim: true }, // Added capUnit if needed
            isCapUnitManual: { type: Boolean, default: false },
        },

        // --- ROSCTL Info (Grouped) ---
        rosctlInfo: {
            claim: { type: String, trim: true, default: "No" },
            quantity: { type: String, default: "0" },
            slRate: { type: String, default: "0" },
            slCap: { type: String, default: "0" },
            ctlRate: { type: String, default: "0" },
            ctlCap: { type: String, default: "0" },
            amountINR: { type: String, default: "0" },
            category: { type: String, trim: true }, // "B" or "D"
        },

        cessExpDuty: { type: cessExpDutySchema },

        // --- Re-Export Details ---
        reExport: {
            isReExport: { type: Boolean, default: false },
            warehouseName: { type: String, trim: true },
            warehouseCode: { type: String, trim: true },

            // Import / B/E Side
            beNumber: { type: String, trim: true },
            beDate: { type: String, trim: true }, // Date picker
            invoiceSerialNo: { type: String, trim: true },
            itemSerialNo: { type: String, trim: true },
            importPortCode: { type: String, trim: true },
            manualBE: { type: Boolean, default: false },
            beItemDescription: { type: String, trim: true },

            quantityImported: { type: Number, default: 0 },
            qtyImportedUnit: { type: String, trim: true }, // Added (Missing in original)

            assessableValue: { type: Number, default: 0 },
            totalDutyPaid: { type: Number, default: 0 },
            dutyPaidDate: { type: String, trim: true },

            // Export Side
            quantityExported: { type: Number, default: 0 },
            qtyExportedUnit: { type: String, trim: true }, // Added (Missing in original)

            technicalDetails: { type: String, trim: true },

            inputCreditAvailed: { type: Boolean, default: false },
            personalUseItem: { type: Boolean, default: false },

            otherIdentifyingParameters: { type: String, trim: true },

            againstExportObligation: { type: Boolean, default: false }, // Changed to Boolean to match checkbox
            obligationNo: { type: String, trim: true },

            drawbackAmtClaimed: { type: Number, default: 0 },

            itemUnUsed: { type: Boolean, default: false },
            commissionerPermission: { type: Boolean, default: false }, // Changed to Boolean to match checkbox

            boardNumber: { type: String, trim: true },
            boardDate: { type: String, trim: true }, // Added (Missing in original)

            modvatAvailed: { type: Boolean, default: false },
            modvatReversed: { type: Boolean, default: false },

            // Legacy fields just in case
            commPermissionDate: { type: String, trim: true },
        },

        // --- Other Details ---
        otherDetails: {
            accessories: { type: String, trim: true, default: "" },
            accessoriesRemarks: { type: String, trim: true, default: "" },
            isThirdPartyExport: { type: Boolean, default: false },
            thirdParty: {
                name: { type: String, trim: true },
                ieCode: { type: String, trim: true },
                branchSrNo: { type: String, trim: true },
                regnNo: { type: String, trim: true },
                address: { type: String, trim: true },
            },
            manufacturer: {
                name: { type: String, trim: true },
                code: { type: String, trim: true },
                address: { type: String, trim: true },
                country: { type: String, trim: true },
                stateProvince: { type: String, trim: true },
                postalCode: { type: String, trim: true },
                sourceState: { type: String, trim: true },
                transitCountry: { type: String, trim: true },
            },
        },

        areDetails: [areDetailsSchema],
        deecDetails: deecSchema,
        epcgDetails: epcgSchema,
        drawbackDetails: [drawbackDetailsSchema],

        // --- Legacy / Flat fields (kept for SB Type logic compatibility) ---
        sbTypeDetails: { type: String, trim: true },
        dbkType: { type: String, trim: true },
        cessExciseDuty: { type: String, default: "0" },
        compensationCess: { type: String, default: "0" },
    },
    { _id: true },
);
