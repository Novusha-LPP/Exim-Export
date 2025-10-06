import React from "react";
import { Box } from "@mui/material";
import GenInfo from "./GenInfo.js";
import ContactInfo from "./ContactInfo.js";
import AccountInfo from "./AccountInfo.js";
import ExportDirectory from "./ExportDirectory.js";
import BankDetails from "./BankDetails.js";
import StateDirectory from "./StateDirectory.js";
import AirlineCodeDirectory from "./AirlineCodeDirectory.js";
import Country from "./Country.js";
import TarrifHead from "./TarrifHead.js";
import ShippingLine from "./ShippingLine.js";
import Scheme from "./Scheme.js";
import EDILocation from "./EDILocation.js";
import NonEDILocation from "./NonEDILocation.js";
import PortCodeSea from "./PortCodeSea.js";
import PortCodeAir from "./PortCodeAir.js";
import Uqcs from "./Uqcs.js";
import Currency from "./Currency.js";
import Package from "./PackageDirectory.js";
import SupportingDocument from "./SupportingDocument.js";
// import UnitMeasurementDirectory from "./UnitMeasurementDirectory";
// import ContainerTypeDirectory from "./ContainerTypeDirectory";
// import LocationDirectory from "./LocationDirectory";
// import StateDistrictDirectory from "./StateDistrictDirectory";
// import PortsCfsYardDirectory from "./PortsCfsYardDirectory";
// import Commodity from "./Commodity";
// import VehicleTypes from "./VehicleTypes";
// import Drivers from "./DriversListDirectory";
// import VehicleRegistration from "./VehicleRegistration";
// import TollData from "./TollData";
// import AdvanceToDriver from "./AdvanceToDriver";
// import ShippingLine from "./ShippingLine";
// import LrTrackingStagesDirectorie from "./LrTrackingStagesDirectorie";
// import Elock from "./Elock";
// import Organisation from "./Organisation";
// import UnitConversion from "./unitConversion";
// import CountryCode from "./ContryCode";
// import CurrencyDirectory from "./CurrencyDirectory";
// import PortDirectory from "./PortDirectory";

function DirectoryComponent({ directoryType }) {
  console.log("Selected Directory Type:", directoryType); // Debugging log

  const renderDirectory = () => {
    switch (directoryType) {
      case "General Information":
        return <GenInfo />;
      case "Contact Information": // ✅ Fix case to match viewMasterList
        return <ContactInfo />;
      case "Account Information": // ✅ Fix case to match viewMasterList
        return <AccountInfo />;
      case "Bank Details": // ✅ Fix case to match viewMasterList
        return <BankDetails />;
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
      case "Scheme Code":
        return <Scheme />;
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
      
      // case "Unit Measurement": // ✅ Added Unit Measurement Directory
      // case "Location": // ✅ Added Location Directory
      //   return <LocationDirectory />;
      // case "State District": // ✅ Added State District Directory
      //   return <StateDistrictDirectory />;
      // case "Ports/CFS/Yard Directory": // ✅ Added State District Directory
      //   return <PortsCfsYardDirectory />;
      // case "Commodity": // ✅ Added Commoditys Directory
      //   return <Commodity />;
      // case "Vehicle Types": // ✅ Added Commoditys Directory
      //   return <VehicleTypes />;
      // case "Drivers": // ✅ Added Commoditys Directory
      //   return <Drivers />;
      // case "Vehicle Registration": // ✅ Added Commoditys Directory
      //   return <VehicleRegistration />;
      // case "Toll Data": // ✅ Added Commoditys Directory
      //   return <TollData />;
      // case "Advance To Driver": // ✅ Added Commoditys Directory
      //   return <AdvanceToDriver />;
      // case "Shipping Line": // ✅ Added Commoditys Directory
      //   return <ShippingLine />;
      // case "LR Tracking Stages": // ✅ Added Commoditys Directory
      //   return <LrTrackingStagesDirectorie />;
      // case "Elock": // ✅ Added Commoditys Directory
      //   return <Elock />;
      // case "Organisation": // ✅ Added Commoditys Directory
      //   return <Organisation />;
      // case "Unit Conversion": // ✅ Added Commoditys Directory
      //   return <UnitConversion />;
      // case "Country Code": // ✅ Added Commoditys Directory
      //   return <CountryCode />;
      // case "Currency": // ✅ Added Commoditys Directory
      //   return <CurrencyDirectory />;
      // case "Port": // ✅ Added Commoditys Directory
      //   return <PortDirectory />;
      default:
        console.log("No matching directory found for:", directoryType);
        return null;
    }
  };

  return <Box sx={{ width: "100%", mt: 2 }}>{renderDirectory()}</Box>;
}

export default DirectoryComponent;
