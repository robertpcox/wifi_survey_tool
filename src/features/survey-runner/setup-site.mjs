// FEATURE:      Runner customer and campus control
// SURFACE:      createRunnerSiteControl(options)
// WHY TOGETHER: Field prefill, live retargeting, and the debounced campus map switch share one template.
// STATE:        Dynamic template definition and one pending campus map launch
// RULES:        Planned routes keep their own site; a stale campus launch never overwrites a newer one.
// PROVENANCE:   Runner customer/campus entry request

import {
  adoptMapCampusName,
  applyRunnerSite,
  runnerSiteFromUrl,
  runnerSiteIssues,
  runnerSiteValues,
  sameRunnerSite,
  templateSite,
} from "./runner-site.mjs";

export const SITE_MAP_DELAY_MS = 700;

export function createRunnerSiteControl(options) {
  const { state, formView, mapAdapter, credentials, runtime = {} } = options;
  const documentRef = runtime.documentRef ?? globalThis.document;
  const setTimer = runtime.setTimer ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const clearTimer = runtime.clearTimer ?? (timer => globalThis.clearTimeout(timer));
  const urlSite = runnerSiteFromUrl(runtime.locationRef?.href ?? globalThis.location?.href);
  let template = null;
  let timer = null;
  let launchSequence = 0;

  function install(definition, mode) {
    template = mode === "dynamic-room" ? definition : null;
    if (template) prefill(templateSite(template));
  }

  function prefill(site) {
    const fields = documentRef?.querySelector?.("[data-runner-entry]")?.elements;
    const defaults = {
      siteCustomerId: urlSite.customerId ?? site.customerId,
      siteCampusId: urlSite.campusId ?? site.campusId,
      siteConfigId: site.configId,
    };
    for (const [name, value] of Object.entries(defaults)) {
      const input = fields?.namedItem?.(name);
      if (input && !String(input.value ?? "").trim()) input.value = value;
    }
  }

  function issues(values) {
    return state.mode === "dynamic-room" ? runnerSiteIssues(values) : [];
  }

  function retarget(values) {
    if (!template || state.mode !== "dynamic-room" || issues(values).length) return false;
    const next = applyRunnerSite(template, runnerSiteValues(values, template), state.surveys);
    if (sameRunnerSite(next, state.definition)) return false;
    const campusChanged = String(next.meta.campusId) !== String(state.definition?.meta?.campusId);
    state.definition = next;
    formView.showDefinition(next, { dynamic: true });
    if (campusChanged) scheduleMap();
    return true;
  }

  function scheduleMap() {
    if (timer !== null) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      void showCampus();
    }, SITE_MAP_DELAY_MS);
  }

  async function showCampus() {
    const definition = state.definition;
    if (!definition || state.busy || state.activeRun || typeof mapAdapter?.launch !== "function") return;
    const sequence = ++launchSequence;
    const campusId = definition.meta.campusId;
    formView.setStatus(`Loading MazeMap campus ${campusId}…`);
    try {
      await mapAdapter.launch(credentials.read("mapAccess"), null, { campusId });
      if (sequence !== launchSequence || state.definition !== definition) return;
      if (adoptMapCampusName(definition, mapAdapter)) {
        formView.showDefinition(definition, { dynamic: true });
      }
      formView.setStatus(`Campus set to ${definition.meta.campusName}. Complete the entry form.`, "ok");
    } catch (error) {
      if (sequence !== launchSequence) return;
      formView.setStatus(`Campus ${campusId} did not load: ${error?.message || error}`, "red");
    }
  }

  function adoptCampusName() {
    if (state.mode !== "dynamic-room" || !adoptMapCampusName(state.definition, mapAdapter)) return false;
    formView.showDefinition(state.definition, { dynamic: true });
    return true;
  }

  return Object.freeze({
    adoptCampusName,
    get requestedFromUrl() { return Boolean(urlSite.customerId || urlSite.campusId); },
    install,
    issues,
    retarget,
    showCampus,
  });
}
