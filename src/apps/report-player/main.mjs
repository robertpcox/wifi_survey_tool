import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountAppShell } from "../../shared/shell-boot.mjs";

export function bootReportPlayer(documentRef = document) {
  return mountAppShell({
    appName: "Report Player",
    credentials: createMemoryCredentialStore(),
    documentRef,
  });
}

if (typeof document !== "undefined") bootReportPlayer();
