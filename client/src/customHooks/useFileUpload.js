import * as xlsx from "xlsx";
import axios from "axios";
import { useState } from "react";

function useFileUpload(inputRef, alt, setAlt) {
  const [snackbar, setSnackbar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    setLoading(true);
    setError(null);
    const file = event.target.files[0];

    const reader = new FileReader();
    reader.onload = (e) => validateAndProcessFile(e, file);
    reader.readAsBinaryString(file);
  };

  const validateAndProcessFile = async (event, file) => {
    try {
      const content = event.target.result;
      const workbook = xlsx.read(content, { type: "binary" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Get all data including headers for validation
      const allData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      // Check if second row exists
      if (allData.length < 2) {
        setError("Invalid Excel format: File must contain at least 2 rows");
        setLoading(false);
        if (inputRef.current) inputRef.current.value = null;
        return;
      }

      // Check for AHMEDABAD in the second row
      const secondRow = allData[1];
      const containsAhmedabad = secondRow.some((cell) =>
        String(cell || "")
          .toUpperCase()
          .includes("AHMEDABAD")
      );

      if (!containsAhmedabad) {
        setError("Error: The provided data is not valid for this import DSR.");
        setLoading(false);
        if (inputRef.current) inputRef.current.value = null;
        return;
      }

      // If validation passes, continue with existing processing
      handleFileRead(event);
    } catch (err) {
      console.error("Error validating file:", err);
      setError("Error processing file. Please check the format.");
      setLoading(false);
      if (inputRef.current) inputRef.current.value = null;
    }
  };

  const handleFileRead = async (event) => {
    const content = event.target.result;
    const workbook = xlsx.read(content, { type: "binary" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Format awb_bl_no column (H)
    const columnToFormat = "H";
    // Loop through all cells in column H and format them as '0' to prevent scientific notation
    Object.keys(worksheet).forEach((cell) => {
      if (cell.startsWith(columnToFormat)) {
        if (worksheet[cell].w) {
          delete worksheet[cell].w;
          worksheet[cell].z = "0";
        }
      }
    });

    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      range: 2,
    });

    const modifiedData = jsonData?.map((item) => {
      const modifiedItem = {};
      for (const key in item) {
        if (Object.hasOwnProperty.call(item, key)) {
          let modifiedKey = key
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^\w\s]/gi, "_")
            .replace(/\//g, "_")
            .replace(/_+$/, "");

          // Specific transformation for date keys
          if (
            [
              "job_date",
              "invoice_date",
              "be_date",
              "igm_date",
              "gateway_igm_date",
              "out_of_charge",
              "awb_bl_date",
              "vessel_berthing",
            ].includes(modifiedKey)
          ) {
            let value = item[key];

            if (!isNaN(value) && typeof value === "number") {
              const excelEpoch = new Date(1899, 11, 30);
              const jsDate = new Date(excelEpoch.getTime() + value * 86400000);
              const year = jsDate.getFullYear();
              const month = String(jsDate.getMonth() + 1).padStart(2, "0");
              const day = String(jsDate.getDate()).padStart(2, "0");
              modifiedItem[modifiedKey] = `${year}-${month}-${day}`;
            } else if (typeof value === "string") {
              const dateParts = value.split(" ")[0].split("/");
              if (dateParts.length === 3) {
                const day = String(dateParts[0]).padStart(2, "0");
                const month = String(dateParts[1]).padStart(2, "0");
                const year = String(dateParts[2]);
                modifiedItem[modifiedKey] = `${year}-${month}-${day}`;
              } else if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(value)) {
                const [day, month, year] = value.split("-");
                const monthMapping = {
                  Jan: "01",
                  Feb: "02",
                  Mar: "03",
                  Apr: "04",
                  May: "05",
                  Jun: "06",
                  Jul: "07",
                  Aug: "08",
                  Sep: "09",
                  Oct: "10",
                  Nov: "11",
                  Dec: "12",
                };
                const formattedMonth = monthMapping[month];
                modifiedItem[
                  modifiedKey
                ] = `${year}-${formattedMonth}-${day.padStart(2, "0")}`;
              } else {
                modifiedItem[modifiedKey] = value;
              }
            } else {
              modifiedItem[modifiedKey] = value;
            }
          } else if (modifiedKey === "job_no") {
            const match = item[key].split("/");
            modifiedItem.job_no = match[3];
            modifiedItem.year = match[4];
          } else if (modifiedKey === "custom_house") {
            const customHouse = item[key].toLowerCase();
            if (customHouse.includes("sabarmati")) {
              modifiedItem[modifiedKey] = "ICD KHODIYAR";
            } else if (customHouse.includes("thar")) {
              modifiedItem[modifiedKey] = "ICD SANAND";
            } else if (customHouse.includes("mundra")) {
              modifiedItem[modifiedKey] = "MUNDRA PORT";
            } else {
              modifiedItem[modifiedKey] = item[key];
            }
          } else if (modifiedKey === "importer") {
            modifiedItem.importer = item[key];
            modifiedItem.importerURL = item[key]
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^\w]+/g, "")
              .replace(/_+/g, "_")
              .replace(/^_|_$/g, "");
          } else if (modifiedKey === "container_no") {
            modifiedItem.container_nos = item[key];
          } else if (modifiedKey === "awb_bl_no_") {
            modifiedItem.awb_bl_no = item[key];
          } else if (modifiedKey === "assbl__value") {
            modifiedItem.assbl_value = item[key];
          } else if (modifiedKey === "ex_rate") {
            modifiedItem.exrate = item[key];
          } else if (modifiedKey === "ie_code_no") {
            // Format ie_code_no to ensure it's 10 characters long
            let ieCodeValue = String(item[key] || "").trim();
            if (ieCodeValue.length < 10 && ieCodeValue.length > 0) {
              ieCodeValue = ieCodeValue.padStart(10, "0");
            }
            modifiedItem.ie_code_no = ieCodeValue;
          } else if (modifiedKey === "consignment_type") {
            modifiedItem.consignment_type = item[key].split(",")[0];
          } else if (modifiedKey === "hss_name") {
            modifiedItem.hss_name = item[key];
          } else if (modifiedKey === "total_inv_value") {
            modifiedItem.total_inv_value = item[key];
          } else if (
            modifiedKey !== "noofconts" &&
            modifiedKey !== "noofcontsbytype"
          ) {
            modifiedItem[modifiedKey] = item[key];
          }
        }
      }
      return modifiedItem;
    });

    modifiedData.forEach((item) => {
      if (item.container_nos && typeof item.container_nos === "string") {
        const containerNumbers = item.container_nos.split(",");

        const noOfContainer = item.no_of_container;
        let sizes = { 40: 0, 20: 0 };

        if (noOfContainer) {
          const sizeEntries = noOfContainer.split(",");

          sizeEntries.forEach((entry) => {
            const [count, size] = entry.split("x");

            const sizeKey = size.includes("40")
              ? "40"
              : size.includes("20")
              ? "20"
              : null;

            if (sizeKey) {
              sizes[sizeKey] += parseInt(count, 10);
            }
          });

          const predominantSize = sizes["40"] >= sizes["20"] ? "40" : "20";

          const containers = containerNumbers.map((container) => ({
            container_number: container.trim(),
            size: predominantSize,
          }));

          item.container_nos = containers;
        } else {
          item.container_nos = containerNumbers.map((container) => ({
            container_number: container.trim(),
          }));
        }
      } else {
        item.container_nos = [];
      }
    });

    // Set file to null so that the same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = null;
    }

    // Upload the Excel data and check the status
    await uploadAndCheckStatus(modifiedData);
  };

  async function uploadAndCheckStatus(modifiedData) {
    setLoading(true);
    try {
      // Fetch the existing LastJobsDate data to check the current vessel_berthing value
      const lastJobsDateRes = await axios.get(
        `${import.meta.env.VITE_API_STRING}/get-last-jobs-date`
      );

      const existingVesselBerthing =
        lastJobsDateRes.data?.vessel_berthing || "";

      const existingGatewayIGM = lastJobsDateRes.data?.gateway_igm_date || "";

      // Modify the data before sending it to the backend
      const finalData = modifiedData.map((item) => {
        if (
          item.vessel_berthing &&
          item.gateway_igm_date && // If Excel sheet has a vessel_berthing date
          (!existingVesselBerthing || existingVesselBerthing.trim() === "") &&
          (!existingGatewayIGM || existingGatewayIGM.trim() === "") // And the existing value is empty or null
        ) {
          return item; // Use the Excel sheet's vessel_berthing date
        } else {
          // Remove vessel_berthing to prevent overriding with Excel data
          const { vessel_berthing, gateway_igm_date, ...rest } = item;
          return rest;
        }
      });

      // Get user info from localStorage for audit trail
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        "Content-Type": "application/json",
        "user-id": user.username || "unknown",
        username: user.username || "unknown",
        "user-role": user.role || "unknown",
      };

      // First, upload the data
      const uploadResponse = await axios.post(
        `${import.meta.env.VITE_API_STRING}/jobs/add-job`,
        finalData,
        { headers }
      );

      if (uploadResponse.status === 200) {
        setSnackbar(true);

        const firstJobNo = modifiedData[0].job_no;

        const checkStatusResponse = await axios.get(
          `${import.meta.env.VITE_API_STRING}/jobs/update-pending-status`
        );
        if (checkStatusResponse.status !== 200) {
          console.error("Status update failed");
        }
      } else {
        setError("Something went wrong during data upload");
      }
    } catch (error) {
      setError("Error occurred during the upload or status check");
      console.error("Error:", error); // Log error
    } finally {
      setLoading(false);
      setAlt(!alt); // Trigger re-render
    }
  }

  // Hide snackbar after 2 seconds
  setTimeout(() => {
    setSnackbar(false);
  }, 2000);

  return { handleFileUpload, snackbar, loading, error };
}

export default useFileUpload;
