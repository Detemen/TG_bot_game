import React from "react";
import ReactDOM from "react-dom/client";

import { DemoApp } from "./DemoApp";
import "../styles/base.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>,
);
