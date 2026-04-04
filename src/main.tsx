import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import "./index.css";
import "./styles/theme.css";

/* --------------------------------------------------
   Default Theme Initialization
-------------------------------------------------- */

document.documentElement.setAttribute("data-theme", "dark");

ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
).render(
  <App />
);