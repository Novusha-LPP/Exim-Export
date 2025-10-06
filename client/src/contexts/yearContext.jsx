import { createContext, useState, useEffect } from "react";

const LOCAL_STORAGE_KEY = "selectedYear";
export const YearContext = createContext();

export const YearProvider = ({ children }) => {
  const [selectedYearState, setSelectedYearState] = useState(
    localStorage.getItem(LOCAL_STORAGE_KEY) || ""
  );

  useEffect(() => {
    if (selectedYearState) {
      localStorage.setItem(LOCAL_STORAGE_KEY, selectedYearState);
    }
  }, [selectedYearState]);

  return (
    <YearContext.Provider value={{ selectedYearState, setSelectedYearState }}>
      {children}
    </YearContext.Provider>
  );
};
