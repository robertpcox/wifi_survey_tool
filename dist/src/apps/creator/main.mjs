import { downloadFile, readJsonFile } from "../../adapters/files.mjs";
import { captureCurrentPosition } from "../../adapters/geolocation.mjs";
import { createMazeMapAdapter } from "../../adapters/map/mazemap.mjs";
import { loadMazemapSdk } from "../../adapters/map/mazemap-sdk.mjs";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountDefinitionCreator }
  from "../../features/definition-creator/definition-creator.mjs";
import { mountAppShell } from "../../shared/shell-boot.mjs";

export function bootCreator(documentRef = document, options = {}) {
  const credentials = options.credentials ?? createMemoryCredentialStore();
  const shell = mountAppShell({
    appName: "Creator",
    credentials,
    documentRef,
  });
  const root = documentRef.querySelector("[data-definition-creator]");
  if (!root) return Object.freeze({ ...shell, creator: null });
  const globalRef = options.globalRef ?? globalThis;
  const Mazemap = options.Mazemap ?? globalRef.Mazemap ?? null;
  const mapAdapter = options.mapAdapter ?? createMazeMapAdapter({
    Mazemap,
    center: options.mapCenter,
    container: "map",
    documentRef,
    loadMazemap: options.loadMazemap ?? (() => loadMazemapSdk({
      documentRef,
      globalRef,
      timeoutMs: options.sdkTimeoutMs,
    })),
    mapLoadTimeoutMs: options.mapLoadTimeoutMs,
  });
  const mountCreator = options.mountDefinitionCreator ?? mountDefinitionCreator;
  const creator = mountCreator({
    accuracyThresholdM: options.accuracyThresholdM,
    capturePosition: options.capturePosition ?? (() => captureCurrentPosition()),
    credentials,
    cryptoRef: options.cryptoRef,
    documentRef,
    downloadDefinition: options.downloadDefinition ?? ((filename, text) => {
      downloadFile(
        filename,
        text,
        "application/json",
        documentRef,
        options.urlRef ?? globalThis.URL,
      );
    }),
    lookupPoi: options.lookupPoi,
    mapAdapter,
    Mazemap,
    now: options.now,
    readDefinition: options.readDefinition ?? readJsonFile,
    root,
    routeProvider: options.routeProvider,
  });
  return Object.freeze({ ...shell, creator, mapAdapter });
}

if (typeof document !== "undefined") bootCreator();
