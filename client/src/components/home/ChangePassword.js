import React, { useContext } from "react";
import { useFormik } from "formik";
import { UserContext } from "../../contexts/UserContext";
import { TextField } from "@mui/material";
import { validationSchema } from "../../schemas/changePasswordSchema";
import axios from "axios";

function ChangePassword() {
  const { user } = useContext(UserContext);

  const formik = useFormik({
    initialValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
    validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const res = await axios.post(
        `${import.meta.env.VITE_API_STRING}/change-password`,
        { ...values, username: user.username }
      );
      alert(res.data.message);
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <h4>Change password</h4>
      <TextField
        size="small"
        type="password"
        fullWidth
        margin="dense"
        variant="outlined"
        id="current_password"
        name="current_password"
        label="Current password"
        value={formik.values.current_password}
        onChange={formik.handleChange}
        error={
          formik.touched.current_password &&
          Boolean(formik.errors.current_password)
        }
        helperText={
          formik.touched.current_password && formik.errors.current_password
        }
      />
      <TextField
        size="small"
        type="password"
        fullWidth
        margin="dense"
        variant="outlined"
        id="new_password"
        name="new_password"
        label="New password"
        value={formik.values.new_password}
        onChange={formik.handleChange}
        error={
          formik.touched.new_password && Boolean(formik.errors.new_password)
        }
        helperText={formik.touched.new_password && formik.errors.new_password}
      />

      <TextField
        size="small"
        type="password"
        fullWidth
        margin="dense"
        variant="outlined"
        id="confirm_password"
        name="confirm_password"
        label="Confirm password"
        value={formik.values.confirm_password}
        onChange={formik.handleChange}
        error={
          formik.touched.confirm_password &&
          Boolean(formik.errors.confirm_password)
        }
        helperText={
          formik.touched.confirm_password && formik.errors.confirm_password
        }
      />
      <button className="btn" type="submit">
        Submit
      </button>
    </form>
  );
}

export default ChangePassword;
