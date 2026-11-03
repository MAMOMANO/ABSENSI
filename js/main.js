import "./utils/theme.js";
import "./utils/clock.js";

import { startCamera } from "./camera/attendance-camera.js";
import { scanQRCode } from "./qr/qr-scanner.js";
import { loadDashboard } from "./dashboard/dashboard.js";
import { setupTabListeners } from "./navigation/navigation.js";
import { logout } from "./auth/auth.js";
import { generateDailyReport } from "./reports/reports.js";
import { loadMembers } from "./employees/employees.js";

if (startCameraBtn) {
  startCameraBtn.addEventListener("click", () => {
    startCamera(() => {
      scanQRCode();
    });
  });
}
