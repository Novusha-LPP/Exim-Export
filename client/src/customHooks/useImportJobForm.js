import { useState, useEffect } from "react";
import { useFormik } from "formik";
import axios from "axios";
import {
  customHouseOptions,
  importerOptions,
  shippingLineOptions,
  cth_Dropdown,
} from "../components/MasterLists/MasterLists";

const useImportJobForm = () => {
  // Get the current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Months are zero-based

  // Extract the last two digits of the current year
  const currentTwoDigits = String(currentYear).slice(-2); // e.g., "24" for 2024

  // Calculate the next year's last two digits
  const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0"); // e.g., "25" for 2025
  const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0"); // e.g., "23" for 2023

  // Determine the financial year range
  let defaultYearPair;
  if (currentMonth >= 4) {
    // From April of the current year to March of the next year
    defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;
  } else {
    // From January to March, previous financial year
    defaultYearPair = `${prevTwoDigits}-${currentTwoDigits}`;
  }

  // Initialize the state with the determined year pair
  const [year, setYear] = useState(defaultYearPair);
  const [job_date, setJob_date] = useState("");

  // Existing states:
  // const [job_no, setJobNo] = useState("");
  const [custom_house, setCustomHouse] = useState("");
  const [importer, setImporter] = useState("");
  const [importerURL, setImporterURL] = useState("");
  const [shipping_line_airline, setShippingLineAirline] = useState("");
  const [branchSrNo, setBranchSrNo] = useState("");
  const [adCode, setAdCode] = useState("");
  const [supplier_exporter, setSupplierExporter] = useState("");
  const [awb_bl_no, setAwbBlNo] = useState("");
  const [awb_bl_date, setAwbBlDate] = useState("");
  const [hawb_hbl_date, setHawb_hbl_date] = useState("");
  const [hawb_hbl_no, setHawb_hbl_no] = useState("");
  const [vessel_berthing, setVesselberthing] = useState("");
  const [type_of_b_e, setTypeOfBE] = useState("");
  const [loading_port, setLoadingPort] = useState("");
  const [gross_weight, setGrossWeight] = useState("");
  const [cth_no, setCthNo] = useState("");
  const [origin_country, setOriginCountry] = useState("");
  const [port_of_reporting, setPortOfReporting] = useState("");
  const [total_inv_value, setTotalInvValue] = useState("");
  const [inv_currency, setInvCurrency] = useState("");
  const [invoice_number, setInvoiceNumber] = useState("");
  const [invoice_date, setInvoiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [consignment_type, setConsignmentType] = useState("");
  const [isDraftDoc, setIsDraftDoc] = useState(false);

  const [container_nos, setContainerNos] = useState([
    { container_number: "", size: "" },
  ]);

  const [fta_Benefit_date_time, setFtaBenefitDateTime] = useState("");
  const [exBondValue, setExBondValue] = useState("");
  const [jobDetails, setJobDetails] = useState([]);

  // The back end expects "cth_documents". In your front end, you called it "cthDocuments".
  // Keep your internal state as is, but rename it in the final payload.
  const [cthDocuments, setCthDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Packing List",
      document_code: "271000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Bill of Lading",
      document_code: "704000",
      url: [],
      isDefault: true,
    },
  ]);

  const [scheme, setScheme] = useState("");
  const [in_bond_be_no, setBeNo] = useState("");
  const [in_bond_be_date, setBeDate] = useState("");
  const [in_bond_ooc_copies, setOocCopies] = useState([]);
  const [clearanceValue, setClearanceValue] = useState("");

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // For editing a single doc
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});

  // For new doc from dropdown or user
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [HSS, setHSS] = useState("");
  const [sallerName, setSallerName] = useState("");
  const [bankName, setBankName] = useState("");

  useEffect(() => {
    if (importer) {
      const formattedImporter = importer.replace(/\s+/g, "_");
      setImporterURL(formattedImporter);
    }
  }, [importer]);

  // Fetch job numbers dynamically
  // Fetch job details dynamically
  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_STRING}/jobs/add-job-all-In-bond`
        );
        setJobDetails(response.data); // Set the job details from the response
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }
    fetchJobDetails();
  }, []);
  //
  // Reset form function
  const resetForm = () => {
    // setYear(defaultYearPair);
    setCustomHouse("");
    setImporter("");
    setShippingLineAirline("");
    setBranchSrNo("");
    setAdCode("");
    setSupplierExporter("");
    setAwbBlNo("");
    setHawb_hbl_no("");
    setHawb_hbl_date("");
    setAwbBlDate("");
    setVesselberthing("");
    setTypeOfBE("");
    setLoadingPort("");
    setGrossWeight("");
    setCthNo("");
    setOriginCountry("");
    setPortOfReporting("");
    setTotalInvValue("");
    setInvCurrency("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setDescription("");
    setConsignmentType("");
    setIsDraftDoc(false);
    setContainerNos([{ container_number: "", size: "" }]);
    setFtaBenefitDateTime("");
    setExBondValue("");
    setCthDocuments([
      {
        document_name: "Commercial Invoice",
        document_code: "380000",
        url: [],
        isDefault: true,
      },
      {
        document_name: "Packing List",
        document_code: "271000",
        url: [],
        isDefault: true,
      },
      {
        document_name: "Bill of Lading",
        document_code: "704000",
        url: [],
        isDefault: true,
      },
    ]);
    setScheme("");
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setClearanceValue("");
    setSelectedDocument("");
    setNewDocumentName("");
    setNewDocumentCode("");
    setHSS("");
    setSallerName("");
    setBankName("");

    // Reset any other states if necessary
  };
  //
  const formik = useFormik({
    initialValues: {
      all_documents: [],
    },
    onSubmit: async (values) => {
      try {
        const payload = {
          ...values,
          year, // <-- MANDATORY for backend
          job_date,
          custom_house,
          importer,
          importerURL,
          shipping_line_airline,
          branchSrNo,
          adCode,
          supplier_exporter,
          awb_bl_no,
          hawb_hbl_no,
          hawb_hbl_date,
          awb_bl_date,
          vessel_berthing,
          type_of_b_e,
          loading_port,
          gross_weight,
          cth_no,
          origin_country,
          port_of_reporting,
          total_inv_value,
          inv_currency,
          invoice_number,
          invoice_date,
          description,
          consignment_type,
          isDraftDoc,
          container_nos,
          cth_documents: cthDocuments, // Renamed to match backend expectations
          scheme,
          in_bond_be_no,
          in_bond_be_date,
          in_bond_ooc_copies,
          exBondValue,
          fta_Benefit_date_time,
          remarks: "",
          status: "Pending",
          clearanceValue,
          saller_name: sallerName,
          hss: HSS,
          bank_name: bankName,
        };

        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        // Make the API call and store response
        const response = await axios.post(
          `${import.meta.env.VITE_API_STRING}/jobs/add-job-imp-man`,
          payload,
          { headers }
        );

        // Show success alert
        alert(
          `✅ Job successfully created! \nJob No: ${response.data.job?.job_no}`
        );

        // Reset the form after successful submission
        resetForm();
        formik.resetForm();
      } catch (error) {
        console.log("❌ Error creating job:", error);

        let errorMessage = "Failed to create job. Please try again.";

        if (error.response) {
          // Extract error message from API response
          errorMessage =
            error.response.data?.message || `Error: ${error.response.status}`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        alert(`❌ ${errorMessage}`); // Show alert with the exact error message
      }
    },
  });

  // Example utility functions
  const resetOtherDetails = () => {
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setScheme("");
    setExBondValue("");
  };

  const canChangeClearance = () => {
    return (
      !exBondValue &&
      !in_bond_be_no &&
      !in_bond_be_date &&
      in_bond_ooc_copies.length === 0
    );
  };

  // Container handlers
  const handleAddContainer = () => {
    setContainerNos([...container_nos, { container_number: "", size: "" }]);
  };

  const handleRemoveContainer = (index) => {
    const updatedContainers = container_nos.filter((_, i) => i !== index);
    setContainerNos(updatedContainers);
  };

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...container_nos];
    updatedContainers[index][field] = value;
    setContainerNos(updatedContainers);
  };

  // CTH Document handlers
  const confirmDeleteDocument = (index) => {
    setDeleteIndex(index);
    setConfirmDialogOpen(true);
  };

  const handleDeleteDocument = () => {
    if (deleteIndex !== null) {
      setCthDocuments((prevDocs) => {
        const updatedDocs = prevDocs.filter((_, i) => i !== deleteIndex);
        return updatedDocs;
      });
      setDeleteIndex(null);
      setConfirmDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (index) => {
    const documentToEdit = cthDocuments[index];
    setEditValues(documentToEdit);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditValues({});
  };

  const handleSaveEdit = () => {
    const updatedDocuments = [...cthDocuments];
    const idx = updatedDocuments.findIndex(
      (doc) => doc.document_code === editValues.document_code
    );
    if (idx !== -1) {
      updatedDocuments[idx] = editValues;
      setCthDocuments(updatedDocuments);
    }
    setEditDialogOpen(false);
  };

  const handleAddDocument = () => {
    if (selectedDocument === "other") {
      // Adding a custom document
      if (newDocumentName && newDocumentCode) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          {
            document_name: newDocumentName,
            document_code: newDocumentCode,
            url: [],
          },
        ]);
        setNewDocumentName("");
        setNewDocumentCode("");
      } else {
        alert("Please enter valid document details.");
      }
    } else if (selectedDocument) {
      // Adding a document from the dropdown
      const selectedDoc = cth_Dropdown.find(
        (doc) => doc.document_code === selectedDocument
      );
      if (selectedDoc) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          { ...selectedDoc, url: [] },
        ]);
        setSelectedDocument("");
      } else {
        alert("Invalid document selected.");
      }
    } else {
      alert("Please select or enter document details.");
    }
  };

  return {
    formik,
    // Export states so the component can use them
    year,
    setYear,
    custom_house,
    setCustomHouse,
    importer,
    importerURL,
    setImporter,
    shipping_line_airline,
    setShippingLineAirline,
    branchSrNo,
    setBranchSrNo,
    adCode,
    setAdCode,
    supplier_exporter,
    setSupplierExporter,
    awb_bl_no,
    hawb_hbl_no,
    setHawb_hbl_no,
    hawb_hbl_date,
    setHawb_hbl_date,
    setAwbBlNo,
    awb_bl_date,
    vessel_berthing,
    setAwbBlDate,
    setVesselberthing,
    type_of_b_e,
    setTypeOfBE,
    loading_port,
    setLoadingPort,
    gross_weight,
    setGrossWeight,
    cth_no,
    setCthNo,
    origin_country,
    setOriginCountry,
    port_of_reporting,
    setPortOfReporting,
    total_inv_value,
    setTotalInvValue,
    inv_currency,
    setInvCurrency,
    invoice_number,
    setInvoiceNumber,
    invoice_date,
    setInvoiceDate,
    description,
    setDescription,
    consignment_type,
    setConsignmentType,
    isDraftDoc,
    setIsDraftDoc,
    container_nos,
    handleAddContainer,
    handleRemoveContainer,
    handleContainerChange,
    cthDocuments,
    setCthDocuments,
    scheme,
    setScheme,
    in_bond_be_no,
    setBeNo,
    in_bond_be_date,
    setBeDate,
    in_bond_ooc_copies,
    setOocCopies,
    exBondValue,
    setExBondValue,
    fta_Benefit_date_time,
    setFtaBenefitDateTime,
    selectedDocument,
    setSelectedDocument,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    confirmDialogOpen,
    setConfirmDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editValues,
    setEditValues,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveEdit,
    confirmDeleteDocument,
    handleDeleteDocument,
    handleAddDocument,
    clearanceValue,
    setClearanceValue,
    resetOtherDetails,
    canChangeClearance,
    jobDetails,
    setJobDetails,
    HSS,
    setHSS,
    sallerName,
    setSallerName,
    bankName,
    setBankName,
  };
};

export default useImportJobForm;
