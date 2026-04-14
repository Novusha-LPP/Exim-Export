import { Box } from "@mui/material";
import ExportDirectory from "./ExportDirectory.js";
import AirlineCodeDirectory from "./AirlineCodeDirectory.js";
import Country from "./Country.js";
import ShippingLine from "./ShippingLine.js";
import PortCodeSea from "./PortCodeSea.js";
import PortCodeAir from "./PortCodeAir.js";
import GatewayPortDirectory from "./GatwayPort.js";

function DirectoryComponent({ directoryType }) {
  const renderDirectory = () => {
    switch (directoryType) {
      case "Organization":
        return <ExportDirectory />;
      case "Airline Code":
        return <AirlineCodeDirectory />;
      case "Country Code":
        return <Country />;
      case "Shipping Line Code":
        return <ShippingLine />;
      case "Port Code-Sea":
        return <PortCodeSea />;
      case "Port Code-Air":
        return <PortCodeAir />;
      case "Gateway Port":
        return <GatewayPortDirectory />;
      default:
        return null;
    }
  };

  return <Box sx={{ width: "100%", mt: 2 }}>{renderDirectory()}</Box>;
}

export default DirectoryComponent;
