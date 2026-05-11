import * as React from "react";
import Penalty from "./Penalty";

export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => { },
  navigate: () => { },
});

function ReportTabs() {
  return <Penalty />;
}

export default ReportTabs;
