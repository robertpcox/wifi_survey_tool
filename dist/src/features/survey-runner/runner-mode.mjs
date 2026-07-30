// FEATURE:      Runner capture-mode selection
// SURFACE:      Dynamic option identity and mode helpers
// WHY TOGETHER: Dropdown identity and runtime mode must share one collision-safe value.
// STATE:        None
// RULES:        Existing survey IDs always resolve to planned mode.
// PROVENANCE:   Dynamic room survey field workflow

export const DYNAMIC_SURVEY_ID = "__dynamic-room-survey__";

export function runnerModeForSelection(value) {
  return value === DYNAMIC_SURVEY_ID ? "dynamic-room" : "planned-route";
}

export function dynamicTemplateEntry(surveys) {
  const entries = Array.isArray(surveys) ? surveys : [];
  if (!entries.length) throw new Error("Dynamic room survey requires a site survey");
  return entries[0];
}
