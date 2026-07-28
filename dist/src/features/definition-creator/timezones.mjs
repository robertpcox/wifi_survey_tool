const DEFAULT_TIMEZONE = "Australia/Melbourne";
const GUARANTEED_TIMEZONES = Object.freeze([
  DEFAULT_TIMEZONE,
  "Pacific/Auckland",
  "UTC",
]);

export function creatorTimezones(intlRef = globalThis.Intl) {
  let supported = [];
  try {
    supported = intlRef?.supportedValuesOf?.("timeZone") ?? [];
  } catch {
    supported = [];
  }
  return [...new Set([...supported, ...GUARANTEED_TIMEZONES])].sort();
}

export function timezoneOptionsMarkup(
  selected = DEFAULT_TIMEZONE,
  intlRef = globalThis.Intl,
) {
  return creatorTimezones(intlRef).map(timezone => (
    `<option value="${timezone}"${timezone === selected ? " selected" : ""}>`
      + `${timezone}</option>`
  )).join("");
}

export function ensureTimezoneOption(select, value, documentRef = globalThis.document) {
  const timezone = String(value ?? "").trim();
  if (!timezone || select?.tagName !== "SELECT") return;
  if ([...select.options].some(option => option.value === timezone)) return;
  const option = documentRef.createElement("option");
  option.value = timezone;
  option.textContent = timezone;
  select.append(option);
}
