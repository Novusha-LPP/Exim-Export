import mongoose from "mongoose";
import { productDetailsSchema, freightInsuranceChargesSchema } from "./productSchemas.mjs";

const { Schema } = mongoose;

export const invoiceSchema = new Schema(
    {
        invoiceNumber: { type: String },
        invoiceDate: { type: String, trim: true },
        termsOfInvoice: {
            type: String,
            default: "FOB",
        },
        toiPlace: {
            type: String,
            trim: true,
        },
        currency: {
            type: String,
            ref: "Currency",
        },
        invoiceValue: { type: Number, min: 0 },
        productValue: { type: Number, min: 0 },
        priceIncludes: {
            type: String,
            enum: ["Both", "Freight", "Insurance", "None"],
            default: "Both",
        },
        packing_charges: { type: Number, default: 0 },
        products: [productDetailsSchema],
        freightInsuranceCharges: { type: freightInsuranceChargesSchema },
    },
    { _id: true },
);

export const buyerThirdPartySchema = new Schema(
    {
        // Buyer Information
        buyer: {
            name: { type: String },
            addressLine1: String,
            city: String,
            pin: String,
            country: { type: String, ref: "Country" },
            state: String,
        },

        // Third Party Information (if applicable)
        thirdParty: {
            isThirdPartyExport: { type: Boolean, default: false },
            name: String,
            city: String,
            pin: String,
            country: { type: String, ref: "Country" },
            state: String,
            address: String,
        },

        // Manufacturer/Producer/Grower Details
        manufacturer: {
            name: String,
            ieCode: String,
            branchSerialNo: String,
            registrationNo: String,
            address: String,
            country: { type: String, ref: "Country", default: "IN" },
            stateProvince: String,
            postalCode: String,
            sourceState: { type: String, ref: "State" },
            transitCountry: { type: String, ref: "Country" },
        },
    },
    { _id: false },
);

export const apInvoiceSchema = new Schema(
    {
        date: { type: String, trim: true },
        bill_no: { type: String, trim: true },
        type: { type: String, trim: true, default: "INV" },
        organization: { type: String, trim: true },
        currency: { type: String, trim: true },
        amount: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
        vendor_bill_no: { type: String, trim: true },
    },
    { _id: true },
);

export const arInvoiceSchema = new Schema(
    {
        date: { type: String, trim: true },
        bill_no: { type: String, trim: true },
        type: { type: String, trim: true, default: "INV" },
        organization: { type: String, trim: true },
        currency: { type: String, trim: true },
        amount: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
    },
    { _id: true },
);
