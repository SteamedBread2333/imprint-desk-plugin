import { boot } from "./dashboard-app.js";

const banner = document.getElementById("loadBanner");

boot().catch((err) => {
  banner.classList.remove("hidden");
  banner.textContent =
    `${err.message}. Start imprint host: imprint host serve (or go run ./cmd/imprint host serve in the imprint repo).`;
});
