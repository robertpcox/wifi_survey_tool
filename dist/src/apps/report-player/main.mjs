// FEATURE:      Merged Report Player
// SURFACE:      bootReportPlayer(options), browser module entry
// WHY TOGETHER: Static data, memory access handoff, map startup, and feature mount compose here.
// STATE:        One Report Player session promise and optional dashboard access handoff
// RULES:        Receive map access before mount; never place it in URL, markup, or report state.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { createManifestSource } from "../../adapters/manifest-source.mjs";
import { createMazeMapAdapter } from "../../adapters/map/mazemap.mjs";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { receiveWindowMapAccess } from "../../adapters/window-map-access-transfer.mjs";
import { mountReportPlayer } from "../../features/report-player/report-player.mjs";
import { resultSelectionFromUrl } from "../../features/report-player/result-loader.mjs";

export async function bootReportPlayer({
  documentRef = document,
  locationRef = globalThis.location,
  windowRef = globalThis.window,
  manifestSource = createManifestSource(),
  credentials = createMemoryCredentialStore(),
  createMap,
  createPrivateMap,
  downloadFile,
} = {}) {
  const handedOffAccess = await receiveWindowMapAccess({ windowRef });
  if (handedOffAccess) credentials.set("mapAccess", handedOffAccess);
  const mapFactory = createMap ?? createPrivateMap ?? (result => createMazeMapAdapter({
    container: "report-maze-map",
    campusId: result.meta.campusId,
  }));
  return mountReportPlayer({
    root: documentRef.querySelector("[data-report-root]"),
    selection: resultSelectionFromUrl(locationRef.href),
    manifestSource,
    credentials,
    dashboardSupplied: Boolean(handedOffAccess),
    createMap: mapFactory,
    downloadFile,
  });
}

export const reportPlayerReady = typeof document !== "undefined"
  ? bootReportPlayer()
  : null;
