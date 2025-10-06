
import { createContext, useContext, useState } from "react";

export const ImportersContext = createContext();

// Create a provider component
export const ImportersProvider = ({ children }) => {
    const [importers, setImporters] = useState(null); // Example state
  
    return (
      <ImportersContext.Provider value={{ importers, setImporters }}>
        {children}
      </ImportersContext.Provider>
    );
  };
  
  // Custom hook to use the context
  export const useImportersContext = () => {
    return useContext(ImportersContext);
  };