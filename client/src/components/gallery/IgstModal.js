import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip,
  InputAdornment,
} from "@mui/material";

import {
  Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon,
  AccountBalance as AccountBalanceIcon,
  HelpOutline as HelpOutlineIcon,
  MonetizationOn as MonetizationOnIcon,
  Gavel as GavelIcon,
  Summarize as SummarizeIcon,
  Public as PublicIcon,
  ReceiptLong as ReceiptLongIcon,
  Schedule as ScheduleIcon,
  WarningAmber as WarningAmberIcon,
  Calculate as CalculateIcon,
  InfoOutlined as InfoOutlinedIcon,
  Save as SaveIcon,
} from "@mui/icons-material";

const IgstModal = ({
  open,
  onClose,
  onSubmit,
  rowData,
  dates,
  containers = [],
}) => {
  const [igstValues, setIgstValues] = useState({
    assessable_ammount: "",
    igst_ammount: "",
    bcd_ammount: "",
    sws_ammount: "",
    intrest_ammount: "",
    penalty_amount: "", // This will be manually entered
    fine_amount: "", // This will be auto-calculated
    bcdRate: "",
    swsRate: "10",
    igstRate: "",
    penalty_by_us: false,
    penalty_by_importer: false,
    zero_penalty_as_per_bill_of_entry: false,
  });
  // Initialize IGST values when modal opens or rowData changes
  useEffect(() => {
    if (open && rowData) {
      setIgstValues({
        assessable_ammount: rowData.assessable_ammount || "",
        igst_ammount: rowData.igst_ammount || "",
        bcd_ammount: rowData.bcd_ammount || "",
        sws_ammount: rowData.sws_ammount || "",
        intrest_ammount: rowData.intrest_ammount || "",
        penalty_amount: rowData.penalty_amount || "", // Manually entered
        fine_amount: rowData.fine_amount || "", // Will be recalculated
        bcdRate: "",
        swsRate: "10",
        igstRate: rowData.igst_rate || "",
        penalty_by_us: rowData.penalty_by_us || false,
        penalty_by_importer: rowData.penalty_by_importer || false,
        zero_penalty_as_per_bill_of_entry:
          rowData.zero_penalty_as_per_bill_of_entry || false,
      });
    }
  }, [open, rowData]);
  // Utility function to calculate number of days between two dates
  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate interest amount
  const calculateInterestAmount = () => {
    const totalDuty =
      parseFloat(igstValues.bcd_ammount || 0) +
      parseFloat(igstValues.sws_ammount || 0) +
      parseFloat(igstValues.igst_ammount || 0);

    const assessmentDate = dates?.assessment_date || rowData?.assessment_date;
    const dutyPaidDate = dates?.duty_paid_date || rowData?.duty_paid_date;

    if (totalDuty <= 0 || !assessmentDate || !dutyPaidDate) return 0;

    const assessmentDateObj = new Date(assessmentDate);
    const dutyPaidDateObj = new Date(dutyPaidDate);

    if (isNaN(assessmentDateObj.getTime()) || isNaN(dutyPaidDateObj.getTime()))
      return 0;
    if (dutyPaidDateObj <= assessmentDateObj) return 0;

    const daysBetween = calculateDaysBetween(assessmentDate, dutyPaidDate);
    const interestAmount = ((totalDuty * 15) / 100 / 365) * daysBetween;

    return Math.round(interestAmount * 100) / 100;
  };

  // Calculate penalty amount
  const calculateFineAmount = () => {
    const beDate = rowData?.be_date;

    // Get arrival_date from containers (use the first container that has arrival_date)
    const containerWithArrival = containers.find((c) => c.arrival_date);
    const arrivalDate = containerWithArrival
      ? containerWithArrival.arrival_date
      : null;

    if (!arrivalDate) return 0;

    const arrivalDateObj = new Date(arrivalDate);
    const beDateObj = beDate ? new Date(beDate) : null;

    if (isNaN(arrivalDateObj.getTime())) return 0;

    // Rule 1: If BE Date and Arrival Date are the same, fine is ₹5000 flat
    if (
      beDateObj &&
      !isNaN(beDateObj.getTime()) &&
      arrivalDateObj.toDateString() === beDateObj.toDateString()
    ) {
      return 5000;
    }

    // Rule 2: If BE Date is missing, calculate fine from arrival date to today
    if (!beDate) {
      const today = new Date();
      // Calculate days including both start and end dates
      const timeDiff = today.getTime() - arrivalDateObj.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

      if (daysDiff <= 0) return 0;

      let fine = 0;

      // First 3 days: ₹5000 per day (including arrival date)
      const firstThreeDays = Math.min(daysDiff, 3);
      fine += firstThreeDays * 5000;

      // From 4th day onward: ₹10000 per day
      if (daysDiff > 3) {
        const remainingDays = daysDiff - 3;
        fine += remainingDays * 10000;
      }
      return fine;
    }

    // Rule 3: If both dates are present and BE Date is later than Arrival Date
    if (beDateObj && !isNaN(beDateObj.getTime())) {
      // If BE Date is before or same as Arrival Date, no fine
      if (beDateObj <= arrivalDateObj) {
        return 0;
      }

      // Calculate days including both start and end dates
      const timeDiff = beDateObj.getTime() - arrivalDateObj.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

      if (daysDiff <= 0) return 0;

      let fine = 0;

      // First 3 days (including arrival date): ₹5000 per day
      const firstThreeDays = Math.min(daysDiff, 3);
      fine += firstThreeDays * 5000;

      // From 4th day onward until BE Date: ₹10000 per day
      if (daysDiff > 3) {
        const remainingDays = daysDiff - 3;
        fine += remainingDays * 10000;
      }

      return fine;
    }

    return 0;
  };

  // Calculate duty amounts based on assessable value
  const calculateDutyAmounts = () => {
    const assessableValue = parseFloat(igstValues.assessable_ammount || 0);
    const bcdRate = parseFloat(igstValues.bcdRate || 0);
    const swsRate = parseFloat(igstValues.swsRate || 10);
    const igstRate = parseFloat(igstValues.igstRate || 0);

    if (assessableValue <= 0) return;

    if (bcdRate > 0 || igstRate > 0) {
      const bcdAmount = (assessableValue * bcdRate) / 100;
      const swsAmount = (bcdAmount * swsRate) / 100;
      const igstAmount =
        ((assessableValue + bcdAmount + swsAmount) * igstRate) / 100;

      setIgstValues((prev) => ({
        ...prev,
        bcd_ammount: bcdAmount.toFixed(2),
        sws_ammount: swsAmount.toFixed(2),
        igst_ammount: igstAmount.toFixed(2),
      }));
    }
  };

  // Auto-calculate duty amounts when rates or assessable value change
  useEffect(() => {
    if (
      igstValues.assessable_ammount &&
      (igstValues.bcdRate || igstValues.swsRate || igstValues.igstRate)
    ) {
      const timeoutId = setTimeout(calculateDutyAmounts, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    igstValues.assessable_ammount,
    igstValues.bcdRate,
    igstValues.swsRate,
    igstValues.igstRate,
  ]);

  // Force calculation when modal opens and values are available
  useEffect(() => {
    if (
      igstValues.assessable_ammount &&
      (igstValues.bcdRate || igstValues.swsRate || igstValues.igstRate)
    ) {
      const timeoutId = setTimeout(calculateDutyAmounts, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    igstValues.assessable_ammount,
    igstValues.bcdRate,
    igstValues.swsRate,
    igstValues.igstRate,
  ]);

  // Auto-calculate interest and FINE when relevant values change
  useEffect(() => {
    const interestAmount = calculateInterestAmount();
    const fineAmount = calculateFineAmount();

    setIgstValues((prev) => ({
      ...prev,
      intrest_ammount: interestAmount.toFixed(2),
      fine_amount: fineAmount.toFixed(2),
    }));
  }, [
    igstValues.bcd_ammount,
    igstValues.sws_ammount,
    igstValues.igst_ammount,
    dates?.assessment_date,
    dates?.duty_paid_date,
    rowData?.assessment_date,
    rowData?.duty_paid_date,
    rowData?.be_date,
    containers,
  ]);

  const handleCthDataFetch = async () => {
    if (rowData?.cth_no && rowData?.job_no) {
      try {
        const apiUrl =
          import.meta.env.VITE_API_STRING || "http://localhost:9000";
        const response = await fetch(
          `${apiUrl}/jobs/${rowData.job_no}/update-duty-from-cth`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ cth_no: rowData.cth_no }),
          }
        );

        if (response.ok) {
          const result = await response.json(); // Extract rates from CTH data - ALWAYS prioritize basic_duty_ntfn (including "0")
          const bcdNtfnValue = result.addedFields?.cth_basic_duty_ntfn;
          const bcdSchValue = result.addedFields?.cth_basic_duty_sch;

          // Logic: ALWAYS use basic_duty_ntfn if it exists and is a valid number (including "0")
          let bcdRate = 0;

          // Check if basic_duty_ntfn is present and valid (including "0")
          const isBcdNtfnValid =
            bcdNtfnValue !== null &&
            bcdNtfnValue !== undefined &&
            bcdNtfnValue !== "" &&
            bcdNtfnValue !== "nan" &&
            bcdNtfnValue !== "NaN" &&
            !isNaN(parseFloat(bcdNtfnValue));

          if (isBcdNtfnValid) {
            bcdRate = parseFloat(bcdNtfnValue);
          } else if (
            bcdSchValue &&
            bcdSchValue !== "" &&
            bcdSchValue !== "nan" &&
            bcdSchValue !== "NaN" &&
            !isNaN(parseFloat(bcdSchValue))
          ) {
            bcdRate = parseFloat(bcdSchValue);
          }

          setIgstValues((prev) => ({
            ...prev,
            bcdRate: bcdRate.toString(),
            igstRate: result.addedFields?.cth_igst_ammount || prev.igstRate,
            swsRate: "10",
            ...(prev.assessable_ammount && {
              bcd_ammount:
                result.addedFields?.cth_bcd_ammount || prev.bcd_ammount,
              sws_ammount:
                result.addedFields?.cth_sws_ammount || prev.sws_ammount,
              igst_ammount:
                result.addedFields?.cth_igst_ammount || prev.igst_ammount,
            }),
          }));

          setTimeout(() => {
            calculateDutyAmounts();
          }, 100);
        }
      } catch (error) {
        console.error("Error in CTH duty lookup:", error);
      }
    }
  };

  // Call CTH data fetch when modal opens
  useEffect(() => {
    if (open) {
      handleCthDataFetch();
    }
  }, [open]);

  const handleSubmit = () => {
    const totalDuty = (
      parseFloat(igstValues.bcd_ammount || 0) +
      parseFloat(igstValues.igst_ammount || 0) +
      parseFloat(igstValues.sws_ammount || 0) +
      parseFloat(igstValues.intrest_ammount || 0) +
      parseFloat(igstValues.penalty_amount || 0) + // Manually entered penalty
      parseFloat(igstValues.fine_amount || 0)
    ) // Auto-calculated fine
      .toFixed(2);

    const updateData = {
      assessable_ammount: igstValues.assessable_ammount,
      igst_ammount: igstValues.igst_ammount,
      bcd_ammount: igstValues.bcd_ammount,
      sws_ammount: igstValues.sws_ammount,
      intrest_ammount: igstValues.intrest_ammount,
      penalty_amount: igstValues.penalty_amount, // Manually entered
      fine_amount: igstValues.fine_amount, // Auto-calculated
      total_duty: totalDuty,
      igst_rate: igstValues.igstRate,
      penalty_by_us: igstValues.penalty_by_us,
      penalty_by_importer: igstValues.penalty_by_importer,
      zero_penalty_as_per_bill_of_entry:
        igstValues.zero_penalty_as_per_bill_of_entry,
    };

    onSubmit(updateData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "12px",
          maxHeight: "87vh",
          background: "#ffffff",
          border: "1px solid #e0e0e0",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: "linear-gradient(to right, #f8f9fa, #e9ecef)",
          borderBottom: "1px solid #dee2e6",
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "linear-gradient(135deg, #3f51b5 0%, #2196f3 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              }}
            >
              <ReceiptIcon sx={{ color: "white", fontSize: 18 }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: "#2d3748", fontSize: "1.1rem" }}
              >
                Duty Payment Calculator
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "#718096", fontSize: "0.7rem" }}
              >
                Calculate customs duties and taxes
              </Typography>
            </Box>
          </Box>
          {rowData?.cth_no && (
            <Chip
              label={`CTH: ${rowData.cth_no}`}
              size="small"
              sx={{
                fontSize: "0.7rem",
                fontWeight: 600,
                backgroundColor: "#edf2f7",
                color: "#2d3748",
                border: "1px solid #cbd5e0",
                height: 26,
              }}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
            gap: 0,
          }}
        >
          {/* Left Side - Input Fields */}
          <Box sx={{ p: 2, borderRight: { md: "1px solid #e2e8f0" } }}>
            {/* Assessable Amount */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#4a5568",
                  mb: 0.5,
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <AttachMoneyIcon sx={{ fontSize: 16, color: "#4a5568" }} />
                Assessable Amount (INR)
              </Typography>
              <TextField
                type="number"
                value={igstValues.assessable_ammount}
                onChange={(e) =>
                  setIgstValues((prev) => ({
                    ...prev,
                    assessable_ammount: e.target.value,
                  }))
                }
                fullWidth
                variant="outlined"
                size="small"
                placeholder="0.00"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ color: "#718096", fontSize: "0.9rem" }}>
                        ₹
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "#f8fafc",
                    borderRadius: "6px",
                    "& fieldset": { borderColor: "#e2e8f0" },
                    "&:hover fieldset": { borderColor: "#cbd5e0" },
                    "&.Mui-focused fieldset": { borderColor: "#4299e1" },
                  },
                  "& .MuiInputBase-input": {
                    py: 1,
                    fontSize: "0.9rem",
                  },
                }}
              />
            </Box>

            {/* Duty Components Grid */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: "#4a5568",
                mb: 1,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 16, color: "#4a5568" }} />
              Duty Components
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mb: 2,
              }}
            >
              {/* BCD Rate & Amount */}
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#2d3748",
                    }}
                  >
                    BCD Rate (%)
                  </Typography>
                  <Tooltip title="Basic Customs Duty">
                    <HelpOutlineIcon sx={{ fontSize: 14, color: "#718096" }} />
                  </Tooltip>
                </Box>
                <TextField
                  type="number"
                  value={igstValues.bcdRate}
                  onChange={(e) =>
                    setIgstValues((prev) => ({
                      ...prev,
                      bcdRate: e.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                  placeholder="0.00"
                  sx={{
                    mb: 1,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "4px",
                      "& fieldset": { borderColor: "#e2e8f0" },
                      "&:hover fieldset": { borderColor: "#cbd5e0" },
                      "&.Mui-focused fieldset": { borderColor: "#4299e1" },
                    },
                    "& .MuiInputBase-input": {
                      py: 1,
                      fontSize: "0.85rem",
                    },
                  }}
                />
                <Box
                  sx={{
                    p: 1,
                    backgroundColor: "#ebf8ff",
                    borderRadius: "4px",
                    border: "1px solid #bee3f8",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#2b6cb0",
                      textAlign: "center",
                    }}
                  >
                    ₹
                    {parseFloat(igstValues.bcd_ammount || 0).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* SWS Rate & Amount */}
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#2d3748",
                    }}
                  >
                    SWS Rate (%)
                  </Typography>
                  <Tooltip title="Social Welfare Surcharge">
                    <HelpOutlineIcon sx={{ fontSize: 14, color: "#718096" }} />
                  </Tooltip>
                </Box>
                <TextField
                  type="number"
                  value={igstValues.swsRate}
                  onChange={(e) =>
                    setIgstValues((prev) => ({
                      ...prev,
                      swsRate: e.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                  placeholder="10.00"
                  sx={{
                    mb: 1,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "4px",
                      "& fieldset": { borderColor: "#e2e8f0" },
                      "&:hover fieldset": { borderColor: "#cbd5e0" },
                      "&.Mui-focused fieldset": { borderColor: "#4299e1" },
                    },
                    "& .MuiInputBase-input": {
                      py: 1,
                      fontSize: "0.85rem",
                    },
                  }}
                />
                <Box
                  sx={{
                    p: 1,
                    backgroundColor: "#fff5f5",
                    borderRadius: "4px",
                    border: "1px solid #fed7d7",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#c53030",
                      textAlign: "center",
                    }}
                  >
                    ₹
                    {parseFloat(igstValues.sws_ammount || 0).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* IGST Rate & Amount */}
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#2d3748",
                    }}
                  >
                    IGST Rate (%)
                  </Typography>
                  <Tooltip title="Integrated Goods and Services Tax">
                    <HelpOutlineIcon sx={{ fontSize: 14, color: "#718096" }} />
                  </Tooltip>
                </Box>
                <TextField
                  type="number"
                  value={igstValues.igstRate}
                  onChange={(e) =>
                    setIgstValues((prev) => ({
                      ...prev,
                      igstRate: e.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                  placeholder="0.00"
                  sx={{
                    mb: 1,
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "4px",
                      "& fieldset": { borderColor: "#e2e8f0" },
                      "&:hover fieldset": { borderColor: "#cbd5e0" },
                      "&.Mui-focused fieldset": { borderColor: "#4299e1" },
                    },
                    "& .MuiInputBase-input": {
                      py: 1,
                      fontSize: "0.85rem",
                    },
                  }}
                />
                <Box
                  sx={{
                    p: 1,
                    backgroundColor: "#faf5ff",
                    borderRadius: "4px",
                    border: "1px solid #e9d8fd",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#6b46c1",
                      textAlign: "center",
                    }}
                  >
                    ₹
                    {parseFloat(igstValues.igst_ammount || 0).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Typography>
                </Box>
              </Box>

              {/* panlty Amount */}
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#2d3748",
                    mb: 0.5,
                  }}
                >
                  Penalty Amount (INR)
                </Typography>
                <TextField
                  type="number"
                  value={igstValues.penalty_amount}
                  onChange={(e) =>
                    setIgstValues((prev) => ({
                      ...prev,
                      penalty_amount: e.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography
                          sx={{ color: "#718096", fontSize: "0.9rem" }}
                        >
                          ₹
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "white",
                      borderRadius: "4px",
                      "& fieldset": { borderColor: "#e2e8f0" },
                      "&:hover fieldset": { borderColor: "#cbd5e0" },
                      "&.Mui-focused fieldset": { borderColor: "#4299e1" },
                    },
                    "& .MuiInputBase-input": {
                      py: 1,
                      fontSize: "0.85rem",
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Additional Charges */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: "#4a5568",
                mb: 1,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <MonetizationOnIcon sx={{ fontSize: 16, color: "#4a5568" }} />
              Additional Charges
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mb: 2,
              }}
            >
              {/* Interest Amount */}
              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#2d3748",
                    }}
                  >
                    Interest Amount
                  </Typography>
                  <Chip
                    label="Auto-calculated"
                    size="small"
                    sx={{
                      fontSize: "0.6rem",
                      height: 18,
                      backgroundColor: "#ebf8ff",
                      color: "#3182ce",
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    backgroundColor: "#ebf8ff",
                    borderRadius: "4px",
                    border: "1px solid #bee3f8",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#2b6cb0",
                    }}
                  >
                    ₹
                    {parseFloat(igstValues.intrest_ammount || 0).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    color: "#718096",
                    textAlign: "center",
                    mt: 0.5,
                  }}
                >
                  15% p.a. from assessment to payment date
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#2d3748",
                    }}
                  >
                    Fine Amount
                  </Typography>
                  <Chip
                    label="Auto-calculated"
                    size="small"
                    sx={{
                      fontSize: "0.6rem",
                      height: 18,
                      backgroundColor: "#fff5f5",
                      color: "#e53e3e",
                    }}
                  />
                </Box>
                <Box
                  sx={{
                    p: 1.25,
                    backgroundColor: "#fff5f5",
                    borderRadius: "4px",
                    border: "1px solid #fed7d7",
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#c53030",
                    }}
                  >
                    ₹
                    {parseFloat(igstValues.fine_amount || 0).toLocaleString(
                      "en-IN",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    color: "#718096",
                    textAlign: "center",
                    mt: 0.5,
                  }}
                >
                  Based on BE vs arrival date comparison
                </Typography>
              </Box>
            </Box>

            {/* Penalty Options */}
            <Box
              sx={{
                p: 1.5,
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                backgroundColor: "#f8fafc",
                mb: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#4a5568",
                  mb: 1,
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <GavelIcon sx={{ fontSize: 16, color: "#4a5568" }} />
                Penalty Responsibility
              </Typography>

              <RadioGroup
                row // <-- 👈 this makes it horizontal
                value={
                  igstValues.penalty_by_us
                    ? "company"
                    : igstValues.penalty_by_importer
                    ? "importer"
                    : igstValues.zero_penalty_as_per_bill_of_entry
                    ? "zero"
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setIgstValues((prev) => ({
                    ...prev,
                    penalty_by_us: value === "company",
                    penalty_by_importer: value === "importer",
                    zero_penalty_as_per_bill_of_entry: value === "zero",
                  }));
                }}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "flex-start", // or "space-between" if you want them spread out
                  gap: 2,
                }}
              >
                {/* Penalty by Us */}
                <FormControlLabel
                  value="company"
                  control={
                    <Radio
                      size="small"
                      sx={{
                        color: "#3182ce",
                        "&.Mui-checked": {
                          color: "#3182ce",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#2d3748",
                      }}
                    >
                      Penalty By Us
                    </Typography>
                  }
                  sx={{
                    m: 0,
                    p: 0.5,
                    borderRadius: "4px",
                    backgroundColor: igstValues.penalty_by_us
                      ? "#ebf8ff"
                      : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#f0f5ff",
                    },
                  }}
                />

                {/* Penalty by Importer */}
                <FormControlLabel
                  value="importer"
                  control={
                    <Radio
                      size="small"
                      sx={{
                        color: "#38a169",
                        "&.Mui-checked": {
                          color: "#38a169",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#2d3748",
                      }}
                    >
                      Penalty By Importer
                    </Typography>
                  }
                  sx={{
                    m: 0,
                    p: 0.5,
                    borderRadius: "4px",
                    backgroundColor: igstValues.penalty_by_importer
                      ? "#f0fff4"
                      : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#f0fff4",
                    },
                  }}
                />

                {/* Zero Penalty */}
                <FormControlLabel
                  value="zero"
                  control={
                    <Radio
                      size="small"
                      disabled={
                        parseFloat(igstValues.penalty_amount || 0) > 10000
                      }
                      sx={{
                        color: "#9f7aea",
                        "&.Mui-checked": {
                          color: "#9f7aea",
                        },
                        "&.Mui-disabled": {
                          color: "#e2e8f0",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color:
                          parseFloat(igstValues.penalty_amount || 0) > 10000
                            ? "#a0aec0"
                            : "#2d3748",
                      }}
                    >
                      Zero Penalty as per Bill of Entry
                      {parseFloat(igstValues.penalty_amount || 0) > 10000 && (
                        <Tooltip title="Disabled for penalties above ₹10,000">
                          <InfoOutlinedIcon
                            sx={{
                              fontSize: 14,
                              color: "#a0aec0",
                              ml: 0.5,
                              verticalAlign: "text-bottom",
                            }}
                          />
                        </Tooltip>
                      )}
                    </Typography>
                  }
                  sx={{
                    m: 0,
                    p: 0.5,
                    borderRadius: "4px",
                    backgroundColor:
                      igstValues.zero_penalty_as_per_bill_of_entry
                        ? "#faf5ff"
                        : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#faf5ff",
                    },
                    opacity:
                      parseFloat(igstValues.penalty_amount || 0) > 10000
                        ? 0.7
                        : 1,
                  }}
                />
              </RadioGroup>
            </Box>
          </Box>

          {/* Right Side - Summary Panel */}
          <Box
            sx={{
              p: 2,
              backgroundColor: "#f8fafc",
              borderLeft: { md: "1px solid #e2e8f0" },
              height: "100%",
              overflow: "auto",
            }}
          >
            {/* Summary Section */}
            <Box
              sx={{
                mb: 2,
                borderBottom: "1px solid #e2e8f0",
                pb: 1.5,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: "#2d3748",
                  mb: 1.5,
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <SummarizeIcon sx={{ fontSize: 18, color: "#4a5568" }} />
                Duty Summary
              </Typography>

              {/* Breakdown List */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 0.75,
                  mb: 2,
                }}
              >
                {[
                  {
                    label: "Basic Customs Duty (BCD)",
                    value: igstValues.bcd_ammount,
                    color: "#3182ce",
                    icon: <AccountBalanceIcon sx={{ fontSize: 14 }} />,
                  },
                  {
                    label: "Social Welfare Surcharge (SWS)",
                    value: igstValues.sws_ammount,
                    color: "#dd6b20",
                    icon: <PublicIcon sx={{ fontSize: 14 }} />,
                  },
                  {
                    label: "Integrated GST (IGST)",
                    value: igstValues.igst_ammount,
                    color: "#805ad5",
                    icon: <ReceiptLongIcon sx={{ fontSize: 14 }} />,
                  },
                  {
                    label: "Interest Amount",
                    value: igstValues.intrest_ammount,
                    color: "#d69e2e",
                    icon: <ScheduleIcon sx={{ fontSize: 14 }} />,
                  },
                  {
                    label: "Penalty Amount",
                    value: igstValues.penalty_amount,
                    color: "#e53e3e",
                    icon: <WarningAmberIcon sx={{ fontSize: 14 }} />,
                  },
                  {
                    label: "Fine Amount",
                    value: igstValues.fine_amount,
                    color: "#38a169",
                    icon: <MonetizationOnIcon sx={{ fontSize: 14 }} />,
                  },
                ].map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      backgroundColor: "white",
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "4px",
                          backgroundColor: `${item.color}10`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: item.color,
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          color: "#4a5568",
                          fontWeight: 500,
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: item.color,
                      }}
                    >
                      ₹
                      {parseFloat(item.value || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Total Section */}
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  color: "#2d3748",
                  mb: 1.5,
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <CalculateIcon sx={{ fontSize: 18, color: "#4a5568" }} />
                Total Duty Payable
              </Typography>

              <Box
                sx={{
                  p: 2,
                  backgroundColor: "#ffffff",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  textAlign: "center",
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#2d3748",
                    mb: 0.25,
                  }}
                >
                  ₹
                  {(
                    parseFloat(igstValues.bcd_ammount || 0) +
                    parseFloat(igstValues.igst_ammount || 0) +
                    parseFloat(igstValues.sws_ammount || 0) +
                    parseFloat(igstValues.intrest_ammount || 0) +
                    parseFloat(igstValues.penalty_amount || 0) +
                    parseFloat(igstValues.fine_amount || 0)
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.65rem",
                    color: "#718096",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Total Customs Duty & Taxes
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 1,
                  backgroundColor: "#f0fff4",
                  borderRadius: "4px",
                  border: "1px solid #c6f6d5",
                  textAlign: "center",
                }}
              >
                <Typography sx={{ fontSize: "0.65rem", color: "#2f855a" }}>
                  <strong>Note:</strong> All amounts are in Indian Rupees (INR)
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 1,
          borderTop: "1px solid #e2e8f0",
          backgroundColor: "#f8f9fa",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            px: 1.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.65rem",
              color: "#718096",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 12 }} />
            Interest & penalty amounts are calculated automatically
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{
                borderRadius: "4px",
                px: 2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.75rem",
                borderColor: "#cbd5e0",
                color: "#4a5568",
                minWidth: 80,
                "&:hover": {
                  borderColor: "#a0aec0",
                  backgroundColor: "rgba(203, 213, 224, 0.1)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{
                borderRadius: "4px",
                px: 2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.75rem",
                backgroundColor: "#3182ce",
                minWidth: 120,
                "&:hover": {
                  backgroundColor: "#2c5282",
                },
              }}
              startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
            >
              Save Calculation
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default IgstModal;
