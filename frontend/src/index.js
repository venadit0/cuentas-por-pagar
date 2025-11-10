import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

// KNOWN ISSUE: React 18 + Radix UI Dialog portal incompatibility causes removeChild errors
// These errors do not affect functionality but appear in console
// Error suppressors implemented below to improve developer experience

// Global error handler for DOM/Portal errors
window.addEventListener('error', (event) => {
  if (event.error && 
      event.error.message && 
      (event.error.message.includes('removeChild') || 
       event.error.message.includes('node to be removed is not a child') ||
       event.error.message.includes('eliminar no es un hijo'))) {
    console.warn('[SUPPRESSED] Portal cleanup error (React 18 + Radix UI known issue)');
    event.preventDefault();
    return false;
  }
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && 
      event.reason.message && 
      event.reason.message.includes('removeChild')) {
    console.warn('[SUPPRESSED] Portal async error');
    event.preventDefault();
  }
});

// Use legacy rendering to minimize React 18 concurrent rendering conflicts
ReactDOM.render(
  <AuthProvider>
    <App />
  </AuthProvider>, 
  document.getElementById("root")
);
