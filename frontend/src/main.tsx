import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import { TelegramProvider } from "./contexts/TelegramContext";
import { UserProvider } from "./contexts/UserContext";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <TelegramProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </TelegramProvider>
  </React.StrictMode>,
);
