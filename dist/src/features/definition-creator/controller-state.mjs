export function createCreatorControllerState() {
  return {
    engagedCampusId: null,
    imported: null,
    plan: null,
    planLocked: false,
    route: {
      checkpoints: [],
      distanceM: 0,
      duration: { walkingSeconds: 0, dwellSeconds: 0, totalSeconds: 0 },
      legs: [],
      shortLegs: [],
      stale: false,
    },
    selectedIndex: -1,
    shortWarningDismissed: false,
    stops: [],
  };
}

export function nextCreatorStopId(state) {
  let number = 1;
  let id;
  do id = `stop-${number++}`;
  while (state.stops.some(stop => stop.id === id));
  return id;
}
