// FEATURE:      Deterministic discovery manifest entries
// SURFACE:      surveyManifestEntry, resultManifestEntry, customerManifests, compareManifestEntry
// WHY TOGETHER: Privacy-safe source projections and customer grouping define one manifest shape.
// STATE:        None
// RULES:        Result discovery includes device labels but never operational Client IP.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

export function surveyManifestEntry(definition, path) {
  return {
    surveyId: definition.meta.surveyId,
    surveyName: definition.meta.surveyName,
    customerId: definition.meta.customerId,
    customerName: definition.meta.customerName,
    campusId: definition.meta.campusId,
    routeId: definition.meta.route.routeId,
    routeHash: definition.meta.route.hash,
    path,
  };
}

export function resultManifestEntry(result, path) {
  return {
    resultId: result.run.resultId,
    surveyId: result.run.surveyId,
    customerId: result.run.customerId,
    campusId: result.run.campusId,
    routeHash: result.run.routeHash,
    device: {
      type: result.run.device.type,
      os: result.run.device.os,
      name: result.run.device.name,
    },
    band: result.run.band,
    completionStatus: result.run.completionStatus,
    exportedAt: result.run.exportedAt,
    path,
  };
}

export function customerManifests(surveys, results) {
  const ids = [...new Set([
    ...surveys.map(entry => entry.customerId),
    ...results.map(entry => entry.customerId),
  ])].sort();
  return ids.map(customerId => ({
    schemaVersion: 3,
    customerId,
    customerName: surveys.find(entry => (
      entry.customerId === customerId
    ))?.customerName || null,
    surveys: surveys.filter(entry => entry.customerId === customerId),
    results: results.filter(entry => entry.customerId === customerId),
  }));
}

export function compareManifestEntry(left, right) {
  const leftKey = left.surveyId || left.resultId;
  const rightKey = right.surveyId || right.resultId;
  return leftKey.localeCompare(rightKey) || left.path.localeCompare(right.path);
}
