// FEATURE:      Memory-only dashboard-to-report map access transfer
// SURFACE:      createWindowMapAccessSender(options), receiveWindowMapAccess(options)
// WHY TOGETHER: Exact child registration and one-shot receiver validation form one trust boundary.
// STATE:        Short-lived WindowProxy allowlist and receiver nonce
// RULES:        Same origin/source/URL only; never place access in URL, storage, or page markup.
// PROVENANCE:   Customer dashboard report launch

const REQUEST = "wifi-survey-map-access-request";
const RESPONSE = "wifi-survey-map-access-response";
const VERSION = 1;

export function createWindowMapAccessSender({
  windowRef, readAccess, ttlMs = 30_000,
  createName = () => `wifi-survey-report-${nonce(windowRef)}`,
}) {
  const children = new Map();
  const origin = windowRef.location.origin;
  const onMessage = event => {
    const registration = children.get(event.source);
    if (!registration || event.origin !== origin
        || !valid(event.data, REQUEST)
        || !sameUrl(event.source, registration.href)) return;
    children.delete(event.source);
    windowRef.clearTimeout(registration.timer);
    const access = text(readAccess());
    event.source.postMessage({
      type: RESPONSE, version: VERSION, nonce: event.data.nonce,
      access,
    }, origin);
  };
  windowRef.addEventListener("message", onMessage);

  function open(href) {
    const destination = new URL(href, windowRef.location.href);
    if (destination.origin !== origin) return null;
    const child = windowRef.open(destination.href, createName());
    if (!child) return null;
    const registration = { href: destination.href, timer: null };
    registration.timer = windowRef.setTimeout(
      () => children.delete(child), ttlMs,
    );
    children.set(child, registration);
    return child;
  }

  return Object.freeze({
    destroy() {
      windowRef.removeEventListener("message", onMessage);
      for (const item of children.values()) windowRef.clearTimeout(item.timer);
      children.clear();
    },
    open,
  });
}

export function receiveWindowMapAccess({
  windowRef, timeoutMs = 1_000,
  createNonce = () => nonce(windowRef),
}) {
  const opener = windowRef?.opener;
  if (!opener || opener.closed || !windowRef.location?.origin) {
    return Promise.resolve(null);
  }
  const origin = windowRef.location.origin;
  const requestNonce = createNonce();
  return new Promise(resolve => {
    let timer = null;
    const finish = access => {
      windowRef.removeEventListener("message", onMessage);
      if (timer != null) windowRef.clearTimeout(timer);
      try { windowRef.opener = null; } catch { /* browser-owned */ }
      resolve(text(access));
    };
    const onMessage = event => {
      if (event.origin !== origin || event.source !== opener
          || !valid(event.data, RESPONSE)
          || event.data.nonce !== requestNonce) return;
      finish(event.data.access);
    };
    windowRef.addEventListener("message", onMessage);
    timer = windowRef.setTimeout(() => finish(null), timeoutMs);
    try {
      opener.postMessage({
        type: REQUEST, version: VERSION, nonce: requestNonce,
      }, origin);
    } catch {
      finish(null);
    }
  });
}

function sameUrl(source, expected) {
  try { return new URL(source.location.href).href === expected; }
  catch { return false; }
}

function valid(value, type) {
  return value?.type === type && value.version === VERSION
    && typeof value.nonce === "string" && value.nonce.length >= 8
    && (type !== RESPONSE || value.access == null || typeof value.access === "string");
}

function nonce(windowRef) {
  return windowRef.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function text(value) {
  const result = String(value ?? "").trim();
  return result && result.length <= 4_096 ? result : null;
}
