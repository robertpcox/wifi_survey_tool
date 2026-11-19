// FEATURE:      Runner customer and campus selection
// SURFACE:      RUNNER_SITE_FIELDS, runnerSiteFromUrl, runnerSiteValues, runnerSiteIssues,
//               applyRunnerSite, adoptMapCampusName
// WHY TOGETHER: Share-link defaults, entry validation, and template retargeting share one site identity.
// STATE:        None
// RULES:        IDs are positive whole numbers; a changed campus drops template buildings and floors.
// PROVENANCE:   Runner customer/campus entry request

export const RUNNER_SITE_FIELDS = Object.freeze([
  "siteCustomerId",
  "siteCampusId",
  "siteConfigId",
]);

const FIELD_KEYS = Object.freeze({
  siteCustomerId: "customerId",
  siteCampusId: "campusId",
  siteConfigId: "configId",
});
const POSITIVE_ID = /^[1-9][0-9]*$/;

export function runnerSiteFromUrl(href) {
  let params;
  try {
    params = new URL(String(href ?? "")).searchParams;
  } catch {
    return { customerId: null, campusId: null };
  }
  return {
    customerId: clean(params.get("customer_id")) || null,
    campusId: clean(params.get("campus_id")) || null,
  };
}

export function templateSite(definition) {
  return {
    customerId: clean(definition?.meta?.customerId),
    campusId: clean(definition?.meta?.campusId),
    configId: clean(definition?.meta?.sourceConfig?.configId),
  };
}

export function runnerSiteValues(values, template) {
  const site = templateSite(template);
  for (const [field, key] of Object.entries(FIELD_KEYS)) {
    const value = clean(values?.[field]);
    if (value) site[key] = value;
  }
  return site;
}

export function runnerSiteIssues(values) {
  const issues = [];
  for (const [field, key] of Object.entries(FIELD_KEYS)) {
    const value = clean(values?.[field]);
    if (value && !POSITIVE_ID.test(value)) {
      issues.push(`${key} must be a positive whole number`);
    }
  }
  return issues;
}

export function sameRunnerSite(left, right) {
  const a = templateSite(left);
  const b = templateSite(right);
  return a.customerId === b.customerId && a.campusId === b.campusId
    && a.configId === b.configId;
}

export function placeholderCampusName(campusId) {
  return `Campus ${campusId}`;
}

export function applyRunnerSite(template, site, surveys = []) {
  const base = templateSite(template);
  const changed = Object.keys(base).some(key => site[key] !== base[key]);
  if (!changed) return template;
  const definition = structuredClone(template);
  const meta = definition.meta;
  meta.sourceConfig.configId = site.configId;
  if (site.customerId !== base.customerId) {
    meta.customerId = site.customerId;
    meta.customerName = customerName(surveys, site.customerId);
  }
  if (site.campusId !== base.campusId) {
    meta.campusId = site.campusId;
    meta.campusName = placeholderCampusName(site.campusId);
    meta.buildings = [];
    meta.zLevels = [];
    meta.zLevelNames = {};
  }
  return definition;
}

export function adoptMapCampusName(definition, mapAdapter) {
  const meta = definition?.meta;
  if (!meta || meta.campusName !== placeholderCampusName(meta.campusId)) return false;
  if (String(mapAdapter?.campusId) !== String(meta.campusId)) return false;
  const name = clean(mapAdapter?.campusName);
  if (!name) return false;
  meta.campusName = name;
  return true;
}

function customerName(surveys, customerId) {
  const known = (Array.isArray(surveys) ? surveys : [])
    .find(entry => clean(entry?.customerId) === customerId && clean(entry?.customerName));
  return known ? clean(known.customerName) : `Customer ${customerId}`;
}

function clean(value) {
  return String(value ?? "").trim();
}
