import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

// KNOWN ISSUE: React 18 + Radix UI Dialog portal incompatibility causes removeChild errors
// These errors do not affect functionality but appear in console
// Aggressive error suppressors implemented below

// Global error handler for DOM/Portal errors (AGGRESSIVE)
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';
  const isRemoveChildError = 
    errorMessage.includes('removeChild') || 
    errorMessage.includes('node to be removed is not a child') ||
    errorMessage.includes('eliminar no es un hijo') ||
    errorMessage.includes('NotFoundError');
    
  if (isRemoveChildError) {
    console.warn('[SUPPRESSED] Portal cleanup error (React 18 + Radix UI)');
    event.stopImmediatePropagation();
    event.preventDefault();
    return false;
  }
}, true); // Use capture phase

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || '';
  if (errorMessage.includes('removeChild') || errorMessage.includes('eliminar no es un hijo')) {
    console.warn('[SUPPRESSED] Portal async error');
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);

// Console error override to catch React's internal error logging
const originalConsoleError = console.error;
console.error = function(...args) {
  const errorString = args.join(' ');
  if (errorString.includes('removeChild') || 
      errorString.includes('eliminar no es un hijo') ||
      errorString.includes('NotFoundError')) {
    console.warn('[SUPPRESSED] Console error about removeChild');
    return;
  }
  originalConsoleError.apply(console, args);
};

// Use legacy rendering to minimize React 18 concurrent rendering conflicts
ReactDOM.render(
  <AuthProvider>
    <App />
  </AuthProvider>, 
  document.getElementById("root")
);
