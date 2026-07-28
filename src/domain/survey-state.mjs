export function createRouteState() {
  return {
    buildVersion: 0,
    legs: [],
    loadBusy: false,
    selectionVersion: 0,
    stops: [],
    waypoints: [],
  };
}

export function createSessionState() {
  return {
    events: [],
    meta: {
      startedAt: null,
      endedAt: null,
      routeName: "",
    },
    pollRun: {
      cloud: false,
      lipi: false,
    },
    sampleCounts: {
      cloud: 0,
      lipi: 0,
    },
    sampleSeq: 0,
    samples: [],
    walk: {
      phase: "idle",
      wpIdx: -1,
      history: [],
    },
  };
}

export function resetWalk(sessionState) {
  sessionState.walk = {
    phase: "idle",
    wpIdx: -1,
    history: [],
  };
}
