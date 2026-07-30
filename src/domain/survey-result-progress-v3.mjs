export function validateResultProgressV3(result, issues) {
  const checkIns = Array.isArray(result?.checkIns) ? result.checkIns : [];
  const checkpoints = Array.isArray(result?.route?.checkpoints)
    ? result.route.checkpoints
    : [];
  const events = Array.isArray(result?.events) ? result.events : [];
  const actions = events.filter(event => (
    event?.type === "checkpoint-reached"
    || event?.type === "checkpoint-skipped"
  ));
  if (actions.some(event => event.type === "checkpoint-skipped")) {
    validateExceptionalProgress(result, checkpoints, checkIns, actions, issues);
  } else {
    validateLegacyProgress(result, checkpoints, checkIns, issues);
  }
  const sampleIds = new Set(
    (Array.isArray(result?.polls) ? result.polls : []).map(poll => poll?.id),
  );
  if (result?.run?.preflight?.sampleId
      && !sampleIds.has(result.run.preflight.sampleId)) {
    issues.push("run.preflight.sampleId: must reference an exported poll");
  }
}

function validateLegacyProgress(result, checkpoints, checkIns, issues) {
  checkIns.forEach((checkIn, index) => {
    if (checkIn?.checkpointId !== checkpoints[index]?.id) {
      issues.push(`checkIns.${index}.checkpointId: must follow route checkpoint order`);
    }
  });
  if (result?.run?.completionStatus === "completed"
      && checkIns.length !== checkpoints.length) {
    issues.push("checkIns: completed run must include every route checkpoint");
  }
}

function validateExceptionalProgress(result, checkpoints, checkIns, actions, issues) {
  let reachedIndex = 0;
  actions.forEach((event, index) => {
    const expected = checkpoints[index];
    if (event?.checkpointId !== expected?.id) {
      issues.push(`events: checkpoint actions must follow route checkpoint order`);
    }
    if (event.type === "checkpoint-skipped") {
      if (event.reason !== "area-closed") {
        issues.push(`events: checkpoint-skipped reason must be area-closed`);
      }
      return;
    }
    const checkIn = checkIns[reachedIndex++];
    if (checkIn?.checkpointId !== event.checkpointId || checkIn?.at !== event.at) {
      issues.push("checkIns: reached checkpoint actions must match check-ins");
    }
  });
  if (reachedIndex !== checkIns.length) {
    issues.push("checkIns: every check-in must have a reached checkpoint action");
  }
  if (result?.run?.completionStatus === "completed") {
    if (actions.length !== checkpoints.length) {
      issues.push("events: completed run must account for every route checkpoint");
    }
    if (!checkIns.length) {
      issues.push("checkIns: completed run must include reached ground truth");
    }
  }
}
