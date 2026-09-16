import "./docs-markdown.css";
import { applyEarlyMode, boot } from "./dashboard-app.js";

applyEarlyMode();

const banner = document.getElementById("loadBanner");

boot().catch((err) => {
  banner.classList.remove("hidden");
  banner.textContent =
    `${err.message}. Start imprint host: imprint host serve (or go run ./cmd/imprint host serve in the imprint repo).`;
});
