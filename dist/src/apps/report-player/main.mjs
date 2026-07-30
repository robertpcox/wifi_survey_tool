// FEATURE:      Merged Report Player
// SURFACE:      bootReportPlayer(options), browser module entry
// WHY TOGETHER: Static data, memory access, public-first MazeMap, and feature mount compose here.
// STATE:        One Report Player session promise
// RULES:        Keep map access in memory and resolve URL result IDs through generated manifests.
// PROVENANCE:   Scope/steps/05a_recast_player.md

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
  createMap,
  createPrivateMap,
  downloadFile,
} = {}) {
  const mapFactory = createMap ?? createPrivateMap ?? (result => createMazeMapAdapter({
    container: "report-maze-map",
    campusId: result.meta.campusId,
  }));
  return mountReportPlayer({
    root: documentRef.querySelector("[data-report-root]"),
    selection: resultSelectionFromUrl(locationRef.href),
    manifestSource,
    credentials,
    createMap: mapFactory,
    downloadFile,
  });
}

export const reportPlayerReady = typeof document !== "undefined"
  ? bootReportPlayer()
  : null;
