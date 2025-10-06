import AWS from "aws-sdk";

export const handleFileUpload = async (
  e,
  folderName,
  formikKey,
  formik,
  setFileSnackbar
) => {
  if (e.target.files.length === 0) {
    alert("No file selected");
    return;
  }

  try {
    const s3 = new AWS.S3({
      accessKeyId: import.meta.env.VITE_ACCESS_KEY,
      secretAccessKey: import.meta.env.VITE_SECRET_ACCESS_KEY,
      region: "ap-south-1",
    });

    const uploadedFiles = [];

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const params = {
        Bucket: import.meta.env.VITE_S3_BUCKET,
        Key: `${folderName}/${file.name}`,
        Body: file,
      };

      // Upload the file to S3 and wait for the promise to resolve
      const data = await s3.upload(params).promise();

      // Store the S3 URL in the uploadedFiles array
      uploadedFiles.push(data.Location);
    }

    // Update formik values with the uploaded file URLs
    formik.setValues((values) => ({
      ...values,
      [formikKey]: uploadedFiles,
    }));

    setFileSnackbar(true);

    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);
  } catch (err) {
    console.error("Error uploading files:", err);
  }
};

export const uploadFileToS3 = (file, folderName) => {
  AWS.config.update({
    region: "ap-south-1",
    accessKeyId: import.meta.env.VITE_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();

  const timestamp = Date.now(); // Unix timestamp in milliseconds
  const fileExtension = file.name.substring(file.name.lastIndexOf(".")); // Get the file extension
  const baseFileName = file.name.substring(0, file.name.lastIndexOf(".")); // Get base name without extension

  const uniqueFileName = `${baseFileName}-${timestamp}${fileExtension}`;

  const params = {
    Bucket: import.meta.env.VITE_S3_BUCKET,
    Key: `${folderName}/${uniqueFileName}`,
    Body: file,
    ContentType: file.type,
  };

  return s3.upload(params).promise();
};
