import React, { useState, useEffect } from "react";
import { MenuItem, TextField } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { validationSchema } from "../schemas/outwardRegister/outwardRegister";

function OutwardRegisterForm() {
  const [data, setData] = useState([]);
  const date = new Date();
  var convertedDate = date.toLocaleDateString().split("/").reverse().join("-");

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${import.meta.env.VITE_API_STRING}/get-importer-list/24-25`
      );
      setData(res.data?.map((item) => item.importer));
    }

    getData();
  }, []);

  const formik = useFormik({
    initialValues: {
      bill_given_date: convertedDate,
      party: "",
      division: "Import",
      party_email: "",
      description: "",
      kind_attention: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${import.meta.env.VITE_API_STRING}/add-outward-register`,
        values
      );
      alert(res.data.message);
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="feedback-form">
      <TextField
        type="date"
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="bill_given_date"
        name="bill_given_date"
        label="Courier Given Date"
        value={formik.values.bill_given_date}
        onChange={formik.handleChange}
        error={
          formik.touched.bill_given_date &&
          Boolean(formik.errors.bill_given_date)
        }
        helperText={
          formik.touched.bill_given_date && formik.errors.bill_given_date
        }
        className="login-input"
      />

      <TextField
        select
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="party"
        name="party"
        label="Party"
        value={formik.values.party}
        onChange={formik.handleChange}
        error={formik.touched.party && Boolean(formik.errors.party)}
        helperText={formik.touched.party && formik.errors.party}
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
        id="division"
        name="division"
        label="Division"
        value={formik.values.division}
        onChange={formik.handleChange}
        error={formik.touched.division && Boolean(formik.errors.division)}
        helperText={formik.touched.division && formik.errors.division}
        className="login-input"
      >
        <MenuItem value="Import">Import</MenuItem>
        <MenuItem value="Export">Export</MenuItem>
        <MenuItem value="Freight Forwarding">Freight Forwarding</MenuItem>
        <MenuItem value="Others">Others</MenuItem>
      </TextField>

      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="party_email"
        name="party_email"
        label="Email of Party"
        value={formik.values.party_email}
        onChange={formik.handleChange}
        error={formik.touched.party_email && Boolean(formik.errors.party_email)}
        helperText={formik.touched.party_email && formik.errors.party_email}
        className="login-input"
      />

      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="description"
        name="description"
        label="Description"
        value={formik.values.description}
        onChange={formik.handleChange}
        error={formik.touched.description && Boolean(formik.errors.description)}
        helperText={formik.touched.description && formik.errors.description}
        className="login-input"
      />

      <TextField
        size="small"
        margin="dense"
        variant="filled"
        fullWidth
        id="kind_attention"
        name="kind_attention"
        label="Kind Attention"
        value={formik.values.kind_attention}
        onChange={formik.handleChange}
        error={
          formik.touched.kind_attention && Boolean(formik.errors.kind_attention)
        }
        helperText={
          formik.touched.kind_attention && formik.errors.kind_attention
        }
        className="login-input"
      />

      <button
        type="submit"
        className="btn"
        aria-label="submit-btn"
        style={{ marginBottom: "20px" }}
      >
        Submit
      </button>
    </form>
  );
}

export default OutwardRegisterForm;
