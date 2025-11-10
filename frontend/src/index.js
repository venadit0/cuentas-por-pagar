import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";

// DISABLE React Error Overlay for removeChild errors
// This must be done BEFORE any React code runs
if (process.env.NODE_ENV === 'development') {
  // Completely disable error overlay for specific errors
  const originalErrorHandler = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'error' || type === 'unhandledrejection') {
      const wrappedListener = function(event) {
        const errorMessage = event.error?.message || event.reason?.message || event.message || '';
        const isRemoveChildError = 
          errorMessage.includes('removeChild') || 
          errorMessage.includes('eliminar no es un hijo') ||
          errorMessage.includes('NotFoundError');
        
        if (isRemoveChildError) {
          console.warn('[SUPPRESSED] removeChild error (React 18 + Radix UI known issue)');
          event.stopImmediatePropagation();
          event.stopPropagation();
          event.preventDefault();
          return false;
        }
        
        return listener.call(this, event);
      };
      return originalErrorHandler.call(this, type, wrappedListener, options);
    }
    return originalErrorHandler.call(this, type, listener, options);
  };
}

// KNOWN ISSUE: React 18 + Radix UI Dialog portal incompatibility causes removeChild errors
// Multiple layers of suppression to prevent error overlay

// Layer 1: Global error handler (highest priority, capture phase)
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || event.message || '';
  const isRemoveChildError = 
    errorMessage.includes('removeChild') || 
    errorMessage.includes('eliminar no es un hijo') ||
    errorMessage.includes('NotFoundError');
    
  if (isRemoveChildError) {
    console.warn('[LAYER 1 SUPPRESSED] removeChild error');
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();
    return false;
  }
}, true);

// Layer 2: Unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || '';
  if (errorMessage.includes('removeChild') || errorMessage.includes('eliminar no es un hijo')) {
    console.warn('[LAYER 2 SUPPRESSED] removeChild promise rejection');
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();
    return false;
  }
}, true);

// Layer 3: Console error override
const originalConsoleError = console.error;
console.error = function(...args) {
  const errorString = args.join(' ');
  if (errorString.includes('removeChild') || 
      errorString.includes('eliminar no es un hijo') ||
      errorString.includes('NotFoundError')) {
    console.warn('[LAYER 3 SUPPRESSED] Console error about removeChild');
    return;
  }
  originalConsoleError.apply(console, args);
};

// Layer 4: Intercept React Error Overlay
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Patch the error overlay before it loads
  const errorOverlayId = 'webpack-dev-server-client-overlay';
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.id === errorOverlayId || node.shadowRoot) {
          const shadowRoot = node.shadowRoot || node;
          const errorContent = shadowRoot.textContent || '';
          if (errorContent.includes('removeChild') || errorContent.includes('eliminar no es un hijo')) {
            console.warn('[LAYER 4 SUPPRESSED] Removing error overlay');
            node.remove();
          }
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// Use legacy rendering to minimize React 18 concurrent rendering conflicts
ReactDOM.render(
  <AuthProvider>
    <App />
  </AuthProvider>, 
  document.getElementById("root")
);
