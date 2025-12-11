import { useEffect, useState } from "react";
import axios from "axios";
import { useFormik } from "formik";

function useExportJobDetails(params, setFileSnackbar) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const emptyConsignee = {
    consignee_name: "",
    consignee_address: "",
    consignee_country: "",
  };

  const [consignees, setConsignees] = useState([{ ...emptyConsignee }]);

  // Fetch export job data
  useEffect(() => {
    async function getExportJobDetails() {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/export-jobs/${encodeURIComponent(
            params.job_no
          )}`
        );
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

    if (params.job_no) {
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
      // Basic job info
      job_no: "",
      year: "",
      custom_house: "",
      job_date: "",
      exporter: "",
      description: "",
      sb_no: "",
      consignmentType: "",
      shipping_line_airline: "",
      branchSrNo: "",
      adCode: "",
      bank_name: "",
      ieCode: "",
      branch_index: "",
      exporter_ref_no: "",
      shipper: "",
      sb_type: "",
      transportMode: "",
      exporter_type: "",
      isBuyer: false,
      // Exporter Additional Fields
      branch_sno: "",
      regn_no: "",
      gstin: "",
      state: "",

      // Reference & Regulatory Fields
      sb_date: "",
      rbi_app_no: "",
      gr_waived: false,
      gr_no: "",
      rbi_waiver_no: "",
      notify: "",

      // Commercial Fields
      currency: "",

      // Enhanced Shipping Fields
      discharge_port: "",
      discharge_country: "",
      destination_port: "",
      destination_country: "",
      egm_no: "",
      egm_date: "",
      mbl_date: "",
      hbl_date: "",
      hbl_no: "",
      mbl_no: "",
      transhipper_code: "",
      pre_carriage_by: "",
      gateway_port: "",
      state_of_origin: "",
      vessel_sailing_date: "",
      voyage_no: "",
      nature_of_cargo: "",
      total_no_of_pkgs: "",
      loose_pkgs: "",
      no_of_containers: "",
      marks_nos: "",
      goods_stuffed_at: "",
      sample_accompanied: false,
      factory_address: "",
      warehouse_code: "",
      stuffing_seal_type: "",
      stuffing_seal_no: "",
      stuffing_agency_name: "",
      // Boolean Control Fields
      buyer_other_than_consignee: false,

      status: "",
      // Add these fields in the appropriate section (around the shipping/cargo details)
      package_unit: "",
      gross_weight_kg: "",
      gross_weight_unit: "",
      net_weight_kg: "",
      net_weight_unit: "",
      volume_cbm: "",
      volume_unit: "",
      chargeable_weight: "",
      chargeable_weight_unit: "",

      // Exporter Information
      exporter_address: "",
      exporter_state: "",
      exporter_country: "India",
      exporter_pincode: "",
      exporter_phone: "",
      exporter_email: "",
      exporter_fax: "",
      exporter_website: "",
      branch_code: "",

      // Regulatory Information
      ieCode: "",
      exporter_pan: "",
      exporter_gstin: "",
      exporter_tan: "",
      ad_code: "",

      // Banking Information
      bank_account_number: "",
      bank_ifsc_code: "",
      bank_swift_code: "",

      // Consignee/Importer Information
      consignees: [
        {
          consignee_name: "",
          consignee_address: "",
          consignee_country: "",
        },
      ],

      // Shipment Details
      port_of_loading: "",
      port_of_discharge: "",
      final_destination: "",
      place_of_receipt: "",
      place_of_delivery: "",

      // Invoice Details
      exchange_rate: "",

      // Containers Information
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
          grWtPlusTrWt: 0,
          sealDeviceId: "",
          rfid: "",
        },
      ],

      // Charges and Financial
      remarks: "",

      // Job Assignment
      job_owner: "",

      // Multiple Invoices
      invoices: [
        {
          invoiceNumber: "",
          invoiceDate: "",
          termsOfInvoice: "FOB",
          toiPlace: "",
          currency: "",
          invoiceValue: 0,
          productValue: 0,
          priceIncludes: "Both",
          invoice_value: 0,
          product_value_fob: 0,
          packing_fob: 0,
        },
      ],

      // Buyer and Third Party Information
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

      // Other Information
      otherInfo: {
        exportContractNoDate: "",
        natureOfPayment: "Letter Of Credit",
        paymentPeriod: 0,
        aeoCode: "",
        aeoCountry: "IN",
        aeoRole: "",
      },

      // Annex C1 Details - Individual Fields
      ie_code_of_eou: "",
      branch_sr_no: 0,
      examination_date: "",
      examining_officer: "",
      supervising_officer: "",
      commissionerate: "",
      verified_by_examining_officer: false,
      annex_seal_number: "",
      annex_designation: "",
      annex_division: "",
      annex_range: "",
      sample_forwarded: false,
      annex_c1_documents: [],

      // Annex C1 Details - Structured Object
      annexC1Details: {
        ieCodeOfEOU: "",
        branchSerialNo: 0,
        examinationDate: "",
        examiningOfficer: "",
        supervisingOfficer: "",
        commissionerate: "",
        verifiedByExaminingOfficer: false,
        sealNumber: "",
        documents: [],
        designation: "",
        division: "",
        range: "",
        sampleForwarded: false,
      },

      // Freight, Insurance & Other Charges
      freightInsuranceCharges: {
        freight: {
          currency: "",
          exchangeRate: 0,
          rate: 0,
          baseValue: 0,
          amount: 0,
        },
        insurance: {
          currency: "",
          exchangeRate: 0,
          rate: 0,
          baseValue: 0,
          amount: 0,
        },
        discount: {
          currency: "",
          exchangeRate: 0,
          rate: 0,
          amount: 0,
        },
        otherDeduction: {
          currency: "",
          exchangeRate: 0,
          rate: 0,
          amount: 0,
        },
        commission: {
          currency: "",
          exchangeRate: 0,
          rate: 0,
          amount: 0,
        },
        fobValue: {
          currency: "",
          amount: 0,
        },
      },

      // Charges and Billing
      charges: [
        {
          chargeHead: "",
          category: "Margin",
          costCenter: "CCL EXP",
          remark: "",
          revenue: {
            basis: "Per S/B",
            qtyUnit: 0,
            rate: 0,
            amount: 0,
            amountINR: 0,
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
          receivableFrom: "",
          receivableFromBranchCode: "",
          copyToCost: false,
          quotationNo: "",
        },
      ],

      // AR Invoices
      arInvoices: [
        {
          date: "",
          billNo: "",
          type: "INV",
          organization: "",
          currency: "INR",
          amount: 0,
          balance: 0,
          vendorBillNo: "",
        },
      ],

      // eSanchit Documents
      eSanchitDocuments: [
        {
          documentLevel: "",
          scope: "",
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
          fileUrl: "",
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
            code: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            pinCode: "",
          },
        },
      ],

      // Milestone Tracking
      milestones: [
        {
          milestoneName: "",
          planDate: "",
          actualDate: "",
          isCompleted: false,
          isMandatory: false,
          completedBy: "",
          remarks: "",
        },
      ],

      // Product Details
      products: [
        {
          serialNumber: "",
          description: "",
          ritc: "",
          quantity: "",
          qtyUnit: "",
          socQuantity: "",
          socunit: "",
          unitPrice: "",
          priceUnit: "",
          per: "",
          amount: "",
          amountUnit: "",
          eximCode: "",
          nfeiCategory: "",
          rewardItem: false,
          strCode: "",
          endUse: "",
          originDistrict: "",
          originState: "",
          ptaFtaInfo: "",
          alternateQty: "0",
          materialCode: "",
          medicinalPlant: "",
          formulation: "",
          surfaceMaterialInContact: "",
          labGrownDiamond: "",

          pmvInfo: {
            currency: "",
            calculationMethod: "percentage",
            percentage: "110",
            pmvPerUnit: "0",
            totalPMV: "0",
          },

          igstCompensationCess: {
            igstPaymentStatus: "LUT",
            taxableValueINR: "0",
            igstRate: "0",
            igstAmountINR: "0",
            compensationCessRate: "0",
            compensationCessAmountINR: "0",
          },

          rodtepInfo: {
            claim: "Yes",
            quantity: "0",
            ratePercent: "0",
            capValue: "0",
            capValuePerUnits: "0",
            amountINR: "0",
            unit: "",
            capUnit: "",
          },

          cessExpDuty: {
            cessDutyApplicable: false,
            exportDutyCode: "",
            exportDuty: 0,
            exportDutyRate: 0,
            exportDutyRateUnit: "",
            exportDutyTariffValue: 0,
            exportDutyTariffFactor: 0,
            exportDutyQty: 0,
            exportDutyDesc: "",
            cessCode: "",
            cess: 0,
            cessRate: 0,
            cessRateUnit: "",
            cessTariffValue: 0,
            cessTariffFactor: 0,
            cessQty: 0,
            cessDesc: "",
            otherDutyCessCode: "",
            otherDutyCess: 0,
            otherDutyCessRate: 0,
            otherDutyCessRateUnit: "",
            otherDutyCessTariffValue: 0,
            otherDutyCessTariffFactor: 0,
            otherDutyCessQty: 0,
            otherDutyCessDesc: "",
            tariffValue_tv: 0,
            tariffUnit_tv: "",
            thirdCessCode: "",
            thirdCess: 0,
            thirdCessRate: 0,
            thirdCessRateUnit: "",
            thirdCessTariffValue: 0,
            thirdCessTariffFactor: 0,
            thirdCessQty: 0,
            thirdCessDesc: "",
            cessUnit: "",
            cenvat: {
              certificateNumber: "",
              date: "",
              validUpto: "",
              cexOfficeCode: "",
              assesseeCode: "",
            },
          },

          reExport: {
            isReExport: false,
            beNumber: "",
            beDate: "",
            invoiceSerialNo: "",
            itemSerialNo: "",
            importPortCode: "",
            manualBE: false,
            beItemDescription: "",
            quantityImported: 0,
            qtyImportedUnit: "",
            assessableValue: 0,
            totalDutyPaid: 0,
            dutyPaidDate: "",
            quantityExported: 0,
            qtyExportedUnit: "",
            technicalDetails: "",
            inputCreditAvailed: false,
            personalUseItem: false,
            otherIdentifyingParameters: "",
            againstExportObligation: false,
            obligationNo: "",
            drawbackAmtClaimed: 0,
            itemUnUsed: false,
            commissionerPermission: false,
            boardNumber: "",
            boardDate: "",
            modvatAvailed: false,
            modvatReversed: false,
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

          deecDetails: {
            isDeecItem: false,
            itemSnoPartE: "",
            exportQtyUnderLicence: 0,
            deecItems: [
              {
                serialNumber: 1,
                itemSnoPartC: "",
                description: "",
                quantity: 0,
                unit: "",
                itemType: "Indigenous",
              },
            ],
            deec_reg_obj: [
              {
                licRefNo: "",
                regnNo: "",
                licDate: "",
              },
            ],
          },

          epcgDetails: {
            isEpcgItem: false,
            itemSnoPartE: "",
            exportQtyUnderLicence: 0,
            epcgItems: [
              {
                serialNumber: 1,
                itemSnoPartC: "",
                description: "",
                quantity: 0,
                unit: "",
                itemType: "Indigenous",
              },
            ],
            epcg_reg_obj: [
              {
                licRefNo: "",
                regnNo: "",
                licDate: "",
              },
            ],
          },

          sbTypeDetails: "",
          dbkType: "",
          cessExciseDuty: "0",
          compensationCess: "0",
        },
      ],

      // Drawback Details
      drawbackDetails: [
        {
          dbkitem: false,
          dbkSrNo: "",
          fobValue: "",
          quantity: 0,
          dbkUnder: "Actual",
          dbkDescription: "",
          dbkRate: 1.5,
          dbkCap: 0,
          dbkAmount: 0,
          percentageOfFobValue: "1.5% of FOB Value",
        },
      ],

      // Documents
      documents: {},

      // Stuffing Details
      stuffing_date: "",
      stuffing_supervisor: "",
      stuffing_remarks: "",
      cfs: "",

      // CHA Details
      cha: "ABOFS1766LCH005 SURAJ FORWARDERS & SHIPPING AGENCIES",
      masterblno: "",
      houseblno: "",

      // System Fields
      updatedBy: "",
      createdAt: "",
      updatedAt: "",
    },

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

        const syncedValues = {
          ...values,
          annexC1Details: {
            ...values.annexC1Details,
            sealNumber:
              values.stuffing_seal_no || values.annexC1Details?.sealNumber,
          },
          updatedAt: new Date(),
        };

        const response = await axios.put(
          `${import.meta.env.VITE_API_STRING}/export-jobs/${encodeURIComponent(
            params.job_no
          )}`,
          syncedValues,
          { headers }
        );

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

  const getDefaultRegItem = () => ({
    licRefNo: "",
    regnNo: "",
    licDate: "",
  });

  const getDefaultEpcgItem = () => ({
    licRefNo: "",
    regnNo: "",
    licDate: "",
  });

  // Update formik initial values when data is fetched
  useEffect(() => {
    if (data) {
      formik.setValues({
        // Basic job info
        job_no: safeValue(data.job_no),
        year: safeValue(data.year),
        custom_house: safeValue(data.custom_house),
        job_date: safeValue(data.job_date),
        exporter: safeValue(data.exporter),
        description: safeValue(data.description),
        sb_no: safeValue(data.sb_no),
        consignmentType: safeValue(data.consignmentType),
        shipping_line_airline: safeValue(data.shipping_line_airline),
        branchSrNo: safeValue(data.branchSrNo),
        adCode: safeValue(data.adCode),
        bank_name: safeValue(data.bank_name),
        ieCode: safeValue(data.ieCode),
        branch_index: safeValue(data.branch_index),
        exporter_ref_no: safeValue(data.exporter_ref_no),
        shipper: safeValue(data.shipper),
        sb_type: safeValue(data.sb_type),
        transportMode: safeValue(data.transportMode),
        isBuyer: safeValue(data.isBuyer),
        exporter_type: safeValue(data.exporter_type),
        branch_sno: safeValue(data.branch_sno),
        regn_no: safeValue(data.regn_no),
        gstin: safeValue(data.gstin),
        state: safeValue(data.state),
        sb_date: safeValue(data.sb_date),
        rbi_app_no: safeValue(data.rbi_app_no),
        gr_waived: safeValue(data.gr_waived, false),
        gr_no: safeValue(data.gr_no),
        rbi_waiver_no: safeValue(data.rbi_waiver_no),
        notify: safeValue(data.notify),
        currency: safeValue(data.currency),
        discharge_port: safeValue(data.discharge_port),
        discharge_country: safeValue(data.discharge_country),
        destination_port: safeValue(data.destination_port),
        destination_country: safeValue(data.destination_country),
        egm_no: safeValue(data.egm_no),
        egm_date: safeValue(data.egm_date),
        mbl_date: safeValue(data.mbl_date),
        hbl_date: safeValue(data.hbl_date),
        hbl_no: safeValue(data.hbl_no),
        mbl_no: safeValue(data.mbl_no),
        transhipper_code: safeValue(data.transhipper_code),
        pre_carriage_by: safeValue(data.pre_carriage_by),
        gateway_port: safeValue(data.gateway_port),
        state_of_origin: safeValue(data.state_of_origin),
        vessel_sailing_date: safeValue(data.vessel_sailing_date),
        voyage_no: safeValue(data.voyage_no),
        nature_of_cargo: safeValue(data.nature_of_cargo),
        total_no_of_pkgs: safeValue(data.total_no_of_pkgs),
        // Add these lines in the setValues call (around the shipping details section)
        package_unit: safeValue(data.package_unit),
        gross_weight_kg: safeValue(data.gross_weight_kg),
        gross_weight_unit: safeValue(data.gross_weight_unit),
        net_weight_kg: safeValue(data.net_weight_kg),
        net_weight_unit: safeValue(data.net_weight_unit),
        volume_cbm: safeValue(data.volume_cbm),
        volume_unit: safeValue(data.volume_unit),
        chargeable_weight: safeValue(data.chargeable_weight),
        chargeable_weight_unit: safeValue(data.chargeable_weight_unit),
        loose_pkgs: safeValue(data.loose_pkgs),
        no_of_containers: safeValue(data.no_of_containers),
        marks_nos: safeValue(data.marks_nos),
        goods_stuffed_at: safeValue(data.goods_stuffed_at),
        sample_accompanied: safeValue(data.sample_accompanied, false),
        factory_address: safeValue(data.factory_address),
        warehouse_code: safeValue(data.warehouse_code),
        stuffing_seal_type: safeValue(data.stuffing_seal_type),
        stuffing_seal_no: safeValue(data.stuffing_seal_no),
        stuffing_agency_name: safeValue(data.stuffing_agency_name),
        buyer_other_than_consignee: safeValue(
          data.buyer_other_than_consignee,
          false
        ),
        status: safeValue(data.status),
        exporter_address: safeValue(data.exporter_address),
        exporter_state: safeValue(data.exporter_state),
        exporter_country: safeValue(data.exporter_country),
        exporter_pincode: safeValue(data.exporter_pincode),
        exporter_phone: safeValue(data.exporter_phone),
        exporter_email: safeValue(data.exporter_email),
        exporter_fax: safeValue(data.exporter_fax),
        exporter_website: safeValue(data.exporter_website),
        branch_code: safeValue(data.branch_code),
        ieCode: safeValue(data.ieCode),
        exporter_pan: safeValue(data.exporter_pan),
        exporter_gstin: safeValue(data.exporter_gstin),
        exporter_tan: safeValue(data.exporter_tan),
        ad_code: safeValue(data.ad_code),
        bank_account_number: safeValue(data.bank_account_number),
        bank_ifsc_code: safeValue(data.bank_ifsc_code),
        bank_swift_code: safeValue(data.bank_swift_code),
        consignees: safeValue(data.consignees, [emptyConsignee]),
        port_of_loading: safeValue(data.port_of_loading),
        port_of_discharge: safeValue(data.port_of_discharge),
        final_destination: safeValue(data.final_destination),
        place_of_receipt: safeValue(data.place_of_receipt),
        place_of_delivery: safeValue(data.place_of_delivery),
        exchange_rate: safeValue(data.exchange_rate),
        containers: safeValue(data.containers, []),
        remarks: safeValue(data.remarks),
        job_owner: safeValue(data.job_owner),
        invoices: safeValue(data.invoices, []),
        buyerThirdPartyInfo: safeValue(data.buyerThirdPartyInfo, {}),
        otherInfo: safeValue(data.otherInfo, {}),
        annexC1Details: safeValue(data.annexC1Details, {}),
        // Individual fields for form handling
        ie_code_of_eou: safeValue(
          data.ie_code_of_eou || data.annexC1Details?.ieCodeOfEOU
        ),
        branch_sr_no: safeValue(
          data.branch_sr_no || data.annexC1Details?.branchSerialNo,
          0
        ),
        examination_date: safeValue(
          data.examination_date || data.annexC1Details?.examinationDate
        ),
        examining_officer: safeValue(
          data.examining_officer || data.annexC1Details?.examiningOfficer
        ),
        supervising_officer: safeValue(
          data.supervising_officer || data.annexC1Details?.supervisingOfficer
        ),
        commissionerate: safeValue(
          data.commissionerate || data.annexC1Details?.commissionerate
        ),
        verified_by_examining_officer: safeValue(
          data.verified_by_examining_officer ||
            data.annexC1Details?.verifiedByExaminingOfficer,
          false
        ),
        annex_seal_number: safeValue(
          data.annex_seal_number ||
            data.annexC1Details?.sealNumber ||
            data.stuffing_seal_no
        ), // Reference stuffing_seal_no
        annex_designation: safeValue(
          data.annex_designation || data.annexC1Details?.designation
        ),
        annex_division: safeValue(
          data.annex_division || data.annexC1Details?.division
        ),
        annex_range: safeValue(data.annex_range || data.annexC1Details?.range),
        sample_forwarded: safeValue(
          data.sample_forwarded || data.annexC1Details?.sampleForwarded,
          false
        ),
        annex_additional_notes: safeValue(data.annex_additional_notes),
        annex_c1_documents: safeValue(
          data.annex_c1_documents || data.annexC1Details?.documents,
          []
        ),

        // Structured annexC1Details object
        annexC1Details: safeValue(data.annexC1Details, {
          ieCodeOfEOU: safeValue(
            data.ie_code_of_eou || data.annexC1Details?.ieCodeOfEOU
          ),
          branchSerialNo: safeValue(
            data.branch_sr_no || data.annexC1Details?.branchSerialNo,
            0
          ),
          examinationDate: safeValue(
            data.examination_date || data.annexC1Details?.examinationDate
          ),
          examiningOfficer: safeValue(
            data.examining_officer || data.annexC1Details?.examiningOfficer
          ),
          supervisingOfficer: safeValue(
            data.supervising_officer || data.annexC1Details?.supervisingOfficer
          ),
          commissionerate: safeValue(
            data.commissionerate || data.annexC1Details?.commissionerate
          ),
          verifiedByExaminingOfficer: safeValue(
            data.verified_by_examining_officer ||
              data.annexC1Details?.verifiedByExaminingOfficer,
            false
          ),
          sealNumber: safeValue(
            data.stuffing_seal_no ||
              data.annex_seal_number ||
              data.annexC1Details?.sealNumber
          ), // Sync from main seal number
          documents: safeValue(
            data.annex_c1_documents || data.annexC1Details?.documents,
            []
          ),
          designation: safeValue(
            data.annex_designation || data.annexC1Details?.designation
          ),
          division: safeValue(
            data.annex_division || data.annexC1Details?.division
          ),
          range: safeValue(data.annex_range || data.annexC1Details?.range),
          sampleForwarded: safeValue(
            data.sample_forwarded || data.annexC1Details?.sampleForwarded,
            false
          ),
        }),
        freightInsuranceCharges: safeValue(data.freightInsuranceCharges, {}),
        charges: safeValue(data.charges, []),
        arInvoices: safeValue(data.arInvoices, []),
        eSanchitDocuments: safeValue(data.eSanchitDocuments, []),
        milestones: safeValue(data.milestones, []),
        products: safeValue(data.products, []).map((product) => ({
          ...product,
          deecDetails: safeValue(product.deecDetails, {
            isDeecItem: false,
            deecItems: [],
            deec_reg_obj: product.deecDetails?.deec_reg_obj?.length
              ? product.deecDetails.deec_reg_obj
              : [getDefaultRegItem()],
          }),
          epcgDetails: safeValue(product.epcgDetails, {
            isEpcgItem: false,
            epcgItems: [],
            epcg_reg_obj: product.epcgDetails?.epcg_reg_obj?.length
              ? product.epcgDetails.epcg_reg_obj
              : [getDefaultEpcgItem()],
          }),
          cessExpDuty: {
            ...safeValue(product.cessExpDuty, {}),
            cenvat: safeValue(product.cessExpDuty?.cenvat, {}),
          },
        })),
        drawbackDetails: safeValue(data.drawbackDetails, []),
        documents: safeValue(data.documents, {}),
        stuffing_date: safeValue(data.stuffing_date),
        stuffing_supervisor: safeValue(data.stuffing_supervisor),
        stuffing_remarks: safeValue(data.stuffing_remarks),
        cfs: safeValue(data.cfs),
        cha: safeValue(data.cha),
        masterblno: safeValue(data.masterblno),
        houseblno: safeValue(data.houseblno),
        createdBy: safeValue(data.createdBy),
        updatedBy: safeValue(data.updatedBy),
        createdAt: safeValue(data.createdAt),
        updatedAt: safeValue(data.updatedAt),
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
