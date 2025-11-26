import { Box } from "@mui/material";
import ExportDirectory from "./ExportDirectory.js";
import StateDirectory from "./StateDirectory.js";
import AirlineCodeDirectory from "./AirlineCodeDirectory.js";
import Country from "./Country.js";
import TarrifHead from "./TarrifHead.js";
import ShippingLine from "./ShippingLine.js";
import EDILocation from "./EDILocation.js";
import NonEDILocation from "./NonEDILocation.js";
import PortCodeSea from "./PortCodeSea.js";
import PortCodeAir from "./PortCodeAir.js";
import Uqcs from "./Uqcs.js";
import Currency from "./Currency.js";
import Package from "./PackageDirectory.js";
import SupportingDocument from "./SupportingDocument.js";
function DirectoryComponent({ directoryType }) {
  console.log("Selected Directory Type:", directoryType); // Debugging log

  const renderDirectory = () => {
    switch (directoryType) {
      case "Organization": // ✅ Fix case to match viewMasterList
        return < ExportDirectory/>;
      case "State Code": // ✅ Added State Directory
        return <StateDirectory />;
      case "Airline Code": // ✅ Added Airline Code Directory
        return <AirlineCodeDirectory />;
      case "Country Code":
        return <Country/>;
      case "ITCHS and Standard UQC":
        return <TarrifHead/>;
      case "Shipping Line Code":
        return <ShippingLine />;
      case "Custom EDI Location": // ✅ Added EDI Location Directory
        return <EDILocation />;
      case "Custom Non-EDI Location": // ✅ Added Non-EDI Location Directory
        return <NonEDILocation />;
      case "Port Code-Sea":
        return <PortCodeSea />;
      case "Port Code-Air":
        return <PortCodeAir />;
      case "Unit Quantity Code (UQC)":
        return <Uqcs />;
      case "Currency":
        return <Currency />;
      case "Package":
        return <Package />;
      case "Supporting Document Codes":
        return <SupportingDocument />;
      default:
        console.log("No matching directory found for:", directoryType);
        return null;
    }
  };

  return <Box sx={{ width: "100%", mt: 2 }}>{renderDirectory()}</Box>;
}

export default DirectoryComponent;
