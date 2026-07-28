// FEATURE:      Survey definition copy policy
// SURFACE:      Sanitized, mutable, and deeply immutable definition copies
// WHY TOGETHER: All definition copy modes recurse through the same serializable value shape.
// STATE:        None
// RULES:        Runtime-only authoring and device fields never enter serialized definitions.
// PROVENANCE:   Scope/contracts/survey_definition_v3.md

export function sanitizedDefinitionCopy(value) {
  if (Array.isArray(value)) return value.map(sanitizedDefinitionCopy);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(?:_mapContext|device|deviceId|band|bandId)$/i.test(key))
    .map(([key, child]) => [key, sanitizedDefinitionCopy(child)]));
}

export function mutableDefinitionCopy(value) {
  if (Array.isArray(value)) return value.map(mutableDefinitionCopy);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .map(([key, child]) => [key, mutableDefinitionCopy(child)]));
}

export function immutableDefinitionCopy(value) {
  if (!value || typeof value !== "object") return value;
  const copy = Array.isArray(value)
    ? value.map(immutableDefinitionCopy)
    : Object.fromEntries(Object.entries(value)
      .map(([key, child]) => [key, immutableDefinitionCopy(child)]));
  return Object.freeze(copy);
}
