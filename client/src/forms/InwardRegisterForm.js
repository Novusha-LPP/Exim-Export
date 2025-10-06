import React, { useEffect, useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { handleSingleFileUpload } from "../utils/awsSingleFileUpload";
import Snackbar from "@mui/material/Snackbar";
import { validationSchema } from "../schemas/inwardRegister/inwardRegister";

function InwardRegisterForm() {
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const [data, setData] = useState([]);
  const [personNames, setPersonNames] = useState([]);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const date = new Date();
  var convertedDate = date.toLocaleDateString().split("/").reverse().join("-");

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${import.meta.env.VITE_API_STRING}/get-importer-list/24-25`
      );
      setData(res.data?.map((item) => item.importer));
    }

    async function getPersonNames() {
      const res = await axios(
        `${import.meta.env.VITE_API_STRING}/get-contact-person-names`
      );

      setPersonNames(res.data?.map((name) => name));
    }

    getData();
    getPersonNames();
  }, []);

  const formik = useFormik({
    initialValues: {
      time: currentTime,
      date: convertedDate,
      from: "",
      type: "",
      details_of_document: "",
      contact_person_name: "",
      inward_consignment_photo: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${import.meta.env.VITE_API_STRING}/add-inward-register`,
        values
      );
      alert(res.data.message);
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="feedback-form">
      <h3>Inward Register</h3>
      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="time"
        name="time"
        label="Time"
        value={formik.values.time}
        onChange={formik.handleChange}
        error={formik.touched.time && Boolean(formik.errors.time)}
        helperText={formik.touched.time && formik.errors.time}
        className="login-input"
      />

      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="date"
        name="date"
        label="Date"
        value={formik.values.date}
        onChange={formik.handleChange}
        error={formik.touched.date && Boolean(formik.errors.date)}
        helperText={formik.touched.date && formik.errors.date}
        className="login-input"
      />

      <TextField
        select
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="from"
        name="from"
        label="From"
        value={formik.values.from}
        onChange={formik.handleChange}
        error={formik.touched.from && Boolean(formik.errors.from)}
        helperText={formik.touched.from && formik.errors.from}
        className="login-input"
      >
        {data?.map((importer, id) => {
          return (
            <MenuItem value={importer} key={id}>
              {importer}
            </MenuItem>
          );
        })}
      </TextField>

      <TextField
        select
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="type"
        name="type"
        label="Import/ Export/ Accounts/ Transportation/ DGFT/ Miscellaneous"
        value={formik.values.type}
        onChange={formik.handleChange}
        error={formik.touched.type && Boolean(formik.errors.type)}
        helperText={formik.touched.type && formik.errors.type}
        className="login-input"
      >
        <MenuItem value="Import">Import</MenuItem>
        <MenuItem value="Export">Export</MenuItem>
        <MenuItem value="Accounts">Accounts</MenuItem>
        <MenuItem value="Transportation">Transportation</MenuItem>
        <MenuItem value="DGFT">DGFT</MenuItem>
        <MenuItem value="Miscellaneous">Miscellaneous</MenuItem>
      </TextField>

      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="details_of_document"
        name="details_of_document"
        label="Details of document"
        value={formik.values.details_of_document}
        onChange={formik.handleChange}
        error={
          formik.touched.details_of_document &&
          Boolean(formik.errors.details_of_document)
        }
        helperText={
          formik.touched.details_of_document &&
          formik.errors.details_of_document
        }
        className="login-input"
      />

      <TextField
        select
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="contact_person_name"
        name="contact_person_name"
        label="Contact Person Name"
        value={formik.values.contact_person_name}
        onChange={formik.handleChange}
        error={
          formik.touched.contact_person_name &&
          Boolean(formik.errors.contact_person_name)
        }
        helperText={
          formik.touched.contact_person_name &&
          formik.errors.contact_person_name
        }
        className="login-input"
      >
        {personNames?.map((personName, id) => {
          return (
            <MenuItem value={personName.trim()} key={id}>
              {personName.trim()}
            </MenuItem>
          );
        })}
      </TextField>

      <br />
      <br />
      <label htmlFor="inward_consignment_photo">
        Upload Inward Consignment Photo&nbsp;
      </label>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) =>
          handleSingleFileUpload(
            e,
            "inward_consignment_photo",
            "inward_register",
            formik,
            setFileSnackbar
          )
        }
      />
      {formik.touched.inward_consignment_photo &&
      formik.errors.inward_consignment_photo ? (
        <div style={{ color: "#D32F2F" }}>
          {formik.errors.inward_consignment_photo}
        </div>
      ) : null}
      {formik.values.inward_consignment_photo !== "" ? (
        <>
          <br />
          <a href={formik.values.inward_consignment_photo}>
            {formik.values.inward_consignment_photo}
            <br />
          </a>
        </>
      ) : (
        ""
      )}

      <button
        type="submit"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px" }}
      >
        Submit
      </button>

      <Snackbar
        open={fileSnackbar}
        message="File uploaded successfully!"
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </form>
  );
}

export default InwardRegisterForm;
