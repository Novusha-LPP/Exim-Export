import "./setupAxios.js";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { YearProvider } from "./contexts/yearContext.jsx";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <StrictMode>
      <ErrorBoundary title="Exim-Export Platform">
        <YearProvider>
          <App />
        </YearProvider>
      </ErrorBoundary>
    </StrictMode>
  </BrowserRouter>
);
