import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountAppShell } from "../../shared/shell-boot.mjs";

export function bootCreator(documentRef = document) {
  return mountAppShell({
    appName: "Creator",
    credentials: createMemoryCredentialStore(),
    documentRef,
  });
}

if (typeof document !== "undefined") bootCreator();
