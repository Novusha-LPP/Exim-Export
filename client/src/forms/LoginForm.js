import React, { useContext } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import { UserContext } from "../contexts/UserContext";

function LoginPage() {
  const { setUser } = useContext(UserContext);

  const formik = useFormik({
    initialValues: {
      username: "",
      password: "",
    },

    onSubmit: async (values, { resetForm }) => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_STRING}/login`,
          values
        );

        if (res.status === 200) {
          localStorage.setItem("exim_user", JSON.stringify(res.data));
          setUser(res.data);
          resetForm();
        }
      } catch (error) {
        if (error.response && error.response.status === 400) {
          alert(error.response.data.message);
        } else {
          alert("An unexpected error occurred. Please try again later.");
        }
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <TextField
        size="small"
        fullWidth
        margin="dense"
        variant="filled"
        id="username"
        name="username"
        label="Username"
        value={formik.values.username}
        onChange={formik.handleChange}
        error={formik.touched.username && Boolean(formik.errors.username)}
        helperText={formik.touched.username && formik.errors.username}
      />
      <TextField
        type="password"
        size="small"
        fullWidth
        margin="dense"
        variant="filled"
        id="password"
        name="password"
        label="Password"
        value={formik.values.password}
        onChange={formik.handleChange}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
      />
      <button type="submit" className="btn">
        Login
      </button>
    </form>
  );
}

export default LoginPage;
