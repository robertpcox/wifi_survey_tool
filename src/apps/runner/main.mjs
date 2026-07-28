import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountAppShell } from "../../shared/shell-boot.mjs";

export function bootRunner(documentRef = document) {
  return mountAppShell({
    appName: "Runner",
    credentials: createMemoryCredentialStore(),
    documentRef,
  });
}

if (typeof document !== "undefined") bootRunner();
