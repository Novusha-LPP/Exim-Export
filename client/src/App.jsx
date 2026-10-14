import "./App.scss";
import { UserContext } from "./contexts/UserContext";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import axios from "axios";

import { Routes, Route } from "react-router-dom";
import BLDraftForm from "./components/Public/BLDraftForm.jsx";

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("exim_user")) || null;
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlShiftLeftArrow =
        event.ctrlKey && event.shiftKey && event.key === "ArrowLeft" && !isMac;
      const cmdShiftLeftArrow =
        event.metaKey && event.shiftKey && event.key === "ArrowLeft" && isMac;
      const ctrlShiftRightArrow =
        event.ctrlKey && event.shiftKey && event.key === "ArrowRight" && !isMac;
      const cmdShiftRightArrow =
        event.metaKey && event.shiftKey && event.key === "ArrowRight" && isMac;

      if (ctrlShiftLeftArrow || cmdShiftLeftArrow) {
        navigate(-1); // Go back to the previous page
      } else if (ctrlShiftRightArrow || cmdShiftRightArrow) {
        navigate(1); // Go forward to the next page
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/public/bl-form/:enquiryId" element={<BLDraftForm />} />
          
          {/* Main App Routes */}
          <Route path="/*" element={user ? <HomePage /> : <LoginPage />} />
        </Routes>
      </div>
    </UserContext.Provider>
  );
}

export default React.memo(App);

// import React from "react";

// const App = () => {
//   return <h1 className="text-3xl font-bold underline">Hello world!</h1>;
// };

// export default App;
