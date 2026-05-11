import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Box, Container, Paper, Typography, TextField, Button, Grid, 
  CircularProgress, Alert, Divider, MenuItem 
} from "@mui/material";
import axios from "axios";

const BLDraftForm = () => {
  const { enquiryId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [enquiry, setEnquiry] = useState(null);
  const [formData, setFormData] = useState({
    consignor: "",
    shipment_ref_no: "",
    consignee: "",
    notify_party: "",
    vessel_name: "",
    voyage_no: "",
    mode_of_transport: "SEA",
    route_transshipment: "",
    container_numbers: "",
    seal_numbers: "",
    marks_numbers: "",
    packages_description: "",
    description_of_goods: "",
    hsn_code: "",
    gross_weight: "",
    measurement: "",
    freight_amount: "AS AGREED",
    other_particulars: ""
  });

  useEffect(() => {
    const fetchEnquiry = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_STRING}/freight-enquiries/public/${enquiryId}`);
        if (res.data.success) {
          const fetchedEnquiry = res.data.data;
          setEnquiry(fetchedEnquiry);
          
          // Pre-fill from fetched data or existing bl_details
          const existingDetails = fetchedEnquiry.bl_details || {};
          setFormData(prev => ({
            ...prev,
            consignor: existingDetails.consignor || fetchedEnquiry.organization_name || "",
            mode_of_transport: existingDetails.mode_of_transport || (fetchedEnquiry.shipment_type?.includes("Air") ? "AIR" : "SEA"),
            gross_weight: existingDetails.gross_weight || fetchedEnquiry.gross_weight || "",
            ...existingDetails
          }));
        } else {
          setError(res.data.message);
        }
      } catch (err) {
        setError("Failed to load form. Link might be invalid or expired.");
      } finally {
        setLoading(false);
      }
    };
    fetchEnquiry();
  }, [enquiryId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_STRING}/freight-enquiries/public/${enquiryId}/bl-data`, formData);
      if (res.data.success) {
        setSuccess(true);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError("Failed to submit data. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: "#f0f2f5" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f0f2f5", display: "flex", alignItems: "center" }}>
        <Container maxWidth="sm">
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}>
            <Typography variant="h4" color="primary" gutterBottom sx={{ fontWeight: 900 }}>Submission Success!</Typography>
            <Typography variant="h6" sx={{ mb: 3, color: "text.primary" }}>Your information has been received.</Typography>
            <Typography variant="body1" color="text.secondary">
                The Bill of Lading draft will be updated with your details. You can safely close this window now.
            </Typography>
            <Button variant="contained" sx={{ mt: 4, px: 6, py: 1.5, borderRadius: 2, fontWeight: 800 }} onClick={() => window.close()}>
                Finish
            </Button>
            </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f2f5", py: 5 }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 3, md: 6 }, borderRadius: 5, boxShadow: "0 25px 80px rgba(0,0,0,0.06)" }}>
          <Box sx={{ mb: 5, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 1000, color: "#002884", letterSpacing: "-1px" }}>
              Bill of Lading Instruction
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                Please provide accurate details for MTD Reference: <strong>{enquiry?.enquiry_no}</strong>
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              
              {/* HEADER INFO */}
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth label="Consignor (Exporter)"
                  name="consignor" value={formData.consignor} onChange={handleChange}
                  multiline rows={3} required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth label="Shipment Ref. No."
                  name="shipment_ref_no" value={formData.shipment_ref_no} onChange={handleChange}
                />
              </Grid>

              {/* PARTIES */}
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Consignee (Name & Address)"
                  name="consignee" value={formData.consignee} onChange={handleChange}
                  multiline rows={4} required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Notify Address"
                  name="notify_party" value={formData.notify_party} onChange={handleChange}
                  multiline rows={3}
                  helperText="Leave blank if Same as Consignee"
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}><Divider><Typography variant="button" sx={{ px: 2, color: "text.secondary" }}>Transport Details</Typography></Divider></Grid>

              {/* TRANSPORT */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="Vessel & Voyage No."
                  name="vessel_name" value={formData.vessel_name} onChange={handleChange}
                  placeholder="e.g. EVER GIVEN V.032E"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth select label="Mode of Transport"
                  name="mode_of_transport" value={formData.mode_of_transport} onChange={handleChange}
                >
                  <MenuItem value="SEA">SEA</MenuItem>
                  <MenuItem value="AIR">AIR</MenuItem>
                  <MenuItem value="ROAD">ROAD</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth label="Route / Transshipment"
                  name="route_transshipment" value={formData.route_transshipment} onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}><Divider><Typography variant="button" sx={{ px: 2, color: "text.secondary" }}>Cargo Details</Typography></Divider></Grid>

              {/* CARGO */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="Container No (s)"
                  name="container_numbers" value={formData.container_numbers} onChange={handleChange}
                  multiline rows={2}
                  placeholder="Enter all container numbers"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="Marks & Numbers"
                  name="marks_numbers" value={formData.marks_numbers} onChange={handleChange}
                  multiline rows={2}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth label="Number and kind of packages"
                  name="packages_description" value={formData.packages_description} onChange={handleChange}
                  placeholder="e.g. 50 CARTONS"
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth label="General Description of Goods"
                  name="description_of_goods" value={formData.description_of_goods} onChange={handleChange}
                  multiline rows={3} required
                />
              </Grid>
              
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth label="Gross Weight"
                  name="gross_weight" value={formData.gross_weight} onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth label="Measurement"
                  name="measurement" value={formData.measurement} onChange={handleChange}
                  placeholder="e.g. 12.5 CBM"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth label="Freight Amount"
                  name="freight_amount" value={formData.freight_amount} onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth label="Other Particulars (If any)"
                  name="other_particulars" value={formData.other_particulars} onChange={handleChange}
                  multiline rows={2}
                />
              </Grid>

              <Grid item xs={12} sx={{ mt: 3 }}>
                <Button 
                  type="submit" variant="contained" fullWidth size="large"
                  disabled={submitting}
                  sx={{ 
                    py: 2.2, fontWeight: 900, borderRadius: 3, 
                    fontSize: "1.2rem", boxShadow: "0 10px 30px rgba(0, 40, 132, 0.25)"
                  }}
                >
                  {submitting ? <CircularProgress size={28} color="inherit" /> : "SUBMIT BL INSTRUCTIONS"}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default BLDraftForm;
