import "./App.scss";
import { UserContext } from "./contexts/UserContext";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import axios from "axios";

function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("exim_user"))
  );
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const interceptor = axios.interceptors.request.use((config) => {
        config.headers["username"] = user.username || "unknown";
        config.headers["user-id"] = user._id || "unknown";
        config.headers["user-role"] = user.role || "unknown";
        return config;
      });
      return () => axios.interceptors.request.eject(interceptor);
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
      <div className="App">{user ? <HomePage /> : <LoginPage />}</div>
    </UserContext.Provider>
  );
}

export default React.memo(App);

// import React from "react";

// const App = () => {
//   return <h1 className="text-3xl font-bold underline">Hello world!</h1>;
// };

// export default App;
