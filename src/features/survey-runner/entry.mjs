export const RUNNER_ENTRY_FIELDS = Object.freeze([
  "deviceType",
  "deviceOs",
  "deviceName",
  "clientIp",
  "band",
]);

export function normalizeRunnerEntry(values) {
  return {
    deviceType: clean(values.deviceType),
    deviceOs: clean(values.deviceOs),
    deviceName: clean(values.deviceName),
    clientIp: clean(values.clientIp),
    band: clean(values.band),
  };
}

export function runnerEntryIssues(values, credentials, requirements = {}) {
  const entry = normalizeRunnerEntry(values);
  const issues = RUNNER_ENTRY_FIELDS
    .filter(name => !entry[name])
    .map(name => `${name} is required`);
  if (!["mobile", "laptop", "asset"].includes(entry.deviceType)) {
    issues.push("deviceType is unsupported");
  }
  if (!["2.4", "5", "6", "mixed"].includes(entry.band)) {
    issues.push("band is unsupported");
  }
  if (!values.consent) issues.push("position recording acknowledgement is required");
  const requiredCredentials = { ...requirements, mapAccess: false };
  for (const name of credentials.missing(requiredCredentials)) {
    issues.push(`${name} is required`);
  }
  return issues;
}

export function syncRunnerCredentials(values, credentials) {
  for (const name of ["mapAccess", "appId", "appKey"]) {
    credentials.set(name, values[name]);
  }
}

export function runnerPositionRequest(definition, entry, credentials) {
  return {
    proxyBase: definition.meta.sourceConfig.proxyBase,
    configId: definition.meta.sourceConfig.configId,
    clientIp: entry.clientIp,
    appId: credentials.read("appId"),
    appKey: credentials.read("appKey"),
  };
}

function clean(value) {
  return String(value ?? "").trim();
}
