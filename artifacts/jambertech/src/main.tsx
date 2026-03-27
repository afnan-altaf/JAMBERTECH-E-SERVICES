import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Intercept window.fetch to inject JWT token from localStorage
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem("jamber_token");
  
  if (token) {
    init = init || {};
    const headers = new Headers(init.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    init.headers = headers;
  }
  
  // Also force credentials include to maintain session if backend uses it
  init = init || {};
  if (init.credentials === undefined) {
    init.credentials = "include";
  }

  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
