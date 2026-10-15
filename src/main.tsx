import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PetWindow, BubbleWindow } from "./PetWindow";
import "./styles.css";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
// Native window identity is authoritative, including packaged/custom-protocol URLs.
const view = isTauri()
  ? getCurrentWindow().label
  : new URLSearchParams(window.location.search).get("window");
document.documentElement.dataset.window = view ?? "settings";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {view === "pet" ? (
      <PetWindow />
    ) : view === "bubble" ? (
      <BubbleWindow />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
