// FEATURE:      Merged Report Player
// SURFACE:      mountReportPlayer(options)
// WHY TOGETHER: Result selection, local fallback, store creation, and feature composition define this capability.
// STATE:        One loaded result session and its memory-only UI dependencies
// RULES:        Parse once, resolve generated IDs through manifests, and keep public mode functional.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { comparisonEntries, loadSelectedResult, readUploadedResult } from "./result-loader.mjs";
import { bindMapAccess } from "./map-access.mjs";
import { createReportMapSurface } from "./map-surface.mjs";
import { bindReportInteractions } from "./report-interactions.mjs";
import { renderLoadPanel, renderReportShell } from "./report-shell.mjs";
import { createReportPlayerStore } from "./report-store.mjs";

export async function mountReportPlayer({
  root,
  selection,
  manifestSource,
  credentials,
  createPrivateMap,
  downloadFile,
}) {
  root.innerHTML = renderLoadPanel();
  const upload = root.querySelector("[data-result-upload]");
  const uploadSession = deferred();
  upload.addEventListener("change", async event => {
    try {
      const result = await readUploadedResult(event.target.files[0]);
      uploadSession.resolve(activate({ result, manifest: null }));
    } catch (error) {
      root.querySelector("[data-report-status]").textContent = error.message;
    }
  });
  if (!selection.customerId || !selection.resultId) {
    return Object.freeze({ ready: uploadSession.promise, store: null });
  }
  try {
    const loaded = await loadSelectedResult({ selection, manifestSource });
    return activate(loaded);
  } catch (error) {
    root.querySelector("[data-report-status]").textContent =
      `${error.message}. Upload a local v3 result to continue.`;
    return Object.freeze({ ready: uploadSession.promise, store: null });
  }

  function activate(payload) {
    const store = createReportPlayerStore();
    const state = store.load(payload);
    const candidates = payload.manifest
      ? comparisonEntries(payload.manifest, payload.result)
      : [];
    root.innerHTML = renderReportShell(state, candidates);
    const surface = createReportMapSurface({
      result: payload.result,
      canvas: root.querySelector("[data-report-map]"),
      publicElement: root.querySelector("[data-public-map]"),
      privateElement: root.querySelector("[data-private-map]"),
      createPrivateMap: createPrivateMap
        ? () => createPrivateMap(payload.result)
        : null,
    });
    surface.render({ analysis: state.analysis });
    bindMapAccess({
      root,
      result: payload.result,
      credentials,
      surface,
    });
    bindReportInteractions({
      root,
      store,
      surface,
      candidates,
      manifestSource,
      downloadFile,
    });
    return Object.freeze({
      store,
      surface,
      result: payload.result,
      meta: payload.result.meta,
    });
  }
}

function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return { promise, resolve };
}
