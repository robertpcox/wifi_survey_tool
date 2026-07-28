export function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function valueAt(input, path) {
  return path.split(".").reduce(
    (value, key) => value === undefined ? undefined : value?.[key],
    input,
  );
}

export function requirePaths(input, paths, issues, prefix = "") {
  for (const path of paths) {
    const fullPath = prefix ? `${prefix}.${path}` : path;
    if (valueAt(input, path) === undefined) {
      issues.push(`${fullPath}: is required`);
    }
  }
}

export function expectRecord(value, path, issues) {
  if (!isRecord(value)) issues.push(`${path}: must be an object`);
}

export function expectArray(value, path, issues, minimum = 0) {
  if (!Array.isArray(value)) {
    issues.push(`${path}: must be an array`);
  } else if (value.length < minimum) {
    issues.push(`${path}: must contain at least ${minimum} item(s)`);
  }
}

export function expectString(value, path, issues, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || !value.trim()) {
    issues.push(`${path}: must be a non-empty string${nullable ? " or null" : ""}`);
  }
}

export function expectNumber(value, path, issues, minimum = -Infinity) {
  if (!Number.isFinite(value) || value < minimum) {
    issues.push(`${path}: must be a finite number at least ${minimum}`);
  }
}

export function expectIso(value, path, issues) {
  expectString(value, path, issues);
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return;
  if (typeof value === "string") issues.push(`${path}: must be an ISO timestamp`);
}

export function secretValuePaths(input, path = "", findings = []) {
  if (Array.isArray(input)) {
    input.forEach((value, index) => secretValuePaths(value, `${path}.${index}`, findings));
    return findings;
  }
  if (!isRecord(input)) return findings;
  for (const [key, value] of Object.entries(input)) {
    const childPath = path ? `${path}.${key}` : key;
    const isCredential = /^(?:mapAccess|appId|appKey|password|secret|token)$/i.test(key);
    if (isCredential && typeof value === "string" && value.trim()) findings.push(childPath);
    secretValuePaths(value, childPath, findings);
  }
  return findings;
}

export function validationResult(issues) {
  return Object.freeze({ valid: issues.length === 0, errors: Object.freeze(issues) });
}
