export const navigateToModule = (module, navigate) => {
  switch (module) {
    case "Directories":
      return navigate("/export-directories");
    case "Export - Jobs":
      return navigate("/export-dsr");
    case "Export - VGM":
      const vgmUrl = "http://handover-odex.s3-website.ap-south-1.amazonaws.com";
      const vgmLink = document.createElement("a");
      vgmLink.href = vgmUrl;
      vgmLink.target = "_blank";
      vgmLink.rel = "noopener noreferrer";
      vgmLink.click();
      return;
    case "Export - Documentation":
      return navigate("/export-documentation");
    case "Export - ESanchit":
      return navigate("/export-esanchit");
    case "Export - Operation":
      return navigate("/export-operation");
    case "Export - Charges":
      return navigate("/export-charges");
    case "Export - Audit Trail":
      return navigate("/export-audit-trail");
    case "Export - Reports":
      return navigate("/report");
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
