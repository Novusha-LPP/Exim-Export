export const navigateToModule = (module, navigate) => {
  switch (module) {
    case "Employee Onboarding":
      return navigate("/employee-onboarding");
    case "Employee KYC":
      return navigate("/employee-kyc");
    case "Import - DSR":
      return navigate("/import-dsr");
    case "Report":
      return navigate("/report");
    case "Audit Trail":
      return navigate("/audit-trail");
    case "Import - Operations":
      return navigate("/import-operations");
    case "Import - Add":
      return navigate("/ImportersInfo");
    case "Import - Billing":
      return navigate("/import-billing");
    case "Import Utility Tool":
      return navigate("/utilities");
    case "Import - DO":
      return navigate("/import-do");
    case "Inward Register":
      return navigate("/inward-register");
    case "Outward Register":
      return navigate("/outward-register");
    case "Accounts":
      return navigate("/accounts");
    case "Customer KYC":
      return (window.location.href =
        "http://eximcustomerkyc.s3-website.ap-south-1.amazonaws.com/customer-kyc");
    case "Exit Feedback":
      return navigate("/exit-feedback");
    case "e-Sanchit":
      return navigate("/e-sanchit");
    case "Directories":
      return navigate("/export-directories");
    case "Export - Jobs":
      return navigate("/export-dsr");
    case "Export - Audit Trail":
      return navigate("/export-audit-trail");
    case "Documentation":
      return navigate("/documentation");
    case "Submission":
      return navigate("/submission");
    case "Screen1":
      return navigate("/screen1");
    case "Screen2":
      return navigate("/screen2");
    case "Screen3":
      return navigate("/screen3");
    case "Screen4":
      return navigate("/screen4");
    case "Screen5":
      return navigate("/screen5");
    case "Screen6":
      return navigate("/screen6");
    case "Open Points":
      return navigate("/open-points");
    default:
      return navigate("/home");
  }
};
