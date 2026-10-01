import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <UserPreferencesProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UserPreferencesProvider>
  </StrictMode>
);