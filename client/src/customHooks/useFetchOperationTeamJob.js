import { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useFormik } from "formik";
import { TabContext } from "../components/import-operations/ImportOperations";
import { UserContext } from "../contexts/UserContext";

function useFetchOperationTeamJob(params) {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentTab, currentTab } = useContext(TabContext);
  const { user } = useContext(UserContext); // Access user from context

  // Store search parameters from location state
  const [storedSearchParams, setStoredSearchParams] = useState(null);

  useEffect(() => {
    if (location.state) {
      const {
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab,
        selectedICD,
        selectedYearState,
        detailedStatusExPlan,
        currentPage,
        tab_number,
      } = location.state;

      setStoredSearchParams({
        searchQuery,
        selectedImporter,
        selectedJobId,
        currentTab: currentTab || tab_number, // Handle both property names
        selectedICD,
        selectedYearState,
        detailedStatusExPlan,
        currentPage,
      });
    }
  }, [location.state]);

  // Fetch data
  useEffect(() => {
    async function getJobDetails() {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_STRING}/get-job/${params.year}/${
            params.job_no
          }`
        );
        setData(response.data);
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }

    getJobDetails();
  }, [params.job_no, params.year]);

  // Formik setup
  const formik = useFormik({
    initialValues: {
      container_nos: [],
      examination_date: "",
      container_images: "",
      weighment_slip_images: [],
      pcv_date: "",
      concor_gate_pass_date: "",
      concor_gate_pass_validate_up_to: "",
      completed_operation_date: "",
      out_of_charge: "",
      custodian_gate_pass: [],
      concor_invoice_and_receipt_copy: [],
      dsr_queries: [],
    },

    onSubmit: async (values) => {
      try {
        // Get user info from context or localStorage fallback
        const username =
          user?.username || localStorage.getItem("username") || "unknown";
        const userId = user?._id || localStorage.getItem("userId") || "unknown";
        const userRole =
          user?.role || localStorage.getItem("userRole") || "unknown";

        await axios.patch(
          `${import.meta.env.VITE_API_STRING}/update-operations-job/${
            params.year
          }/${params.job_no}`,
          values,
          {
            headers: {
              username: username,
              "user-id": userId,
              "user-role": userRole,
            },
          }
        );

        // Determine which tab to navigate to
        const tabIndex = storedSearchParams?.currentTab ?? 2;

        // Set the current tab in context
        setCurrentTab(tabIndex);

        // Navigate back with all the stored search parameters
        // Close the tab after successful submit
        setTimeout(() => {
          window.close();
        }, 500);
      } catch (error) {
        console.error("Error updating job:", error);
      }
    },
  });

  // Update formik initial values when data is fetched from the database
  useEffect(() => {
    if (data) {
      const container_nos = data.container_nos?.map((container) => ({
        container_number: container.container_number || "",
        arrival_date: container.arrival_date || "",
        detention_from: container.detention_from || "",
        size: container.size || "",
        net_weight: container.net_weight || "",
        container_gross_weight: container.container_gross_weight || "",
        pre_weighment: container.pre_weighment || "",
        post_weighment: container.post_weighment || "",
        physical_weight: container.physical_weight || "",
        tare_weight: container.tare_weight || "",
        actual_weight: container.actual_weight || "",
        weight_shortage: container.weight_shortage || "",
        weight_excess: container.weight_excess || "",
        weighment_slip_images: container.weighment_slip_images || [],
        container_pre_damage_images:
          container.container_pre_damage_images || [],
        container_images: container.container_images || [],
        loose_material: container.loose_material || [],
        examination_videos: container.examination_videos || [],
        // Include all the missing fields to preserve them
        transporter: container.transporter || "",
        vehicle_no: container.vehicle_no || "",
        driver_name: container.driver_name || "",
        driver_phone: container.driver_phone || "",
        seal_no: container.seal_no || "",
        do_revalidation_date: container.do_revalidation_date || "",
        do_validity_upto_container_level:
          container.do_validity_upto_container_level || "",
        required_do_validity_upto: container.required_do_validity_upto || "",
        seal_number: container.seal_number || "",
        container_rail_out_date: container.container_rail_out_date || "",
        by_road_movement_date: container.by_road_movement_date || "",
        emptyContainerOffLoadDate: container.emptyContainerOffLoadDate || "",
        net_weight_as_per_PL_document:
          container.net_weight_as_per_PL_document || "",
        delivery_chalan_file: container.delivery_chalan_file || "",
        delivery_date: container.delivery_date || "",
        do_revalidation: container.do_revalidation || [],
      }));

      formik.setValues({
        container_nos,
        examination_date: data.examination_date || "",
        pcv_date: data.pcv_date || "",
        concor_gate_pass_date: data.concor_gate_pass_date || "",
        concor_gate_pass_validate_up_to:
          data.concor_gate_pass_validate_up_to || "",
        completed_operation_date: data.completed_operation_date || "",
        out_of_charge: data.out_of_charge || "",
        custodian_gate_pass: data.custodian_gate_pass || [],
        dsr_queries: data.dsr_queries || [],
        concor_invoice_and_receipt_copy:
          data.concor_invoice_and_receipt_copy || [],
      });
    }
  }, [data]); // When data changes, formik values are updated

  return { data, formik, setData };
}

export default useFetchOperationTeamJob;
