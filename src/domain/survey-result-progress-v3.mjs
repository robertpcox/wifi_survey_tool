export function validateResultProgressV3(result, issues) {
  const checkIns = Array.isArray(result?.checkIns) ? result.checkIns : [];
  const checkpoints = Array.isArray(result?.route?.checkpoints)
    ? result.route.checkpoints
    : [];
  checkIns.forEach((checkIn, index) => {
    if (checkIn?.checkpointId !== checkpoints[index]?.id) {
      issues.push(`checkIns.${index}.checkpointId: must follow route checkpoint order`);
    }
  });
  if (result?.run?.completionStatus === "completed"
      && checkIns.length !== checkpoints.length) {
    issues.push("checkIns: completed run must include every route checkpoint");
  }
  const sampleIds = new Set(
    (Array.isArray(result?.polls) ? result.polls : []).map(poll => poll?.id),
  );
  if (result?.run?.preflight?.sampleId
      && !sampleIds.has(result.run.preflight.sampleId)) {
    issues.push("run.preflight.sampleId: must reference an exported poll");
  }
}
