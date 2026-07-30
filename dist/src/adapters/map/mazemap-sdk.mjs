export const MAZEMAP_CSS_URL =
  "https://api.mazemap.com/js/v3.0.6/mazemap.min.css";
export const MAZEMAP_JS_URL =
  "https://api.mazemap.com/js/v3.0.6/mazemap.min.js";

const pendingLoads = new WeakMap();

export function loadMazemapSdk(options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const globalRef = options.globalRef ?? globalThis;
  const timeoutMs = options.timeoutMs ?? 10000;
  if (!documentRef?.createElement) {
    return Promise.reject(new Error("MazeMap SDK requires a browser document"));
  }
  ensureStylesheet(documentRef);
  if (globalRef?.Mazemap) return Promise.resolve(globalRef.Mazemap);
  if (pendingLoads.has(documentRef)) return pendingLoads.get(documentRef);
  const load = loadScript(documentRef, globalRef, timeoutMs)
    .finally(() => pendingLoads.delete(documentRef));
  pendingLoads.set(documentRef, load);
  return load;
}

export async function resolveMazemapSdk(current, options = {}) {
  const sdk = current ?? await (options.loadMazemap
    ? options.loadMazemap()
    : loadMazemapSdk({ timeoutMs: options.sdkTimeoutMs }));
  if (typeof sdk?.Map !== "function") {
    throw new Error("MazeMap SDK is missing its Map API.");
  }
  return sdk;
}

function ensureStylesheet(documentRef) {
  if (documentRef.querySelector?.(`link[href="${MAZEMAP_CSS_URL}"]`)) return;
  const link = documentRef.createElement("link");
  link.rel = "stylesheet";
  link.href = MAZEMAP_CSS_URL;
  appendTarget(documentRef).appendChild(link);
}

function loadScript(documentRef, globalRef, timeoutMs) {
  let script = documentRef.querySelector?.(`script[src="${MAZEMAP_JS_URL}"]`);
  const created = !script;
  if (!script) {
    script = documentRef.createElement("script");
    script.src = MAZEMAP_JS_URL;
    script.async = true;
  }
  return new Promise((resolve, reject) => {
    let timer;
    const finish = callback => {
      clearTimeout(timer);
      script.removeEventListener?.("load", onLoad);
      script.removeEventListener?.("error", onError);
      callback();
    };
    const onLoad = () => finish(() => globalRef?.Mazemap
      ? resolve(globalRef.Mazemap)
      : reject(new Error("MazeMap SDK loaded but window.Mazemap is unavailable")));
    const onError = () => finish(() => reject(new Error(
      `Unable to load MazeMap SDK from ${MAZEMAP_JS_URL}`,
    )));
    timer = setTimeout(
      () => finish(() => reject(
        new Error(`MazeMap SDK load timed out after ${timeoutMs} ms`),
      )),
      timeoutMs,
    );
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (created) appendTarget(documentRef).appendChild(script);
  });
}

function appendTarget(documentRef) {
  return documentRef.head ?? documentRef.documentElement;
}
