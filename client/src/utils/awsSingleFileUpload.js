import AWS from "aws-sdk";

export const handleSingleFileUpload = async (
  e,
  formikField,
  folderName,
  formik,
  setFileSnackbar
) => {
  if (e.target.files.length === 0) {
    alert("No file selected");
    return;
  }

  try {
    const file = e.target.files[0];
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

    formik.setValues((values) => ({
      ...values,
      [formikField]: photoUrl,
    }));

    setFileSnackbar(true);

    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);
  } catch (err) {
    console.error("Error uploading file:", err);
  }
};
