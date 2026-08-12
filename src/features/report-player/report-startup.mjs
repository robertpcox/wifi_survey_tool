// FEATURE:      Report Player ordered startup
// SURFACE:      createReportStartup(options)
// WHY TOGETHER: Map access, overview loading, camera fit, and room lookup form one dependency chain.
// STATE:        One initial lifecycle and serialized private-access retries
// RULES:        Map first; overview and fit second; room catalogue last.
// PROVENANCE:   Consolidated report blank-map fault finding

export function createReportStartup({
  access,
  player,
  surface,
  initialView,
  requirePrivateAccess,
  unavailableError = null,
}) {
  let lifecycle = null;
  let stage = "map";
  let retryRequested = false;
  let retryWork = Promise.resolve(false);

  function start() {
    if (lifecycle) return lifecycle;
    const mapReady = access.start().then(outcome => {
      stage = "overview";
      return outcome;
    });
    const overviewReady = initialView === "overview"
      ? mapReady.then(() => player.prepareOverview())
      : Promise.resolve(false);
    const roomReady = Promise.all([mapReady, overviewReady]).then(async () => {
      stage = "rooms";
      retryRequested = false;
      try {
        return await resolveRooms();
      } finally {
        stage = "ready";
        if (retryRequested) void queueRoomRetry();
      }
    });
    lifecycle = Object.freeze({ mapReady, overviewReady, roomReady });
    return lifecycle;
  }

  function onAccessReady() {
    if (stage === "map") return true;
    if (stage !== "ready") {
      retryRequested = true;
      return true;
    }
    return queueRoomRetry();
  }

  function queueRoomRetry() {
    retryRequested = false;
    retryWork = retryWork.catch(() => false).then(resolveRooms);
    return retryWork;
  }

  function resolveRooms() {
    if (surface.mapMode !== "mazemap") {
      return player.markRoomUnavailable();
    }
    if (requirePrivateAccess && !access.accessReady) {
      return player.markRoomUnavailable(unavailableError);
    }
    return player.enableRoomLookup();
  }

  return Object.freeze({ onAccessReady, start });
}
