import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { convertDateFormatForUI } from "../utils/convertDateFormatForUI";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";
// import { Dropdown } from "react-bootstrap";

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

function useFetchJobDetails(
  params,
  checked,
  setSelectedRegNo,
  setTabValue,
  setFileSnackbar,
  storedSearchParams
) {
  const [data, setData] = useState(null);
  const [detentionFrom, setDetentionFrom] = useState([]);
  const navigate = useNavigate();
  const [cthDocuments, setCthDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
    },
    {
      document_name: "Packing List",
      document_code: "271000",
    },
    {
      document_name: "Bill of Lading",
      document_code: "704000",
    },
  ]);

  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  //
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(""); // State for dropdown selection

  // Charges section state
  const [DsrCharges, setDsrCharges] = useState([
    {
      document_name: "Notary",
    },
    {
      document_name: "Duty",
    },
    {
      document_name: "MISC",
    },
    {
      document_name: "CE Certification Charges",
    },
    {
      document_name: "ADC/NOC Charges",
    },
  ]);
  const [selectedChargesDocuments, setSelectedChargesDocuments] = useState([]);
  const [selectedChargesDocument, setSelectedChargesDocument] = useState(""); // State for custom charges dropdown
  const [newChargesDocumentName, setNewChargesDocumentName] = useState("");

  const additionalDocs = [
    // {
    //   document_name: "Pre-Shipment Inspection Certificate",
    //   document_code: "856001",
    // },
    // { document_name: "Form 9 & Form 6", document_code: "856001" },
    // {
    //   document_name: "Registration Document (SIMS/NFMIMS/PIMS)",
    //   document_code: "101000",
    // },
    // { document_name: "Certificate of Analysis", document_code: "001000" },
  ];
  const cth_Dropdown = [
    {
      document_name: "Certificate of Origin",
      document_code: "861000",
    },
    {
      document_name: "Contract",
      document_code: "315000",
    },
    {
      document_name: "Insurance",
      document_code: "91WH13",
    },
    {
      document_name: "Pre-Shipment Inspection Certificate",
      document_code: "856001",
    },
    { document_name: "Form 9 & Form 6", document_code: "0856001" },
    {
      document_name: "Registration Document (SIMS/NFMIMS/PIMS)",
      document_code: "101000",
    },
    { document_name: "Certificate of Analysis", document_code: "001000" },
  ];
  //
  // State variables for form values
  const [jobDetails, setJobDetails] = useState([]);

  const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSTL"];
  const beTypeOptions = ["Home", "In-Bond", "Ex-Bond"];
  const clearanceOptionsMapping = {
    Home: [
      { value: "Full Duty", label: "Full Duty" },
      { value: "DEEC", label: "DEEC" },
      { value: "EPCG", label: "EPCG" },
      { value: "RODTEP", label: "RODTEP" },
      { value: "ROSTL", label: "ROSTL" },
      { value: "TQ", label: "TQ" },
      { value: "SIL", label: "SIL" },
    ],
    "In-Bond": [{ value: "In-Bond", label: "In-Bond" }],
    "Ex-Bond": [
      { value: "Full Duty", label: "Full Duty" },
      { value: "DEEC", label: "DEEC" },
      { value: "EPCG", label: "EPCG" },
      { value: "RODTEP", label: "RODTEP" },
      { value: "ROSTL", label: "ROSTL" },
      { value: "TQ", label: "TQ" },
      { value: "SIL", label: "SIL" },
    ],
  };

  // Fetch job details for Ex-Bond details.
  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_STRING}/jobs/add-job-all-In-bond`
        );
        setJobDetails(response.data);
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }
    fetchJobDetails();
  }, []);

  const commonCthCodes = [
    "72041000",
    "72042920",
    "72042990",
    "72043000",
    "72044900",
    "72042190",
    "74040012",
    "74040022",
    "74040024",
    "74040025",
    "75030010",
    "76020010",
    "78020010",
    "79020010",
    "80020010",
    "81042010",
  ];

  const canEditOrDelete = (doc) => {
    return !(
      cthDocuments.some(
        (d) =>
          d.document_name === doc.document_name &&
          d.document_code === doc.document_code
      ) ||
      additionalDocs.some(
        (d) =>
          d.document_name === doc.document_name &&
          d.document_code === doc.document_code
      ) ||
      commonCthCodes.includes(formik.values.cth_no)
    );
  };

  // Fetch data
  useEffect(() => {
    async function getJobDetails() {
      const response = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-job/${params.selected_year}/${
          params.job_no
        }`
      );
      setData(response.data);
      setSelectedDocuments(response.data.documents);
      setSelectedChargesDocuments(response.data.DsrCharges || []);

      // Update DsrCharges to include custom charges from database
      if (response.data.DsrCharges && response.data.DsrCharges.length > 0) {
        const predefinedCharges = [
          { document_name: "Notary" },
          { document_name: "Duty" },
          { document_name: "MISC" },
          { document_name: "CE Certification Charges" },
          { document_name: "ADC/NOC Charges" },
        ];

        // Get unique custom charges from database (excluding predefined ones)
        const customChargesFromDB = response.data.DsrCharges.filter(
          (charge) =>
            !predefinedCharges.some(
              (predefined) => predefined.document_name === charge.document_name
            )
        ).map((charge) => ({ document_name: charge.document_name }));

        // Remove duplicates by document_name
        const uniqueCustomCharges = customChargesFromDB.filter(
          (charge, index, self) =>
            index ===
            self.findIndex((c) => c.document_name === charge.document_name)
        );

        // Combine predefined and unique custom charges
        const allCharges = [...predefinedCharges, ...uniqueCustomCharges];
        setDsrCharges(allCharges);
      }
    }

    getJobDetails();
  }, [params.importer, params.job_no, params.selected_year]);

  // Fetch documents
  useEffect(() => {
    async function getDocuments() {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_STRING}/get-docs`
        );
        setDocuments(Array.isArray(res.data) ? res.data : []); // Ensure data is an array
      } catch (error) {
        console.error("Error fetching documents:", error);
        setDocuments([]); // Fallback to an empty array
      }
    }

    getDocuments();
  }, []);

  // Fetch CTH documents based on CTH number and Update additional CTH documents based on CTH number
  useEffect(() => {
    async function getCthDocs() {
      // Always process existing cth_documents, even if cth_no is empty
      if (data?.cth_no) {
        const cthRes = await axios.get(
          `${import.meta.env.VITE_API_STRING}/get-cth-docs/${data?.cth_no}`
        );

        // Fetched CTH documents with URLs merged from data.cth_documents if they exist
        const fetchedCthDocuments =
          Array.isArray(cthRes.data) &&
          cthRes.data.map((cthDoc) => {
            const additionalData = data?.cth_documents.find(
              (doc) => doc.document_name === cthDoc.document_name
            );

            return {
              ...cthDoc,
              url: additionalData ? additionalData.url : "",
            };
          });

        // Start with initial cthDocuments
        let documentsToMerge = [...cthDocuments];

        // If data.cth_no is in commonCthCodes, merge with additionalDocs
        if (commonCthCodes.includes(data.cth_no)) {
          documentsToMerge = [...documentsToMerge, ...additionalDocs];
        }

        // Merge fetched CTH documents
        documentsToMerge = fetchedCthDocuments
          ? [...documentsToMerge, ...fetchedCthDocuments]
          : [...documentsToMerge];

        // Merge data.cth_documents into the array
        documentsToMerge = [...documentsToMerge, ...data.cth_documents];

        // Eliminate duplicates, keeping only the document with a URL if it exists
        const uniqueDocuments = documentsToMerge.reduce((acc, current) => {
          const existingDocIndex = acc.findIndex(
            (doc) => doc.document_name === current.document_name
          );

          if (existingDocIndex === -1) {
            // Document does not exist, add it
            return acc.concat([current]);
          } else {
            // Document exists, replace it only if the current one has a URL
            if (current.url) {
              acc[existingDocIndex] = current;
            }
            return acc;
          }
        }, []);

        setCthDocuments(uniqueDocuments);
      } else if (data?.cth_documents && data.cth_documents.length > 0) {
        // If no CTH number but we have existing cth_documents, display them
        setCthDocuments(data.cth_documents);
      }
    }
    if (data) {
      setSelectedDocuments(data.documents);
      setSelectedChargesDocuments(data.DsrCharges || []);
    }

    getCthDocs();
  }, [data]);

  // Formik
  const formik = useFormik({
    initialValues: {
      checkedDocs: [],
      container_nos: [],
      obl_telex_bl: "",
      is_obl_recieved: false,
      document_received_date: "",
      vessel_berthing: "",
      hawb_hbl_no: "",
      hawb_hbl_date: "",
      awb_bl_date: "",
      awb_bl_date: "",
      gateway_igm_date: "",
      gateway_igm: "",
      igm_date: "",
      igm_no: "",
      line_no: "",
      no_of_pkgs: "",
      hss: "",
      bank_name: "",
      adCode: "",
      saller_name: "",
      firstCheck: "",
      priorityJob: "Normal",
      emptyContainerOffLoadDate: "",
      payment_method: "Transaction",
      gross_weight: "",
      job_net_weight: "",
      fta_Benefit_date_time: "",
      be_no: "",
      in_bond_be_no: "",
      be_date: "",
      be_filing_type: "",
      in_bond_be_date: "",
      discharge_date: "",
      status: "",
      detailed_status: "",
      free_time: "",
      arrival_date: "",
      do_validity: "",
      do_validity_upto_job_level: "",
      do_revalidation_upto_job_level: "",
      required_do_validity_upto: "",
      cth_no: "",
      checklist: [],
      job_sticker_upload: [],
      // rail_out_date: "",
      remarks: "",
      description: "",
      consignment_type: "",
      sims_reg_no: "",
      pims_reg_no: "",
      nfmims_reg_no: "",
      sims_date: "",
      pims_date: "",
      nfmims_date: "",
      delivery_date: "",
      assessment_date: "",
      duty_paid_date: "",
      container_images: "",
      doPlanning: false,
      do_planning_date: "",
      examinationPlanning: false,
      examination_planning_date: "",
      examination_date: "",
      pcv_date: "",
      type_of_b_e: "",
      exBondValue: "",
      scheme: "",
      clearanceValue: "",
      do_copies: [],
      do_queries: [],
      documentationQueries: [],
      submissionQueries: [],
      eSachitQueries: [],
      processed_be_attachment: [],
      ooc_copies: [],
      in_bond_ooc_copies: [],
      gate_pass_copies: [],
      all_documents: [],
      do_revalidation: false,
      do_revalidation_date: "",
      out_of_charge: "",
      checked: false,
      type_of_Do: "",
      documentation_completed_date_time: "",

      submission_completed_date_time: "",
      completed_operation_date: "",
      esanchit_completed_date_time: "",
      bill_document_sent_to_accounts: "",
      do_completed: "",
      import_terms: "",
      // container_rail_out_date: ""
      assessable_ammount: "",
      igst_ammount: "",
      sws_ammount: "",
      bcd_ammount: "",
      intrest_ammount: "",
      is_checklist_aprroved_date: "",
      is_checklist_aprroved: false,
      is_checklist_clicked: false,
      DsrCharges: [],
      import_terms: "",
      cifValue: "",
      freight: "",
      insurance: "",
      bill_no: "",
      bill_date: "",
      dsr_queries: [],
    },
    onSubmit: async (values) => {
      // Create a copy of cthDocuments to modify
      const updatedCthDocuments = cthDocuments.map((doc) => {
        if (doc.document_check_date === "") {
          // Clear the esanchit_completed_date_time if a document_check_date is empty
          values.esanchit_completed_date_time = "";
        }
        return doc;
      });

      // Get user info from localStorage for audit trail
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      // Update the payload with the modified cthDocuments and other values
      await axios.put(
        `${import.meta.env.VITE_API_STRING}/update-job/${
          params.selected_year
        }/${params.job_no}`,
        {
          cth_documents: updatedCthDocuments,
          documents: selectedDocuments,
          checkedDocs: values.checkedDocs,
          vessel_berthing: values.vessel_berthing,
          hawb_hbl_no: values.hawb_hbl_no,
          hawb_hbl_date: values.hawb_hbl_date,
          awb_bl_no: values.awb_bl_no,
          awb_bl_date: values.awb_bl_date,
          cth_no: values.cth_no,
          free_time: values.free_time,
          status: values.status,
          detailed_status: values.detailed_status,
          container_nos: values.container_nos,
          arrival_date: values.arrival_date,
          do_validity_upto_job_level: values.do_validity_upto_job_level,
          do_revalidation_upto_job_level: values.do_revalidation_upto_job_level,
          checklist: values.checklist,
          job_sticker_upload: values.job_sticker_upload,
          // rail_out_date: values.rail_out_date,
          remarks: values.remarks,
          description: values.description,
          consignment_type: values.consignment_type,
          sims_reg_no: values.sims_reg_no,
          pims_reg_no: values.pims_reg_no,
          nfmims_reg_no: values.nfmims_reg_no,
          sims_date: values.sims_date,
          pims_date: values.pims_date,
          nfmims_date: values.nfmims_date,
          delivery_date: values.delivery_date,
          gateway_igm_date: values.gateway_igm_date,
          gateway_igm: values.gateway_igm,
          igm_date: values.igm_date,
          igm_no: values.igm_no,
          line_no: values.line_no,
          no_of_pkgs: values.no_of_pkgs,
          hss: values.hss,
          saller_name: values.saller_name,
          adCode: values.adCode,
          bank_name: values.bank_name,
          firstCheck: values.firstCheck,
          priorityJob: values.priorityJob,
          emptyContainerOffLoadDate: values.emptyContainerOffLoadDate,
          payment_method: values.payment_method,
          gross_weight: values.gross_weight,
          job_net_weight: values.job_net_weight,
          fta_Benefit_date_time: values.fta_Benefit_date_time,
          be_no: values.be_no,
          in_bond_be_no: values.in_bond_be_no,
          be_date: values.be_date,
          be_filing_type: values.be_filing_type,
          in_bond_be_date: values.in_bond_be_date,
          discharge_date: values.discharge_date,
          assessment_date: values.assessment_date,
          duty_paid_date: values.duty_paid_date,
          doPlanning: values.doPlanning,
          clearanceValue: values.clearanceValue,
          pcv_date: values.pcv_date,
          do_planning_date: values.do_planning_date,
          examinationPlanning: values.examinationPlanning,
          examination_planning_date: values.examination_planning_date,
          do_copies: values.do_copies,
          do_queries: values.do_queries,
          documentationQueries: values.documentationQueries,
          submissionQueries: values.submissionQueries,
          eSachitQueries: values.eSachitQueries,
          processed_be_attachment: values.processed_be_attachment,
          ooc_copies: values.ooc_copies,
          in_bond_ooc_copies: values.in_bond_ooc_copies,
          gate_pass_copies: values.gate_pass_copies,
          all_documents: values.all_documents,
          do_revalidation: values.do_revalidation,
          do_revalidation_date: values.do_revalidation_date,
          is_checklist_aprroved_date: values.is_checklist_aprroved_date,
          is_checklist_aprroved: values.is_checklist_aprroved,
          is_checklist_clicked: Boolean(values.is_checklist_clicked),
          required_do_validity_upto: values.required_do_validity_upto,
          out_of_charge: values.out_of_charge,
          checked: values.checked,
          obl_telex_bl: values.obl_telex_bl,
          is_obl_recieved: values.is_obl_recieved,
          document_received_date: values.document_received_date,
          type_of_Do: values.type_of_Do,
          type_of_b_e: values.type_of_b_e,
          exBondValue: values.exBondValue,
          scheme: values.scheme,
          documentation_completed_date_time:
            values.documentation_completed_date_time,
          submission_completed_date_time: values.submission_completed_date_time,
          completed_operation_date: values.completed_operation_date,
          esanchit_completed_date_time: values.esanchit_completed_date_time,
          bill_document_sent_to_accounts: values.bill_document_sent_to_accounts,
          do_completed: values.do_completed,
          import_terms: values.import_terms,
          freight: values.freight,
          cifValue: values.cifValue,
          insurance: values.insurance,
          bill_date: values.bill_date,
          bill_no: values.bill_no,
          assessable_ammount: values.assessable_ammount,
          igst_ammount: values.igst_ammount,
          sws_ammount: values.sws_ammount,
          bcd_ammount: values.bcd_ammount,
          intrest_ammount: values.intrest_ammount,
          fine_amount: values.fine_amount,
          penalty_amount: values.penalty_amount,
          total_duty: values.total_duty,
          DsrCharges: selectedChargesDocuments,
          dsr_queries: values.dsr_queries,
        },
        { headers }
      );
      localStorage.setItem("tab_value", 1);
      setTabValue(1);
      // Close the tab after successful submit
      setTimeout(() => {
        window.close();
      }, 500);
    },
  });

  // Utility function to handle undefined/null checks
  const safeValue = (value, defaultVal = "") =>
    value === undefined || value === null ? defaultVal : value;
  const filteredClearanceOptions =
    clearanceOptionsMapping[formik.values.type_of_b_e] || [];
  // When the BE type changes, update Formik's clearanceValue field to the first available option only if no value is set.
  useEffect(() => {
    if (filteredClearanceOptions.length > 0 && !formik.values.clearanceValue) {
      formik.setFieldValue("clearanceValue", filteredClearanceOptions[0].value);
    } else if (filteredClearanceOptions.length === 0) {
      formik.setFieldValue("clearanceValue", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.type_of_b_e]);

  // Validation function remains unchanged – now you can use it in your onChange for clearance selection.
  const canChangeClearance = () => {
    // Insert your custom validation logic here.
    return true;
  };

  // Instead of having a separate reset function for Ex-Bond fields that use useState,
  // update Formik values directly.
  const resetOtherDetails = () => {
    formik.setFieldValue("exBondValue", "");
    formik.setFieldValue("in_bond_be_no", "");
    formik.setFieldValue("in_bond_be_date", "");
    formik.setFieldValue("in_bond_ooc_copies", []);
  };

  const serializedContainerNos = useMemo(
    () =>
      JSON.stringify(
        formik.values.container_nos.map((container) => ({
          arrival_date: container.arrival_date,
          // container_rail_out_date: container.container_rail_out_date,
          free_time: container.free_time,
          required_do_validity_upto: container.required_do_validity_upto || "",
        }))
      ),
    [formik.values.container_nos]
  );
  // Update formik intial values when data is fetched from db
  useEffect(() => {
    if (data) {
      setSelectedRegNo(
        data.sims_reg_no
          ? "sims"
          : data.pims_reg_no
          ? "pims"
          : data.nfmims_reg_no
          ? "nfmims"
          : ""
      );

      const container_nos = safeValue(data.container_nos, []).map(
        (container) => ({
          do_revalidation: safeValue(container.do_revalidation, []),
          required_do_validity_upto: safeValue(
            container.required_do_validity_upto
          ),
          arrival_date: checked
            ? safeValue(data.arrival_date)
            : safeValue(container.arrival_date)
            ? convertDateFormatForUI(container.arrival_date)
            : "",
          container_number: safeValue(container.container_number),
          size: safeValue(container.size, "20"),
          seal_number: safeValue(container.seal_number),
          net_weight_as_per_PL_document: safeValue(
            container.net_weight_as_per_PL_document
          ),
          container_rail_out_date: safeValue(container.container_rail_out_date),
          by_road_movement_date: safeValue(container.by_road_movement_date),
          delivery_date: safeValue(container.delivery_date),
          emptyContainerOffLoadDate: safeValue(
            container.emptyContainerOffLoadDate
          ),
          weighment_slip_images: safeValue(container.weighment_slip_images, []),
          container_images: safeValue(container.container_images, []),
          loose_material_photo: safeValue(container.loose_material_photo, []),
          loose_material: safeValue(container.loose_material, []),
          examination_videos: safeValue(container.examination_videos, []),
          container_pre_damage_images: safeValue(
            container.container_pre_damage_images,
            []
          ),
          physical_weight: safeValue(container.physical_weight),
          do_revalidation_date: safeValue(container.do_revalidation_date),
          do_validity_upto_container_level: safeValue(
            container.do_validity_upto_container_level
          ),
          do_revalidation_upto_container_level: safeValue(
            container.do_revalidation_upto_container_level
          ),
          tare_weight: safeValue(container.tare_weight),
          actual_weight: safeValue(container.actual_weight),
          net_weight: safeValue(container.net_weight),
          container_gross_weight: safeValue(container.container_gross_weight),
          weight_shortage:
            safeValue(container.physical_weight) &&
            safeValue(container.container_gross_weight) &&
            safeValue(container.actual_weight) &&
            safeValue(container.tare_weight) &&
            container.physical_weight !== "0" &&
            container.container_gross_weight !== "0" &&
            container.actual_weight !== "0" &&
            container.tare_weight !== "0"
              ? safeValue(container.weight_shortage)
              : "",
          weight_excess:
            safeValue(container.physical_weight) &&
            safeValue(container.container_gross_weight) &&
            safeValue(container.actual_weight) &&
            safeValue(container.tare_weight) &&
            container.physical_weight !== "0" &&
            container.container_gross_weight !== "0" &&
            container.actual_weight !== "0" &&
            container.tare_weight !== "0"
              ? safeValue(container.weight_excess)
              : "",
          transporter: safeValue(container.transporter),
        })
      );

      formik.setValues({
        container_nos,
        checkedDocs: safeValue(data.checkedDocs, []),
        is_obl_recieved: safeValue(data.is_obl_recieved, false),
        document_received_date: safeValue(data.document_received_date),
        arrival_date: safeValue(data.arrival_date),
        vessel_berthing: safeValue(data.vessel_berthing)
          ? new Date(data.vessel_berthing)
              .toLocaleDateString("en-CA")
              .split("/")
              .reverse()
              .join("-")
          : "",
        free_time: safeValue(data.free_time, 0),
        status: safeValue(data.status),
        detailed_status: safeValue(data.detailed_status, "ETA Date Pending"),
        do_validity: safeValue(data.do_validity),
        cth_no: safeValue(data.cth_no),
        doPlanning: safeValue(data.doPlanning, false),
        do_planning_date: safeValue(data.do_planning_date),
        is_checklist_aprroved: safeValue(data.is_checklist_aprroved),
        is_checklist_clicked: Boolean(
          safeValue(data.is_checklist_clicked, false)
        ),
        is_checklist_aprroved_date: safeValue(data.is_checklist_aprroved_date),
        examinationPlanning: safeValue(data.examinationPlanning, false),
        examination_planning_date: safeValue(data.examination_planning_date),
        do_validity_upto_job_level: safeValue(data.do_validity_upto_job_level),
        do_revalidation_upto_job_level: safeValue(
          data.do_revalidation_upto_job_level
        ),
        checklist: safeValue(data.checklist, []),
        job_sticker_upload: safeValue(data.job_sticker_upload, []),
        remarks: safeValue(data.remarks),
        description: safeValue(data.description),
        consignment_type: safeValue(data.consignment_type),
        sims_reg_no: safeValue(data.sims_reg_no),
        pims_reg_no: safeValue(data.pims_reg_no),
        nfmims_reg_no: safeValue(data.nfmims_reg_no),
        sims_date: safeValue(data.sims_date),
        pims_date: safeValue(data.pims_date),
        nfmims_date: safeValue(data.nfmims_date),
        delivery_date: safeValue(data.delivery_date),
        gateway_igm_date: safeValue(data.gateway_igm_date),
        gateway_igm: safeValue(data.gateway_igm),
        igm_date: safeValue(data.igm_date),
        igm_no: safeValue(data.igm_no),
        line_no: safeValue(data.line_no),
        no_of_pkgs: safeValue(data.no_of_pkgs),
        hss: safeValue(data.hss),
        saller_name: safeValue(data.saller_name),
        adCode: safeValue(data.adCode),
        bank_name: safeValue(data.bank_name),
        firstCheck: safeValue(data.firstCheck),
        priorityJob: safeValue(data.priorityJob, "Normal"),
        emptyContainerOffLoadDate: safeValue(data.emptyContainerOffLoadDate),
        job_net_weight: safeValue(data.job_net_weight),
        payment_method: safeValue(data.payment_method, "Transaction"),
        gross_weight: safeValue(data.gross_weight),
        fta_Benefit_date_time: safeValue(data.fta_Benefit_date_time),
        be_no: safeValue(data.be_no),
        in_bond_be_no: safeValue(data.in_bond_be_no),
        be_date: safeValue(data.be_date),
        be_filing_type: safeValue(data.be_filing_type),
        in_bond_be_date: safeValue(data.in_bond_be_date),
        discharge_date: safeValue(data.discharge_date),
        hawb_hbl_date: safeValue(data.hawb_hbl_date),
        hawb_hbl_no: safeValue(data.hawb_hbl_no),
        awb_bl_date: safeValue(data.awb_bl_date),
        awb_bl_no: safeValue(data.awb_bl_no),
        assessment_date: safeValue(data.assessment_date),
        examination_date: safeValue(data.examination_date),
        pcv_date: safeValue(data.pcv_date),
        type_of_b_e: safeValue(data.type_of_b_e),
        exBondValue: safeValue(data.exBondValue),
        scheme: safeValue(data.scheme),
        clearanceValue: safeValue(data.clearanceValue),
        duty_paid_date: safeValue(data.duty_paid_date),
        assessable_ammount: safeValue(data.assessable_ammount),
        penalty_amount: safeValue(data.penalty_amount),
        fine_amount: safeValue(data.fine_amount),
        igst_ammount: safeValue(data.igst_ammount),
        sws_ammount: safeValue(data.sws_ammount),
        intrest_ammount: safeValue(data.intrest_ammount),
        bcd_ammount: safeValue(data.bcd_ammount),
        total_duty: safeValue(data.total_duty),
        do_copies: safeValue(data.do_copies, []),
        do_queries: safeValue(data.do_queries, []),
        documentationQueries: safeValue(data.documentationQueries, []),
        submissionQueries: safeValue(data.submissionQueries, []),
        eSachitQueries: safeValue(data.eSachitQueries, []),
        processed_be_attachment: safeValue(data.processed_be_attachment, []),
        ooc_copies: safeValue(data.ooc_copies, []),
        in_bond_ooc_copies: safeValue(data.in_bond_ooc_copies, []),
        gate_pass_copies: safeValue(data.gate_pass_copies, []),
        all_documents: safeValue(data.all_documents, []),
        do_revalidation: safeValue(data.do_revalidation, false),
        do_revalidation_date: safeValue(data.do_revalidation_date),
        documentation_completed_date_time: safeValue(
          data.documentation_completed_date_time
        ),
        submission_completed_date_time: safeValue(
          data.submission_completed_date_time
        ),
        completed_operation_date: safeValue(data.completed_operation_date),
        esanchit_completed_date_time: safeValue(
          data.esanchit_completed_date_time
        ),
        bill_document_sent_to_accounts: safeValue(
          data.bill_document_sent_to_accounts
        ),
        do_completed: safeValue(data.do_completed),
        import_terms: safeValue(data.import_terms),
        freight: safeValue(data.freight),
        insurance: safeValue(data.insurance),
        bill_date: safeValue(data.bill_date),
        bill_no: safeValue(data.bill_no),
        cifValue: safeValue(data.cifValue),
        out_of_charge: safeValue(data.out_of_charge),
        checked: safeValue(data.checked, false),
        type_of_Do: safeValue(data.type_of_Do),

        DsrCharges: safeValue(data.DsrCharges, []),
        dsr_queries: safeValue(data.dsr_queries, []),
      });
      // Update DsrCharges state to include custom charges from database
      if (data.DsrCharges && data.DsrCharges.length > 0) {
        const predefinedCharges = [
          { document_name: "Notary" },
          { document_name: "Duty" },
          { document_name: "MISC" },
          { document_name: "CE Certification Charges" },
          { document_name: "ADC/NOC Charges" },
        ];

        // Get unique custom charges from database (excluding predefined ones)
        const customChargesFromDB = data.DsrCharges.filter(
          (charge) =>
            !predefinedCharges.some(
              (predefined) => predefined.document_name === charge.document_name
            )
        ).map((charge) => ({ document_name: charge.document_name }));

        // Remove duplicates by document_name
        const uniqueCustomCharges = customChargesFromDB.filter(
          (charge, index, self) =>
            index ===
            self.findIndex((c) => c.document_name === charge.document_name)
        );

        // Combine predefined and unique custom charges
        const allCharges = [...predefinedCharges, ...uniqueCustomCharges];
        setDsrCharges(allCharges);
      }
    }
    // eslint-disable-next-line
  }, [data]);

  // Add a new useEffect to handle checkbox changes
  useEffect(() => {
    if (formik.values.container_nos?.length > 0) {
      const updatedContainers = formik.values.container_nos.map(
        (container) => ({
          ...container,
          arrival_date: formik.values.checked
            ? formik.values.arrival_date || ""
            : container.arrival_date,
        })
      );

      formik.setFieldValue("container_nos", updatedContainers);
    }
  }, [formik.values.checked, formik.values.arrival_date]);

  // Update detention from dates and set do_validity_upto_job_level
  useEffect(() => {
    function addDaysToDate(dateString, days) {
      if (!dateString) return "";

      const date = new Date(dateString);
      date.setDate(date.getDate() + days);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (formik.values.container_nos?.length > 0) {
      let updatedDate = [];

      // If all containers arrive at the same time, use the common arrival date
      if (formik.values.checked) {
        const commonDate = formik.values.arrival_date;
        updatedDate = formik.values.container_nos.map(() =>
          addDaysToDate(commonDate, parseInt(formik.values.free_time) || 0)
        );
      } else {
        // Use individual container arrival dates
        updatedDate = formik.values.container_nos.map((container) =>
          addDaysToDate(
            container.arrival_date,
            parseInt(formik.values.free_time) || 0
          )
        );
      }

      setDetentionFrom(updatedDate);

      // Find the earliest date from updatedDate
      const earliestDate = updatedDate.reduce((earliest, current) => {
        return current < earliest ? current : earliest;
      }, "9999-12-31"); // Set a far future date as the initial value

      // Set do_validity_upto_job_level to the earliest date
      formik.setFieldValue(
        "do_validity_upto_job_level",
        earliestDate === "9999-12-31"
          ? data.do_validity_upto_job_level
          : earliestDate
      );
    }
    // eslint-disable-next-line
  }, [
    formik.values.arrival_date,
    formik.values.free_time,
    formik.values.checked,
    formik.values.container_nos,
    serializedContainerNos,
  ]);

  // UseEffect to update do_validity_upto_container_level when do_validity_upto_job_level changes
  useEffect(() => {
    if (formik.values.do_validity_upto_job_level) {
      const updatedContainers = formik.values.container_nos.map(
        (container) => ({
          ...container,
          do_validity_upto_container_level:
            formik.values.do_validity_upto_job_level,
        })
      );

      formik.setFieldValue("container_nos", updatedContainers);
    }
    // eslint-disable-next-line
  }, [formik.values.do_validity_upto_job_level]);

  const handleFileChange = async (event, documentName, index, isCth) => {
    const file = event.target.files[0];
    if (!file) return;

    const formattedDocumentName = documentName
      .toLowerCase()
      .replace(/\[.*?\]|\(.*?\)/g, "")
      .replace(/[^\w\s]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    const photoUrl = await handleSingleFileUpload(
      file,
      formattedDocumentName,
      setFileSnackbar
    );

    if (isCth) {
      const updatedCthDocuments = [...cthDocuments];
      updatedCthDocuments[index].url = photoUrl; // Store as a string
      setCthDocuments(updatedCthDocuments);
    } else {
      const updatedSelectedDocuments = [...selectedDocuments];
      updatedSelectedDocuments[index].url = photoUrl; // Store as a string
      setSelectedDocuments(updatedSelectedDocuments);
    }
  };

  const handleDocumentChange = (index, newValue) => {
    setSelectedDocuments((prevSelectedDocuments) => {
      const updatedDocuments = [...prevSelectedDocuments];

      // Ensure the new object has the desired structure
      updatedDocuments[index] = {
        document_name: newValue?.document_name || "",
        document_code: newValue?.document_code || "",
        url: newValue?.url || [], // or `newValue.url` if you get `url` in the `newValue`
        document_check_date: newValue?.document_check_date || "",
      };

      return updatedDocuments;
    });
  };

  const handleAddDocument = () => {
    setSelectedDocuments([
      ...selectedDocuments,
      {
        document_name: "",
        document_code: "",
        url: [],
        document_check_date: "",
      },
    ]);
  };

  const handleRemoveDocument = (index) => {
    const newSelectedDocuments = [...selectedDocuments];
    newSelectedDocuments.splice(index, 1);
    setSelectedDocuments(newSelectedDocuments);
  };

  const filterDocuments = (selectedDocuments, currentIndex) => {
    // Ensure documents is an array
    const validDocuments = Array.isArray(documents) ? documents : [];

    const restrictedDocs = new Set();

    selectedDocuments.forEach((doc, index) => {
      if (doc.document) {
        restrictedDocs.add(doc.document.document_code);
        if (doc.document.document_code === "380000") {
          restrictedDocs.add("331000");
        } else if (doc.document.document_code === "271000") {
          restrictedDocs.add("331000");
        } else if (doc.document.document_code === "331000") {
          restrictedDocs.add("380000");
          restrictedDocs.add("271000");
        }
      }
    });

    return validDocuments.filter(
      (doc) => !restrictedDocs.has(doc.document_code)
    );
  };

  return {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    setCthDocuments,
    documents,
    setNewDocumentName,
    newDocumentName,
    newDocumentCode,
    clearanceOptionsMapping,
    schemeOptions,
    setNewDocumentCode,
    handleFileChange,
    selectedDocuments,
    setSelectedDocuments,
    handleDocumentChange,
    handleAddDocument,
    handleRemoveDocument,
    filterDocuments,
    canEditOrDelete,
    cth_Dropdown,
    setSelectedDocument,
    selectedDocument,
    jobDetails,
    setJobDetails,

    beTypeOptions,
    filteredClearanceOptions,
    canChangeClearance,
    resetOtherDetails,

    // Charges related exports
    DsrCharges,
    setDsrCharges,
    selectedChargesDocuments,
    setSelectedChargesDocuments,
    selectedChargesDocument,
    setSelectedChargesDocument,
    newChargesDocumentName,
    setNewChargesDocumentName,
    setData,
  };
}

export default useFetchJobDetails;
