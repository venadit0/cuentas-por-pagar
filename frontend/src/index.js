import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

// React 17 uses legacy rendering by default - no concurrent features
// This eliminates the removeChild errors caused by React 18 + Radix UI portal incompatibility
ReactDOM.render(
  <AuthProvider>
    <App />
  </AuthProvider>, 
  document.getElementById("root")
);
