import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountSurveyRunner } from "../../features/survey-runner/survey-runner.mjs";
import { mountAppShell } from "../../shared/shell-boot.mjs";

export function bootRunner(documentRef = document, options = {}) {
  const credentials = options.credentials ?? createMemoryCredentialStore();
  const shell = mountAppShell({
    appName: "Runner",
    credentials,
    documentRef,
  });
  const runner = (options.mountRunner ?? mountSurveyRunner)({
    ...options,
    credentials,
    documentRef,
  });
  return Object.freeze({ ...shell, runner, ready: runner.ready });
}

if (typeof document !== "undefined") {
  bootRunner().ready.catch(() => {});
}
