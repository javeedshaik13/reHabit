import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/ThemeContext";

// Expose a minimal `process.env` shim for legacy code that still uses
// process.env.REACT_APP_BACKEND_URL so files across the repo don't throw
// "process is not defined" under Vite. This uses the Vite-exposed variable.
if (typeof window !== 'undefined') {
  window.process = window.process || { env: {} };
  // prefer explicit Vite var, fallback to existing REACT_APP_BACKEND_URL env or localhost
  window.process.env.REACT_APP_BACKEND_URL = window.process.env.REACT_APP_BACKEND_URL
    || import.meta.env.VITE_BACKEND_URL
    || import.meta.env.REACT_APP_BACKEND_URL
    || 'http://localhost:5000';
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  </React.StrictMode>,
);
