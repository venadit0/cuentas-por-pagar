import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

// Global error handler for DOM/Portal errors that React ErrorBoundary cannot catch
window.addEventListener('error', (event) => {
  // Suppress removeChild errors from Radix UI portals during React reconciliation
  if (event.error && 
      event.error.message && 
      (event.error.message.includes('removeChild') || 
       event.error.message.includes('node to be removed is not a child'))) {
    console.warn('Portal cleanup error suppressed (Radix UI + React 18 compatibility issue):', event.error.message);
    event.preventDefault();
    return false;
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && 
      event.reason.message && 
      event.reason.message.includes('removeChild')) {
    console.warn('Portal async error suppressed:', event.reason.message);
    event.preventDefault();
  }
});

// Use legacy rendering mode to avoid React 18 concurrent rendering issues with Radix UI portals
ReactDOM.render(
  <AuthProvider>
    <App />
  </AuthProvider>, 
  document.getElementById("root")
);
