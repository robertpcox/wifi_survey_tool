// FEATURE:      Per-checkpoint survey dwell
// SURFACE:      Dwell resolution, totals, defaults, and authored checkpoint validation
// WHY TOGETHER: Legacy fallback and explicit checkpoint dwell form one compatibility boundary.
// STATE:        None
// RULES:        Explicit dwell is non-negative and cannot alter generated route topology.
// PROVENANCE:   Scope/contracts/survey_definition_v3.md

const TOPOLOGY_FIELDS = Object.freeze([
  "id",
  "sequence",
  "type",
  "lng",
  "lat",
  "z",
  "stopId",
  "legId",
  "spacingBasisM",
]);

export function checkpointDwellSeconds(checkpoint, legacyDwellSeconds = 0) {
  const value = Object.hasOwn(checkpoint ?? {}, "dwellSeconds")
    ? checkpoint.dwellSeconds
    : legacyDwellSeconds;
  return nonNegative(value, "checkpoint.dwellSeconds");
}

export function totalCheckpointDwellSeconds(
  checkpoints,
  legacyDwellSeconds = 0,
) {
  return (checkpoints ?? []).reduce(
    (total, checkpoint) => (
      total + checkpointDwellSeconds(checkpoint, legacyDwellSeconds)
    ),
    0,
  );
}

export function authoredCheckpointsV3(generated, supplied) {
  if (supplied === undefined) return generated;
  if (!Array.isArray(supplied) || supplied.length !== generated.length) {
    throw new TypeError(
      "route.checkpoints: must match the generated checkpoint count",
    );
  }
  return generated.map((checkpoint, index) => {
    const authored = supplied[index];
    for (const field of TOPOLOGY_FIELDS) {
      if (authored?.[field] !== checkpoint[field]) {
        throw new TypeError(
          `route.checkpoints.${index}.${field}: must match the generated route`,
        );
      }
    }
    if (!Object.hasOwn(authored, "dwellSeconds")) return checkpoint;
    return {
      ...checkpoint,
      dwellSeconds: nonNegative(
        authored.dwellSeconds,
        `route.checkpoints.${index}.dwellSeconds`,
      ),
    };
  });
}

export function checkpointDwellDefaults(checkpoints, legacyDwellSeconds = 0) {
  const legacy = nonNegative(
    legacyDwellSeconds,
    "meta.route.checkpointDwellSeconds",
  );
  const intermediate = (checkpoints ?? []).find(
    checkpoint => checkpoint.type === "intermediate",
  );
  const legEnd = (checkpoints ?? []).find(
    checkpoint => checkpoint.type === "stop" && checkpoint.sequence > 0,
  );
  return {
    midLegDwellSeconds: checkpointDwellSeconds(intermediate, legacy),
    legEndDwellSeconds: checkpointDwellSeconds(legEnd, legacy),
  };
}

function nonNegative(value, path) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${path}: must be a non-negative finite number`);
  }
  return number;
}
