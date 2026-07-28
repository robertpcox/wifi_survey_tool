import { mountAppShell } from "../../shared/shell-boot.mjs";

export function bootDashboard(documentRef = document) {
  return mountAppShell({
    appName: "Dashboard",
    documentRef,
  });
}

if (typeof document !== "undefined") bootDashboard();
