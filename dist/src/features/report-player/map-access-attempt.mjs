// FEATURE:      Report Player private-map access attempt
// SURFACE:      createMapAccessAttempt(options)
// WHY TOGETHER: Credential use, launch serialization, and failure clearing form one operation.
// STATE:        At most one private launch promise and its successful-access flag
// RULES:        Never overlap launches; retain access only after a successful private map.
// PROVENANCE:   Customer dashboard memory-only map access

export function createMapAccessAttempt({
  credentials,
  surface,
  onBusy = () => {},
  onLaunch = () => {},
  onReady = () => {},
}) {
  let current = null;
  let ready = false;

  async function run(value, { restoreFocus = false, revealFailure = false } = {}) {
    if (current) return current;
    ready = false;
    credentials.set("mapAccess", value);
    if (!credentials.has("mapAccess")) return null;
    onBusy(true);
    const work = launch(credentials.read("mapAccess"), {
      restoreFocus, revealFailure,
    });
    current = work;
    try {
      return await work;
    } finally {
      if (current === work) {
        current = null;
        onBusy(false);
      }
    }
  }

  async function launch(token, options) {
    try {
      const outcome = await surface.retryAccess(token);
      ready = outcome?.status === "ready";
      if (!ready) credentials.clear("mapAccess");
      onLaunch(outcome, options);
      if (ready) await onReady(outcome);
      return outcome;
    } catch (error) {
      ready = false;
      credentials.clear("mapAccess");
      const outcome = { status: "fallback", error };
      onLaunch(outcome, options);
      return outcome;
    }
  }

  return Object.freeze({
    reset() { ready = false; },
    run,
    wait: () => current ?? Promise.resolve(),
    get pending() { return Boolean(current); },
    get ready() { return ready; },
  });
}
