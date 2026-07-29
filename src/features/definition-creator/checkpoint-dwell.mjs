// FEATURE:      Creator per-checkpoint dwell
// SURFACE:      Generated dwell defaults, preservation, and individual edits
// WHY TOGETHER: Creator dwell identity and update rules form one authoring policy.
// STATE:        Previous route dwell values supplied by the controller
// RULES:        Start and terminal are zero; other arrivals can be edited or set to move on.
// PROVENANCE:   Scope/steps/03_build_creator.md

export function applyCreatorCheckpointDwells(
  checkpoints,
  legs,
  plan,
  previousRoute = null,
) {
  const previous = previousDwells(previousRoute);
  const terminalSequence = checkpoints.at(-1)?.sequence;
  return checkpoints.map(checkpoint => ({
    ...checkpoint,
    dwellSeconds: checkpoint.sequence === terminalSequence
      ? 0
      : previous.get(checkpointKey(checkpoint, legs))
        ?? defaultDwell(checkpoint, plan),
  }));
}

export function replaceCreatorCheckpointDwell(
  checkpoints,
  sequence,
  dwellSeconds,
) {
  const number = Number(dwellSeconds);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError("checkpoint dwell: must be zero or greater");
  }
  let found = false;
  const updated = checkpoints.map(checkpoint => {
    if (checkpoint.sequence !== sequence) return checkpoint;
    found = true;
    if (checkpoint.sequence === 0) {
      throw new TypeError("The route start cannot have an arrival dwell.");
    }
    if (checkpoint.sequence === checkpoints.at(-1)?.sequence) {
      throw new TypeError("The terminal checkpoint waits for manual finish.");
    }
    return { ...checkpoint, dwellSeconds: number };
  });
  if (!found) throw new TypeError(`checkpoint ${sequence + 1}: does not exist`);
  return updated;
}

function previousDwells(route) {
  const values = new Map();
  const terminalSequence = route?.checkpoints?.at(-1)?.sequence;
  for (const checkpoint of route?.checkpoints ?? []) {
    if (!Object.hasOwn(checkpoint, "dwellSeconds")) continue;
    if (checkpoint.sequence === terminalSequence) continue;
    values.set(
      checkpointKey(checkpoint, route?.legs ?? []),
      checkpoint.dwellSeconds,
    );
  }
  return values;
}

function checkpointKey(checkpoint, legs) {
  if (checkpoint.type === "stop") return `stop:${checkpoint.stopId}`;
  const leg = legs.find(value => value.id === checkpoint.legId);
  const legKey = leg
    ? `${leg.fromStopId}>${leg.toStopId}`
    : checkpoint.legId;
  return [
    "intermediate",
    legKey,
    coordinate(checkpoint.lng),
    coordinate(checkpoint.lat),
    coordinate(checkpoint.z),
  ].join(":");
}

function defaultDwell(checkpoint, plan) {
  if (checkpoint.sequence === 0) return 0;
  return checkpoint.type === "intermediate"
    ? plan.midLegDwellSeconds
    : plan.legEndDwellSeconds;
}

function coordinate(value) {
  return Number(value).toFixed(8);
}
