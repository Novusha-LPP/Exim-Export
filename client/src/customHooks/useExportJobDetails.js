import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { convertDateFormatForUI } from "../utils/convertDateFormatForUI";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";

const handleSingleFileUpload = async (file, folderName, setFileSnackbar) => {
  try {
    const key = `${folderName}/${file.name}`;

    const s3 = new AWS.S3({
      accessKeyId: import.meta.env.VITE_ACCESS_KEY,
      secretAccessKey: import.meta.env.VITE_SECRET_ACCESS_KEY,
      region: "ap-south-1",
    });

    const params = {
      Bucket: import.meta.env.VITE_S3_BUCKET,
      Key: key,
      Body: file,
    };

    const data = await s3.upload(params).promise();
    const photoUrl = data.Location;

    setFileSnackbar(true);
    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);

    return photoUrl;
  } catch (err) {
    console.error("Error uploading file:", err);
  }
};

function useExportJobDetails(params, setFileSnackbar) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch export job data
  useEffect(() => {
    async function getExportJobDetails() {
      try {
        setLoading(true);
        console.log("Fetching export job details for:", params);

        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/export-jobs/${params.year}/${
            params.job_no
          }`
        );

        console.log("Full API Response:", response);
        console.log("Response data:", response.data);

        let jobData = null;

        if (response.data) {
          if (response.data.success && response.data.data) {
            jobData = response.data.data;
          } else if (response.data.success === undefined && response.data._id) {
            jobData = response.data;
          } else if (response.data.job_no || response.data._id) {
            jobData = response.data;
          }
        }

        console.log("Processed jobData:", jobData);

        if (jobData) {
          setData(jobData);
        } else {
          console.error("No valid job data found in response");
          setData(null);
        }
      } catch (error) {
        console.error("Error fetching export job details:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    if (params.job_no && params.year) {
      getExportJobDetails();
    } else {
      console.warn("Missing required parameters:", params);
      setLoading(false);
    }
  }, [params.job_no, params.year]);

  const safeValue = (value, defaultVal = "") =>
    value === undefined || value === null ? defaultVal : value;

  const formik = useFormik({
    initialValues: {
      // Basic job info - EMPTY DEFAULTS
      job_no: "",
      year: "",
      filing_mode: "",
      shipper: "",
      job_date: "",
      jobReceivedOn: "",
      transportMode: "",
      sb_type: "",
      custom_house: "",
      consignment_type: "",
      job_owner: "",
      sb_no: "",

      // Exporter details - EMPTY DEFAULTS
      exporter_name: "",
      exporter: "", // Schema field
      exporter_address: "",
      exporter_city: "",
      exporter_state: "",
      exporter_country: "",
      branch_code: "",
      branch_sno: "",
      branchSrNo: "", // Schema field
      state: "",
      ie_code_no: "",
      ie_code: "", // Schema field
      regn_no: "",
      exporter_gstin: "", // Schema field
      gstin: "",
      exporter_pan: "",

      // Consignee details - EMPTY DEFAULTS
      consignee_name: "",
      consignee_address: "",
      consignee_city: "",
      consignee_state: "",
      consignee_country: "",
      buyer_other_than_consignee: false,

      // Invoice details - EMPTY DEFAULTS
      invoice_number: "",
      commercial_invoice_number: "", // Schema field
      invoice_date: "",
      commercial_invoice_date: "", // Schema field
      product_value_usd: "",
      commercial_invoice_value: "", // Schema field
      terms_of_invoice: "",
      invoice_value: "",
      product_value_fob: "",
      packing_fob: "",
      // incoterms: "", // Schema field
      currency: "",
      invoice_currency: "", // Schema field
      exchange_rate: "",
      buyerThirdPartyInfo: {
        buyer: {
          name: "",
          addressLine1: "",
          city: "",
          pin: "",
          country: "",
          state: "",
        },
        thirdParty: {
          isThirdPartyExport: false,
          name: "",
          address: "",
          city: "",
          pin: "",
          country: "",
          state: "",
        },
        manufacturer: {
          name: "",
          ieCode: "",
          branchSerialNo: "",
          registrationNo: "",
          address: "",
          country: "",
          stateProvince: "",
          postalCode: "",
          sourceState: "",
          transitCountry: "",
        },
      },

      otherInfo: {
        exportContractNoDate: "",
        natureOfPayment: "Letter Of Credit",
        paymentPeriod: 0,
        aeoCode: "",
        aeoCountry: "",
        aeoRole: "",
      },

      // Shipping details - EMPTY DEFAULTS
      discharge_port: "",
      port_of_discharge: "", // Schema field
      discharge_country: "",
      destination_port: "",
      destination_country: "",
      shipping_line: "",
      vessel_sailing_date: "",
      vessel_departure_date: "", // Schema field
      voyage_no: "",
      nature_of_cargo: "",
      total_no_of_pkgs: "",
      total_packages: "", // Schema field
      loose_pkgs: "",
      no_of_containers: "",
      gross_weight: "",
      gross_weight_kg: "", // Schema field
      net_weight: "",
      net_weight_kg: "", // Schema field
      volume: "",
      volume_cbm: "", // Schema field
      chargeable_weight: "",
      marks_nos: "",
      marks_and_numbers: "", // Schema field

      // Additional General Tab fields - EMPTY DEFAULTS
      dbk_bank: "",
      dbk_ac: "",
      dbk_edi_ac: "",
      ref_type: "",
      exporter_ref_no: "",
      exporter_type: "",
      sb_number_date: "",
      shipping_bill_number: "", // Schema field
      shipping_bill_date: "", // Schema field
      rbi_app_no: "",
      gr_waived: false,
      gr_no: "",
      rbi_waiver_no: "",
      bank_dealer: "",
      bank_name: "", // Schema field
      ac_number: "",
      bank_account_number: "", // Schema field
      ad_code: "",
      adCode: "", // Schema field
      epz_code: "",
      notify: "",
      notify_party_name: "", // Schema field
      sales_person: "",
      business_dimensions: "",
      quotation: "",

      // Banking fields
      bank_branch: "",
      bank_ifsc_code: "",
      bank_swift_code: "",

      // Additional schema fields
      movement_type: "",
      submission_status: "draft",
      priority_level: "Normal",
      status: "",
      detailed_status: "",

      // Port fields
      port_of_loading: "",
      port_of_origin: "",
      final_destination: "",
      place_of_receipt: "",
      place_of_delivery: "",
      country_of_origin: "India",
      country_of_final_destination: "",

      // Vessel/Flight information
      vessel_flight_name: "",
      voyage_flight_number: "",
      etd_port_of_loading: "",
      eta_port_of_discharge: "",
      actual_departure_date: "",
      actual_arrival_date: "",

      // Carrier Information
      master_bl_awb_number: "",
      master_bl_awb_date: "",
      house_bl_awb_number: "",
      house_bl_awb_date: "",
      booking_number: "",
      booking_date: "",

      // Cargo Information
      commodity_description: "",
      description: "", // Schema field for compatibility
      hs_code: "",
      cth_no: "", // Schema field for compatibility
      package_type: "",
      unit: "", // Schema field for compatibility
      dimensions_length: "",
      dimensions_width: "",
      dimensions_height: "",
      special_instructions: "",

      // Dangerous Goods
      is_dangerous_goods: false,
      un_number: "",
      proper_shipping_name: "",
      hazard_class: "",
      packing_group: "",

      // Commercial Information
      proforma_invoice_number: "",
      proforma_invoice_date: "",
      proforma_invoice_value: "",
      fob_value: "",
      freight_charges: "",
      insurance_charges: "",
      cif_value: "",
      cif_amount: "", // Schema field for compatibility

      // Payment Terms
      payment_terms: "",
      payment_method: "",

      // Letter of Credit
      lc_number: "",
      lc_date: "",
      lc_amount: "",
      lc_expiry_date: "",
      lc_issuing_bank: "",
      lc_advising_bank: "",

      // Regulatory fields
      export_license_required: false,
      export_license_number: "",
      export_license_date: "",
      export_license_validity: "",

      // Container details - EMPTY ARRAYS
      containers: [
        {
          serialNumber: 1,
          containerNo: "",
          sealNo: "",
          sealDate: "",
          type: "",
          pkgsStuffed: 0,
          grossWeight: 0,
          sealType: "",
          moveDocType: "",
          moveDocNo: "",
          location: "",
          grWtPlusTrWt: 0,
          sealDeviceId: "",
          rfid: "",
        },
      ],

      export_charges: [],

      // Product details - EMPTY ARRAYS
      products: [
        {
          serialNumber: 1,
          description: "",
          ritc: "",
          quantity: 0,
          socQuantity: 0,
          unitPrice: 0,
          per: "",
          amount: 0,
          eximCode: "",
          nfeiCategory: "",
          endUse: "",
          ptaFtaInfo: "",
          rewardItem: "",
          strCode: "",
          originDistrict: "",
          originState: "",
          alternateQty: 0,
          materialCode: "",
          medicinalPlant: "",
          formulation: "",
          surfaceMaterialInContact: "",
          labGrownDiamond: "",
          currency: "INR",
          calculationMethod: "",
          percentage: "",
          pmvPerUnit: "",
          totalPMV: "",
          igstPaymentStatus: "",
          taxableValueINR: "",
          igstRate: "",
          igstAmountINR: "",
          compensationCessAmountINR: "",
          rodtepClaim: "",
          rodtepQuantity: "",
          rodtepCapValue: "",
          rodtepCapValuePerUnits: "",
          rodtepUnit: "",
          rodtepRatePercent: "",
          rodtepAmountINR: "",
          sbTypeDetails: "",
          dbkType: "",
          cessExciseDuty: 0,
          compensationCess: 0,

          // PMV Info structured
          pmvInfo: {
            currency: "INR",
            calculationMethod: "",
            pmvPerUnit: 0,
            totalPMV: 0,
          },

          // IGST & Compensation Cess structured
          igstCompensationCess: {
            igstPaymentStatus: "",
            taxableValueINR: 0,
            igstRate: 0,
            igstAmountINR: 0,
            compensationCessAmountINR: 0,
          },

          // RODTEP structured
          rodtepInfo: {
            claim: "",
            quantity: 0,
            capValue: 0,
            capValuePerUnits: 0,
            unit: "",
            ratePercent: 0,
            amountINR: 0,
          },
          areDetails: [
            {
              serialNumber: 1,
              areNumber: "",
              areDate: "",
              commissionerate: "",
              division: "",
              range: "",
              remark: "",
            },
          ],

          reExport: {
            isReExport: { type: Boolean, default: false },
            beNumber: { type: String, trim: true },
            beDate: { type: String, trim: true }, // Or Date, as preferred
            invoiceSerialNo: { type: String, trim: true },
            itemSerialNo: { type: String, trim: true },
            importPortCode: { type: String, trim: true },
            manualBE: { type: Boolean, default: false },
            beItemDescription: { type: String, trim: true },
            quantityExported: { type: Number, default: 0 },
            technicalDetails: { type: String, trim: true },
            inputCreditAvailed: { type: Boolean, default: false },
            personalUseItem: { type: Boolean, default: false },
            otherIdentifyingParameters: { type: String, trim: true },
            againstExportObligation: { type: String, trim: true },
            obligationNo: { type: String, trim: true },
            quantityImported: { type: Number, default: 0 },
            assessableValue: { type: Number, default: 0 },
            totalDutyPaid: { type: Number, default: 0 },
            dutyPaidDate: { type: String, trim: true }, // Or Date
            drawbackAmtClaimed: { type: Number, default: 0 },
            itemUnUsed: { type: Boolean, default: false },
            commissionerPermission: { type: String, trim: true },
            commPermissionDate: { type: String, trim: true }, // Or Date
            boardNumber: { type: String, trim: true },
            modvatAvailed: { type: Boolean, default: false },
            modvatReversed: { type: Boolean, default: false },
          },
          otherDetails: {
            accessories: "",
            accessoriesRemarks: "",
            isThirdPartyExport: false,
            thirdParty: {
              name: "",
              ieCode: "",
              branchSrNo: "",
              regnNo: "",
              address: "",
            },
            manufacturer: {
              name: "",
              code: "",
              address: "",
              country: "",
              stateProvince: "",
              postalCode: "",
              sourceState: "",
              transitCountry: "",
            },
          },
        },
      ],

      drawbackDetails: [
        {
          serialNumber: "1",
          fobValue: 0,
          quantity: 0,
          dbkUnder: "Actual",
          dbkDescription: "",
          dbkRate: 1.5,
          dbkCap: 0,
          dbkAmount: 0,
          percentageOfFobValue: "1.5% of FOB Value",
          isDbkItem: true,
          dbkSrNo: "",
        },
      ],

      cessExpDuty: [
        {
          cessDutyApplicable: false,
          exportDuty: 0,
          exportDutyRate: 0,
          exportDutyTariffValue: 0,
          exportDutyQty: 0,
          exportDutyDesc: "",
          cess: 0,
          cessRate: 0,
          cessTariffValue: 0,
          cessQty: 0,
          cessUnit: "",
          cessDesc: "",
          otherDutyCess: 0,
          otherDutyCessRate: 0,
          otherDutyCessTariffValue: 0,
          otherDutyCessQty: 0,
          otherDutyCessDesc: "",
          thirdCess: 0,
          thirdCessRate: 0,
          thirdCessTariffValue: 0,
          thirdCessQty: 0,
          thirdCessDesc: "",
          cenvat: {
            certificateNumber: "",
            date: "",
            validUpto: "",
            cexOfficeCode: "",
            assesseeCode: "",
          },
        },
      ],

      // Charges information - EMPTY ARRAYS
      charges: [],

      // Documents - EMPTY OBJECT
      documents: {},

      // Other fields
      remarks: "",
      internal_notes: "",
      customer_instructions: "",
      special_requirements: "",
      // Shipment Main Tab Fields - Add to useExportJobDetails.js initialValues
      egm_no: "",
      egm_date: "",
      mbl_no: "",
      mbl_date: "",
      hbl_no: "",
      hbl_date: "",
      pre_carriage_by: "",
      transhipper_code: "",
      gateway_port: "",
      state_of_origin: "",
      annexure_c_details: false,
      package_unit: "BDL",
      gross_weight_unit: "KGS",
      net_weight_unit: "KGS",
      volume_unit: "CBM",

      // Add these Stuffing Details fields to your hook initialValues:
      goods_stuffed_at: "",
      sample_accompanied: false,
      factory_address: "",
      warehouse_code: "",
      stuffing_seal_type: "",
      stuffing_seal_no: "",
      stuffing_agency_name: "",
      stuffing_date: "",
      stuffing_time: "",
      stuffing_supervisor: "",
      stuffing_remarks: "",
      // Add these Shipping Bill Printing fields to your hook initialValues:
      oi_cert_details: "",
      type_of_shipment: "",
      specify_if_other: "",
      permission_no: "",
      permission_date: "",
      export_under: "",
      sb_heading: "",
      export_trade_control: "",
      sb_bottom_text: "",
      sb_reference_type: "",
      sb_reference_number: "",
      sb_additional_notes: "",

      // Add these Annex C1 Details fields to your hook initialValues:
      ie_code_of_eou: "",
      branch_sr_no: "",
      examination_date: "",
      examining_officer: "",
      supervising_officer: "",
      commissionerate: "",
      verified_by_examining_officer: false,
      annex_seal_number: "",
      annex_designation: "",
      annex_designation_2: "",
      annex_division: "",
      annex_range: "",
      sample_forwarded: false,
      annex_additional_notes: "",
      annex_c1_documents: [],

      // Add these Exchange Rate fields to your hook initialValues:
      exchange_rates: [
        {
          code: "INR",
          custom_exch_rate: "1.000000",
          non_std_cur: "",
          ex_rate: "1.000000",
          ex_rate_revenue: "1.000000",
          agent_ex_rate: "0.000000",
          cfx: "0.000000",
          ex_rate_cost: "0.000000",
          ex_rate_cost_revenue: "1.000000",
        },
        {
          code: "USD",
          custom_exch_rate: "87.300000",
          non_std_cur: "",
          ex_rate: "90.000000",
          ex_rate_revenue: "90.000000",
          agent_ex_rate: "0.000000",
          cfx: "0.000000",
          ex_rate_cost: "0.000000",
          ex_rate_cost_revenue: "90.000000",
        },
      ],
      last_rate_update_date: "",
      default_currency: "USD",
      auto_update_interval: "24",
      rate_source: "",
      rate_remarks: "",
    },

    // Add to initialValues:
    eSanchitDocuments: [
      {
        documentLevel: "",
        invSerialNo: "",
        itemSerialNo: "",
        irn: "",
        documentType: "",
        documentReferenceNo: "",
        otherIcegateId: "",
        icegateFilename: "",
        dateOfIssue: "",
        placeOfIssue: "",
        expiryDate: "",
        dateTimeOfUpload: "",
        issuingParty: {
          name: "",
          code: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          pinCode: "",
        },
        beneficiaryParty: {
          name: "",
          addressLine1: "",
          city: "",
          pinCode: "",
        },
      },
    ],

    ar_invoices: [
      {
        date: "16-Sep-2025",
        bill_no: "GEA/123/25-26",
        type: "INV",
        organization: "LAXCON STEELS LTD - EX..",
        currency: "INR",
        amount: 2065.0,
        balance: "",
      },
      {
        date: "16-Sep-2025",
        bill_no: "GE6/123/25-26",
        type: "INV",
        organization: "LAXCON STEELS LTD - EX..",
        currency: "INR",
        amount: 1.0,
        balance: "",
      },
    ],
    total_ar_amount: "",
    outstanding_balance: "",
    ar_default_currency: "INR",
    ar_payment_terms_days: "30",
    ar_last_updated: "",
    ar_notes: "",

    // AP Invoices fields
    ap_invoices: [],
    total_ap_amount: 0,
    ap_outstanding_balance: 0,
    ap_default_currency: "INR",
    ap_payment_terms_days: 30,
    ap_last_updated: "",
    ap_notes: "",

    // Add to initialValues:
    payment_requests: [],

    // Add to initialValues:
    job_tracking_completed: "",
    customer_remark: "Ready for Billing",
    workflow_location: "All Locations",
    shipment_type: "International",
    milestones: [
      {
        milestoneName: "SB Filed",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "15-Sep-2025 15:45",
        isCompleted: true,
        isMandatory: true,
        completedBy: "",
        remarks: "",
      },
      {
        milestoneName: "SB Receipt",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "15-Sep-2025 15:51",
        isCompleted: true,
        isMandatory: true,
        completedBy: "",
        remarks: "",
      },
      {
        milestoneName: "L.E.O",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "15-Sep-2025 18:15",
        isCompleted: true,
        isMandatory: true,
        completedBy: "",
        remarks: "",
      },
      {
        milestoneName: "Container HO to Concor",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "16-Sep-2025 13:47",
        isCompleted: true,
        isMandatory: true,
        completedBy: "",
        remarks: "",
      },
      {
        milestoneName: "Rail Out",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "dd-mmm-yyyy hh:mm",
        isCompleted: false,
        isMandatory: false,
        completedBy: "",
        remarks: "",
      },
      {
        milestoneName: "Ready for Billing",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "16-Sep-2025 13:47",
        isCompleted: true,
        isMandatory: true,
        completedBy: "",
        remarks: "",
      },
      {
        milestoneName: "Billing Done",
        planDate: "dd-MMM-yyyy HH:mm",
        actualDate: "dd-mmm-yyyy hh:mm",
        isCompleted: false,
        isMandatory: false,
        completedBy: "",
        remarks: "",
      },
    ],
    milestone_remarks: "",
    milestone_view_upload_documents: "",
    milestone_handled_by: "",
    // Add to initialValues:
    charges: [
      {
        chargeHead: "EDI CHARGES",
        category: "Margin",
        costCenter: "CCL EXP",
        remark: "",
        revenue: {
          basis: "Per S/B",
          qtyUnit: 1.0,
          rate: 1.0,
          amount: 1.0,
          amountINR: 1.0,
          curr: "INR",
          ovrd: false,
          paid: false,
        },
        cost: {
          basis: "Per S/B",
          qtyUnit: 0,
          rate: 0,
          amount: 0,
          amountINR: 0,
          curr: "INR",
          ovrd: false,
          paid: false,
        },
        chargeDescription: "",
        overrideAutoRate: false,
        receivableType: "Customer",
        receivableFrom: "LAXCON STEELS LTD - EXPORT",
        receivableFromBranchCode: "0",
        copyToCost: false,
        quotationNo: "",
      },
    ],

    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        const updatePayload = {
          ...values,
          updatedAt: new Date(),
        };

        console.log("Submitting update payload:", updatePayload);

        const response = await axios.put(
          `${import.meta.env.VITE_API_STRING}/export-jobs/${params.year}/${
            params.job_no
          }`,
          updatePayload,
          { headers }
        );

        console.log("Update response:", response.data);

        if (setFileSnackbar) {
          setFileSnackbar(true);
          setTimeout(() => setFileSnackbar(false), 3000);
        }

        setTimeout(() => {
          window.close();
        }, 500);
      } catch (error) {
        console.error("Error updating export job:", error);
        throw error;
      }
    },
  });

  // Update formik initial values when data is fetched - COMPREHENSIVE MAPPING
  useEffect(() => {
    if (data) {
      console.log("Setting formik values with data:", data);

      formik.setValues({
        // Basic job info - Map from API response
        job_no: safeValue(data.job_no),
        year: safeValue(data.year),
        filing_mode: safeValue(data.filing_mode),
        shipper: safeValue(data.shipper || data.exporter_name || data.exporter),
        job_date: safeValue(data.job_date),
        jobReceivedOn: safeValue(data.jobReceivedOn),
        sb_no: safeValue(data.sb_no || data.shipping_bill_number),
        sb_type: safeValue(data.sb_type),
        transportMode: safeValue(data.transportMode),
        custom_house: safeValue(data.custom_house || data.customs_house),
        consignment_type: safeValue(data.consignment_type),
        job_owner: safeValue(data.job_owner),

        // Exporter details - Comprehensive mapping
        exporter_name: safeValue(data.exporter_name || data.exporter),
        exporter: safeValue(data.exporter || data.exporter_name),
        exporter_address: safeValue(data.exporter_address),
        exporter_city: safeValue(data.exporter_city),
        exporter_state: safeValue(data.exporter_state || data.state),
        exporter_country: safeValue(data.exporter_country || "India"),
        branch_code: safeValue(data.branch_code),
        branch_sno: safeValue(data.branch_sno),
        branchSrNo: safeValue(data.branchSrNo || data.branch_sno),
        state: safeValue(data.state || data.exporter_state),
        ie_code_no: safeValue(data.ie_code_no || data.ie_code),
        ie_code: safeValue(data.ie_code || data.ie_code_no),
        regn_no: safeValue(data.regn_no || data.exporter_gstin),
        exporter_gstin: safeValue(data.exporter_gstin || data.regn_no),
        gstin: safeValue(data.gstin),
        exporter_pan: safeValue(data.exporter_pan),

        // Banking details - Map multiple possible fields
        bank_dealer: safeValue(data.bank_dealer || data.bank_name),
        bank_name: safeValue(data.bank_name || data.bank_dealer),
        ac_number: safeValue(data.ac_number || data.bank_account_number),
        bank_account_number: safeValue(
          data.bank_account_number || data.ac_number
        ),
        ad_code: safeValue(data.ad_code || data.adCode),
        adCode: safeValue(data.adCode || data.ad_code),
        bank_branch: safeValue(data.bank_branch),
        bank_ifsc_code: safeValue(data.bank_ifsc_code),
        bank_swift_code: safeValue(data.bank_swift_code),

        // General tab specific fields
        dbk_bank: safeValue(data.dbk_bank),
        dbk_ac: safeValue(data.dbk_ac),
        dbk_edi_ac: safeValue(data.dbk_edi_ac),
        ref_type: safeValue(data.ref_type),
        exporter_ref_no: safeValue(data.exporter_ref_no),
        exporter_type: safeValue(data.exporter_type),
        sb_number_date: safeValue(
          data.sb_number_date ||
            `${data.shipping_bill_number} | ${data.shipping_bill_date}`
        ),
        shipping_bill_number: safeValue(
          data.shipping_bill_number || data.sb_no
        ),
        shipping_bill_date: safeValue(data.shipping_bill_date),
        rbi_app_no: safeValue(data.rbi_app_no),
        gr_waived: safeValue(data.gr_waived, false),
        gr_no: safeValue(data.gr_no),
        rbi_waiver_no: safeValue(data.rbi_waiver_no),
        epz_code: safeValue(data.epz_code),
        notify: safeValue(data.notify),
        notify_party_name: safeValue(data.notify_party_name || data.notify),
        sales_person: safeValue(data.sales_person),
        business_dimensions: safeValue(data.business_dimensions),
        quotation: safeValue(data.quotation),

        // Consignee details - Map all variants
        consignee_name: safeValue(data.consignee_name),
        consignee_address: safeValue(data.consignee_address),
        consignee_city: safeValue(data.consignee_city),
        consignee_state: safeValue(data.consignee_state),
        consignee_country: safeValue(data.consignee_country),
        buyer_other_than_consignee: safeValue(
          data.buyer_other_than_consignee,
          false
        ),

        // Invoice details - Multiple mappings
        invoice_number: safeValue(
          data.invoice_number || data.commercial_invoice_number
        ),
        commercial_invoice_number: safeValue(
          data.commercial_invoice_number || data.invoice_number
        ),
        invoice_date: safeValue(
          data.invoice_date || data.commercial_invoice_date
        ),
        commercial_invoice_date: safeValue(
          data.commercial_invoice_date || data.invoice_date
        ),
        product_value_usd: safeValue(
          data.product_value_usd || data.commercial_invoice_value
        ),
        commercial_invoice_value: safeValue(
          data.commercial_invoice_value || data.product_value_usd
        ),
        terms_of_invoice: safeValue(data.terms_of_invoice || data.incoterms),
        // incoterms: safeValue(data.incoterms || data.terms_of_invoice),
        currency: safeValue(data.currency || data.invoice_currency),
        invoice_currency: safeValue(data.invoice_currency || data.currency),
        exchange_rate: safeValue(data.exchange_rate),
        invoice_value: safeValue(data.invoice_value),
        product_value_fob: safeValue(data.product_value_fob),
        packing_fob: safeValue(data.packing_fob),
        export_charges: safeValue(data.export_charges),
        buyerThirdPartyInfo: safeValue(data.buyerThirdPartyInfo, {
          buyer: {
            name: "",
            addressLine1: "",
            city: "",
            pin: "",
            country: "",
            state: "",
          },
          thirdParty: {
            isThirdPartyExport: false,
            name: "",
            address: "",
            city: "",
            pin: "",
            country: "",
            state: "",
          },
          manufacturer: {
            name: "",
            ieCode: "",
            branchSerialNo: "",
            registrationNo: "",
            address: "",
            country: "",
            stateProvince: "",
            postalCode: "",
            sourceState: "",
            transitCountry: "",
          },
        }),

        otherInfo: safeValue(data.otherInfo, {
          exportContractNoDate: "",
          natureOfPayment: "Letter Of Credit",
          paymentPeriod: 0,
          aeoCode: "",
          aeoCountry: "",
          aeoRole: "",
        }),

        // Shipping details - Comprehensive mapping
        discharge_port: safeValue(
          data.discharge_port || data.port_of_discharge
        ),
        port_of_discharge: safeValue(
          data.port_of_discharge || data.discharge_port
        ),
        discharge_country: safeValue(
          data.discharge_country || data.consignee_country
        ),
        destination_port: safeValue(data.destination_port),
        destination_country: safeValue(data.destination_country),
        shipping_line: safeValue(
          data.shipping_line || data.shipping_line_airline
        ),
        shipping_line_airline: safeValue(
          data.shipping_line_airline || data.shipping_line
        ),
        vessel_sailing_date: safeValue(
          data.vessel_sailing_date || data.vessel_departure_date
        ),
        vessel_departure_date: safeValue(
          data.vessel_departure_date || data.vessel_sailing_date
        ),
        voyage_no: safeValue(data.voyage_no),
        nature_of_cargo: safeValue(data.nature_of_cargo),
        total_no_of_pkgs: safeValue(
          data.total_no_of_pkgs || data.total_packages
        ),
        total_packages: safeValue(data.total_packages || data.total_no_of_pkgs),
        loose_pkgs: safeValue(data.loose_pkgs),
        no_of_containers: safeValue(data.no_of_containers),
        gross_weight: safeValue(data.gross_weight || data.gross_weight_kg),
        gross_weight_kg: safeValue(data.gross_weight_kg || data.gross_weight),
        net_weight: safeValue(data.net_weight || data.net_weight_kg),
        net_weight_kg: safeValue(data.net_weight_kg || data.net_weight),
        volume: safeValue(data.volume || data.volume_cbm),
        volume_cbm: safeValue(data.volume_cbm || data.volume),
        chargeable_weight: safeValue(data.chargeable_weight),
        marks_nos: safeValue(data.marks_nos || data.marks_and_numbers),
        marks_and_numbers: safeValue(data.marks_and_numbers || data.marks_nos),

        // Additional schema fields
        movement_type: safeValue(data.movement_type),
        submission_status: safeValue(data.submission_status, "draft"),
        priority_level: safeValue(
          data.priority_level || data.priorityJob,
          "Normal"
        ),
        status: safeValue(data.status),
        detailed_status: safeValue(data.detailed_status),

        // Port fields
        port_of_origin: safeValue(data.port_of_origin),
        final_destination: safeValue(data.final_destination),
        place_of_receipt: safeValue(data.place_of_receipt),
        place_of_delivery: safeValue(data.place_of_delivery),
        country_of_final_destination: safeValue(
          data.country_of_final_destination
        ),

        // Vessel/Flight information
        vessel_flight_name: safeValue(data.vessel_flight_name),
        voyage_flight_number: safeValue(data.voyage_flight_number),
        etd_port_of_loading: safeValue(data.etd_port_of_loading),
        eta_port_of_discharge: safeValue(data.eta_port_of_discharge),
        actual_departure_date: safeValue(data.actual_departure_date),
        actual_arrival_date: safeValue(data.actual_arrival_date),

        // Carrier Information
        master_bl_awb_number: safeValue(
          data.master_bl_awb_number || data.awb_bl_no
        ),
        master_bl_awb_date: safeValue(
          data.master_bl_awb_date || data.awb_bl_date
        ),
        house_bl_awb_number: safeValue(
          data.house_bl_awb_number || data.hawb_hbl_no
        ),
        house_bl_awb_date: safeValue(
          data.house_bl_awb_date || data.hawb_hbl_date
        ),
        booking_number: safeValue(data.booking_number),
        booking_date: safeValue(data.booking_date),

        // Cargo Information
        commodity_description: safeValue(
          data.commodity_description || data.description
        ),
        description: safeValue(data.description || data.commodity_description),
        hs_code: safeValue(data.hs_code || data.cth_no),
        cth_no: safeValue(data.cth_no || data.hs_code),
        package_type: safeValue(data.package_type || data.unit),
        unit: safeValue(data.unit || data.package_type),
        dimensions_length: safeValue(data.dimensions_length),
        dimensions_width: safeValue(data.dimensions_width),
        dimensions_height: safeValue(data.dimensions_height),
        special_instructions: safeValue(data.special_instructions),

        // Commercial Information
        proforma_invoice_number: safeValue(data.proforma_invoice_number),
        proforma_invoice_date: safeValue(data.proforma_invoice_date),
        proforma_invoice_value: safeValue(data.proforma_invoice_value),
        fob_value: safeValue(data.fob_value),
        freight_charges: safeValue(data.freight_charges),
        insurance_charges: safeValue(data.insurance_charges),
        cif_value: safeValue(data.cif_value || data.cif_amount),
        cif_amount: safeValue(data.cif_amount || data.cif_value),

        // Arrays and objects
        containers: safeValue(data.containers, []),
        products: safeValue(data.products, []),
        charges: safeValue(data.charges, []),
        documents: safeValue(data.documents, {}),
        drawbackDetails: safeValue(data.drawbackDetails, []),
        cessExpDuty: safeValue(data.cessExpDuty, {}),
        areDetails: safeValue(data.areDetails, []),

        // Other fields
        remarks: safeValue(data.remarks),
        internal_notes: safeValue(data.internal_notes),
        customer_instructions: safeValue(data.customer_instructions),
        special_requirements: safeValue(data.special_requirements),
        // Add these to your formik.setValues mapping:
        goods_stuffed_at: safeValue(data.goods_stuffed_at),
        sample_accompanied: safeValue(data.sample_accompanied, false),
        factory_address: safeValue(data.factory_address),
        warehouse_code: safeValue(data.warehouse_code),
        stuffing_seal_type: safeValue(data.stuffing_seal_type),
        stuffing_seal_no: safeValue(data.stuffing_seal_no),
        stuffing_agency_name: safeValue(data.stuffing_agency_name),
        stuffing_date: safeValue(data.stuffing_date),
        stuffing_time: safeValue(data.stuffing_time),
        stuffing_supervisor: safeValue(data.stuffing_supervisor),
        stuffing_remarks: safeValue(data.stuffing_remarks),

        // Add these to your formik.setValues mapping:
        oi_cert_details: safeValue(data.oi_cert_details),
        type_of_shipment: safeValue(data.type_of_shipment),
        specify_if_other: safeValue(data.specify_if_other),
        permission_no: safeValue(data.permission_no),
        permission_date: safeValue(data.permission_date),
        export_under: safeValue(data.export_under),
        sb_heading: safeValue(data.sb_heading),
        export_trade_control: safeValue(data.export_trade_control),
        sb_bottom_text: safeValue(data.sb_bottom_text),
        sb_reference_type: safeValue(data.sb_reference_type),
        sb_reference_number: safeValue(data.sb_reference_number),
        sb_additional_notes: safeValue(data.sb_additional_notes),

        // Add these to your formik.setValues mapping:
        ie_code_of_eou: safeValue(data.ie_code_of_eou),
        branch_sr_no: safeValue(data.branch_sr_no),
        examination_date: safeValue(data.examination_date),
        examining_officer: safeValue(data.examining_officer),
        supervising_officer: safeValue(data.supervising_officer),
        commissionerate: safeValue(data.commissionerate),
        verified_by_examining_officer: safeValue(
          data.verified_by_examining_officer,
          false
        ),
        annex_seal_number: safeValue(data.annex_seal_number),
        annex_designation: safeValue(data.annex_designation),
        annex_designation_2: safeValue(data.annex_designation_2),
        annex_division: safeValue(data.annex_division),
        annex_range: safeValue(data.annex_range),
        sample_forwarded: safeValue(data.sample_forwarded, false),
        annex_additional_notes: safeValue(data.annex_additional_notes),
        annex_c1_documents: safeValue(data.annex_c1_documents, []),

        // Add these to your formik.setValues mapping:
        exchange_rates: safeValue(data.exchange_rates, [
          {
            code: "INR",
            custom_exch_rate: "1.000000",
            non_std_cur: "",
            ex_rate: "1.000000",
            ex_rate_revenue: "1.000000",
            agent_ex_rate: "0.000000",
            cfx: "0.000000",
            ex_rate_cost: "0.000000",
            ex_rate_cost_revenue: "1.000000",
          },
          {
            code: "USD",
            custom_exch_rate: "87.300000",
            non_std_cur: "",
            ex_rate: "90.000000",
            ex_rate_revenue: "90.000000",
            agent_ex_rate: "0.000000",
            cfx: "0.000000",
            ex_rate_cost: "0.000000",
            ex_rate_cost_revenue: "90.000000",
          },
        ]),
        last_rate_update_date: safeValue(data.last_rate_update_date),
        default_currency: safeValue(data.default_currency),
        auto_update_interval: safeValue(data.auto_update_interval),
        rate_source: safeValue(data.rate_source),
        rate_remarks: safeValue(data.rate_remarks),
        ar_invoices: safeValue(data.ar_invoices, []),
        total_ar_amount: safeValue(data.total_ar_amount),
        outstanding_balance: safeValue(data.outstanding_balance),
        ar_default_currency: safeValue(data.ar_default_currency),
        ar_payment_terms_days: safeValue(data.ar_payment_terms_days),
        ar_last_updated: safeValue(data.ar_last_updated),
        ar_notes: safeValue(data.ar_notes),

        // AP Invoices - Map from API response
        ap_invoices: safeValue(data.ap_invoices, []),
        total_ap_amount: safeValue(data.total_ap_amount, 0),
        ap_outstanding_balance: safeValue(data.ap_outstanding_balance, 0),
        ap_default_currency: safeValue(data.ap_default_currency, "INR"),
        ap_payment_terms_days: safeValue(data.ap_payment_terms_days, 30),
        ap_last_updated: safeValue(data.ap_last_updated),
        ap_notes: safeValue(data.ap_notes),

        payment_requests: safeValue(data.payment_requests, []),

        job_tracking_completed: safeValue(data.job_tracking_completed),
        customer_remark: safeValue(data.customer_remark, "Ready for Billing"),
        workflow_location: safeValue(data.workflow_location, "All Locations"),
        shipment_type: safeValue(data.shipment_type, "International"),
        milestones: safeValue(data.milestones, []),
        milestone_remarks: safeValue(data.milestone_remarks),
        milestone_view_upload_documents: safeValue(
          data.milestone_view_upload_documents
        ),
        milestone_handled_by: safeValue(data.milestone_handled_by),
        charges: safeValue(data.charges, []),

        eSanchitDocuments: safeValue(data.eSanchitDocuments, []),

        // Add these Financial AR Invoices fields to your hook initialValues:
        ar_invoices: [
          {
            date: "16-Sep-2025",
            bill_no: "GEA/123/25-26",
            type: "INV",
            organization: "LAXCON STEELS LTD - EX..",
            currency: "INR",
            amount: 2065.0,
            balance: "",
          },
          {
            date: "16-Sep-2025",
            bill_no: "GE6/123/25-26",
            type: "INV",
            organization: "LAXCON STEELS LTD - EX..",
            currency: "INR",
            amount: 1.0,
            balance: "",
          },
        ],
        total_ar_amount: "",
        outstanding_balance: "",
        ar_default_currency: "INR",
        ar_payment_terms_days: "30",
        ar_last_updated: "",
        ar_notes: "",
      });
    }
  }, [data]);

  return {
    data,
    loading,
    formik,
    setData,
  };
}

export default useExportJobDetails;
