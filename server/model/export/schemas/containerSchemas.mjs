import mongoose from "mongoose";

const { Schema } = mongoose;

export const containerDetailsSchema = new Schema(
    {
        serialNumber: { type: Number },
        containerNo: { type: String },
        containerSize: { type: String, trim: true },
        isoCode: { type: String, trim: true },
        sealNo: String,
        customSealNo: { type: String, trim: true },
        shippingLineSealNo: String,
        sealDate: { type: String, trim: true },
        type: {
            type: String,
        },
        pkgsStuffed: { type: Number, default: 0 },
        grossWeight: { type: Number, default: 0 },
        maxGrossWeightKgs: { type: Number, default: 0 },
        vgmWtInvoice: { type: Number, default: 0 },
        maxPayloadKgs: { type: Number, default: 0 },
        sealType: {
            type: String,
        },
        grWtPlusTrWt: { type: Number, default: 0 },
        tareWeightKgs: { type: Number, default: 0 },
        sealDeviceId: String,
        rfid: String,
        movementDocumentType: { type: String, trim: true },
        movementDocumentNumber: { type: String, trim: true },
        images: [String],
        // Weighment Details
        weighBridgeName: { type: String, trim: true },
        weighmentTransporterName: { type: String, trim: true },
        weighmentRegNo: { type: String, trim: true },
        weighmentDateTime: { type: String, trim: true },
        weighmentVehicleNo: { type: String, trim: true },
        weighmentTareWeight: { type: Number, default: 0 },
        weighmentAddress: { type: String, trim: true },
        weighmentImages: [String],
    },
    { _id: true },
);

export const packingListSchema = new Schema(
    {
        packingNumberFrom: { type: String, trim: true },
        packingNumberTo: { type: String, trim: true },
        packingCode: { type: String, trim: true },
    },
    { _id: true },
);

export const stuffingDetailsSchema = new Schema(
    {
        factoryStuffed: { type: String, trim: true },
        sampleAccompanied: { type: String, trim: true },
    },
    { _id: true },
);
