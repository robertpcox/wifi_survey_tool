const VALUE_IDS = Object.freeze([
  "configId",
  "clientIp",
  "pollInterval",
  "lipiUrl",
  "wpSpacing",
  "collectionTag",
  "cloudBase",
]);
const CHECKBOX_IDS = Object.freeze(["srcCloud", "srcLipi"]);

export function restorePrefs(
  documentRef = document,
  storage = localStorage,
  prefix = "routeSurvey.v1.",
) {
  for (const id of VALUE_IDS) {
    const value = storage.getItem(prefix + id);
    if (value !== null) documentRef.getElementById(id).value = value;
  }
  for (const id of CHECKBOX_IDS) {
    const value = storage.getItem(prefix + id);
    if (value !== null) documentRef.getElementById(id).checked = value === "1";
  }
  for (const id of VALUE_IDS) {
    documentRef.getElementById(id).addEventListener("change", event => {
      storage.setItem(prefix + id, event.target.value);
    });
  }
  for (const id of CHECKBOX_IDS) {
    documentRef.getElementById(id).addEventListener("change", event => {
      storage.setItem(prefix + id, event.target.checked ? "1" : "0");
    });
  }
}

export const PERSISTED_PREFERENCE_IDS = VALUE_IDS;
