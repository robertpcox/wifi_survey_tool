// FEATURE:      Merged Report Player
// SURFACE:      bootReportPlayer(options), browser module entry
// WHY TOGETHER: Static data, memory credentials, private map, and feature mount compose at this boundary.
// STATE:        One Report Player session promise
// RULES:        Keep map access in memory and resolve URL result IDs through generated manifests.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { createManifestSource } from "../../adapters/manifest-source.mjs";
import { createMazeMapAdapter } from "../../adapters/map/mazemap.mjs";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountReportPlayer } from "../../features/report-player/report-player.mjs";
import { resultSelectionFromUrl } from "../../features/report-player/result-loader.mjs";

export function bootReportPlayer({
  documentRef = document,
  locationRef = globalThis.location,
  manifestSource = createManifestSource(),
  credentials = createMemoryCredentialStore(),
  createPrivateMap = result => createMazeMapAdapter({
    container: "report-private-map",
    campusId: result.meta.campusId,
  }),
  downloadFile,
} = {}) {
  return mountReportPlayer({
    root: documentRef.querySelector("[data-report-root]"),
    selection: resultSelectionFromUrl(locationRef.href),
    manifestSource,
    credentials,
    createPrivateMap,
    downloadFile,
  });
}

if (typeof document !== "undefined") bootReportPlayer();
