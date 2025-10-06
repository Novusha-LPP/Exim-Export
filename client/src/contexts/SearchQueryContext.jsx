import { createContext, useState, useContext } from "react";

// Create context with default values
export const SearchQueryContext = createContext({
  searchQuery: "",
  setSearchQuery: () => {},
  detailedStatus: "all",
  setDetailedStatus: () => {},
  selectedICD: "all",
  setSelectedICD: () => {},
  selectedImporter: "",
  setSelectedImporter: () => {},
  currentPageTab0: 1,
  setCurrentPageTab0: () => {},
  currentPageTab1: 1,
  setCurrentPageTab1: () => {},
  currentPageDocTab0: 1,
  setCurrentPageDocTab0: () => {},
  currentPageDocTab1: 1,
  setCurrentPageDocTab1: () => {},
  currentPageSubmission: 1,
  setCurrentPageSubmission: () => {},
  currentPageDoTab0: 1, // List DO
  setCurrentPageDoTab0: () => {},
  currentPageDoTab1: 1, // Planning DO
  setCurrentPageDoTab1: () => {},
  currentPageDoTab2: 1, // DO Completed
  setCurrentPageDoTab2: () => {},
  currentPageDoTab3: 1, // Billing Sheet
  setCurrentPageDoTab3: () => {},  currentPageOpTab0: 1, // Operations List tab
  setCurrentPageOpTab0: () => {},
  currentPageOpTab1: 1, // Examination Planning tab
  setCurrentPageOpTab1: () => {},
  currentPageOpTab2: 1, // Operations Completed tab
  setCurrentPageOpTab2: () => {}
});

// Provider component that wraps app
export const SearchQueryProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [detailedStatus, setDetailedStatus] = useState("all");
  const [selectedICD, setSelectedICD] = useState("all");
  const [selectedImporter, setSelectedImporter] = useState("");  const [currentPageTab0, setCurrentPageTab0] = useState(1); // ESanchit tab
  const [currentPageTab1, setCurrentPageTab1] = useState(1); // ESanchitCompleted tab
  const [currentPageDocTab0, setCurrentPageDocTab0] = useState(1); // Documentation tab
  const [currentPageDocTab1, setCurrentPageDocTab1] = useState(1); // DocumentationCompleted tab
  const [currentPageSubmission, setCurrentPageSubmission] = useState(1); // Submission tab
  const [currentPageDoTab0, setCurrentPageDoTab0] = useState(1); // List DO tab
  const [currentPageDoTab1, setCurrentPageDoTab1] = useState(1); // Planning DO tab
  const [currentPageDoTab2, setCurrentPageDoTab2] = useState(1); // DO Completed tab
  const [currentPageDoTab3, setCurrentPageDoTab3] = useState(1); // Billing Sheet tab
  const [currentPageOpTab0, setCurrentPageOpTab0] = useState(1); // Operations List tab
  const [currentPageOpTab1, setCurrentPageOpTab1] = useState(1); // Examination Planning tab
  const [currentPageOpTab2, setCurrentPageOpTab2] = useState(1); // Operations Completed tab

  return (
    <SearchQueryContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        detailedStatus,
        setDetailedStatus,
        selectedICD,
        setSelectedICD,
        selectedImporter,
        setSelectedImporter,
        currentPageTab0,
        setCurrentPageTab0,
        currentPageTab1,
        setCurrentPageTab1,
        currentPageDocTab0,
        setCurrentPageDocTab0,
        currentPageDocTab1,
        setCurrentPageDocTab1,
        currentPageSubmission,
        setCurrentPageSubmission,
        currentPageDoTab0,
        setCurrentPageDoTab0,
        currentPageDoTab1,
        setCurrentPageDoTab1,
        currentPageDoTab2,
        setCurrentPageDoTab2,        currentPageDoTab3,
        setCurrentPageDoTab3,
        currentPageOpTab0,
        setCurrentPageOpTab0,
        currentPageOpTab1,
        setCurrentPageOpTab1,
        currentPageOpTab2,
        setCurrentPageOpTab2
      }}
    >
      {children}
    </SearchQueryContext.Provider>
  );
};

// Custom hook for using the context
export const useSearchQuery = () => useContext(SearchQueryContext);
