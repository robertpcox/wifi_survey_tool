import { esc } from "../../shared/format.mjs";

const VALUE_NAMES = [
  "deviceType", "deviceOs", "deviceName", "clientIp", "band",
  "mapAccess", "appId", "appKey",
];

export function createRunnerFormView(documentRef) {
  const find = selector => documentRef.querySelector(selector);
  const form = find("[data-runner-entry]");

  function readValues() {
    const values = Object.fromEntries(VALUE_NAMES.map(name => [
      name,
      form?.elements?.namedItem(name)?.value ?? "",
    ]));
    values.consent = Boolean(form?.elements?.namedItem("consent")?.checked);
    values.override = Boolean(find('[name="override"]')?.checked
      ?? form?.elements?.namedItem("override")?.checked);
    return values;
  }

  function populateSurveys(surveys, selectedSurveyId = null) {
    const select = find("[data-survey-select]");
    if (!select) return;
    select.innerHTML = '<option value="">Choose next survey…</option>' + surveys.map(entry =>
      `<option value="${esc(entry.surveyId)}">`
      + `${esc(entry.customerName)} — ${esc(entry.surveyName)}</option>`).join("");
    if (selectedSurveyId) select.value = selectedSurveyId;
  }

  function showDefinition(definition) {
    setText("[data-survey-name]", definition.meta.surveyName);
    setText("[data-campus-name]", definition.meta.campusName);
    setText("[data-route-distance]", `${Math.round(definition.meta.route.distanceM)} m`);
    setText(
      "[data-route-duration]",
      formatDuration(definition.meta.route.estimatedDurationSeconds),
    );
    setText("[data-checkpoint-count]", definition.route.checkpoints.length);
    for (const name of ["mapAccess", "appId", "appKey"]) {
      const row = find(`[data-credential-row="${name}"]`);
      if (row) row.hidden = !definition.meta.credentialRequirements[name];
    }
  }

  function setActions({ entryComplete, preflight, busy = false }) {
    const check = find('[data-action="preflight"]');
    const go = find('[data-action="go"]');
    const override = find("[data-preflight-override]");
    const overrideGo = find('[data-action="override-go"]');
    const survey = find("[data-survey-select]");
    if (survey) survey.disabled = busy;
    if (form) form.inert = busy;
    if (check) check.disabled = !entryComplete || busy;
    if (go) go.disabled = !entryComplete || busy || preflight?.verdict !== "green";
    if (override) override.hidden = !preflight || preflight.verdict === "green";
    if (overrideGo) {
      overrideGo.disabled = !entryComplete || busy || !readValues().override;
    }
  }

  function renderPreflight(preflight, sample) {
    const panel = find("[data-preflight-result]");
    if (!panel) return;
    panel.hidden = false;
    panel.dataset.verdict = preflight.verdict;
    setText("[data-preflight-light]", preflight.verdict.toUpperCase());
    setText("[data-preflight-reasons]", preflightReasonText(preflight));
    const metrics = preflightMetrics(sample);
    setText("[data-preflight-position]", metrics.position);
    setText("[data-preflight-floor]", metrics.floor);
    setText("[data-preflight-age]", metrics.age);
    setText("[data-preflight-rtt]", metrics.rtt);
  }

  function setText(selector, text) {
    const node = find(selector);
    if (node) node.textContent = String(text);
  }

  function resetRouteSelection() {
    const select = find("[data-survey-select]");
    if (select) select.value = "";
    for (const selector of [
      "[data-survey-name]", "[data-campus-name]", "[data-route-distance]",
      "[data-route-duration]", "[data-checkpoint-count]",
    ]) setText(selector, "—");
    const result = find("[data-preflight-result]");
    if (result) result.hidden = true;
    const override = find("[data-preflight-override]");
    if (override) override.hidden = true;
    const acknowledgement = find('[name="override"]');
    if (acknowledgement) acknowledgement.checked = false;
  }

  return Object.freeze({
    bind(handlers) {
      find("[data-survey-select]")?.addEventListener("change", handlers.selectSurvey);
      form?.addEventListener("input", handlers.entryChanged);
      find('[name="override"]')?.addEventListener("input", handlers.overrideChanged);
      find('[data-action="preflight"]')?.addEventListener("click", handlers.preflight);
      find('[data-action="go"]')?.addEventListener("click", handlers.go);
      find('[data-action="override-go"]')?.addEventListener("click", handlers.overrideGo);
    },
    populateSurveys,
    readValues,
    renderPreflight,
    resetRouteSelection,
    selectedSurveyId: () => find("[data-survey-select]")?.value ?? "",
    setActions,
    setRunning(running) {
      const panel = find("[data-setup-panel]");
      const controls = find("[data-setup-controls]");
      if (panel) panel.dataset.running = String(running);
      if (controls) controls.hidden = running;
      documentRef.body?.classList?.toggle("runner-running", running);
    },
    setStatus(message, kind = "") {
      const output = find("[data-runner-status]");
      if (!output) return;
      output.dataset.kind = kind;
      output.textContent = message;
    },
    showDefinition,
  });
}

export function preflightMetrics(sample, nowMs = Date.now()) {
  const fix = sample?.normalized;
  const fixMs = Date.parse(fix?.fixTime);
  return {
    position: fix ? `${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)}` : "No position",
    floor: fix ? String(fix.z) : "—",
    age: Number.isFinite(fixMs) ? `${Math.max(0, Math.round((nowMs - fixMs) / 1000))} s` : "—",
    rtt: Number.isFinite(sample?.roundTripMs) ? `${sample.roundTripMs} ms` : "—",
  };
}

function preflightReasonText(preflight) {
  return preflight.reasons.length
    ? preflight.reasons.map(reason => reason.text).join(" ")
    : "All preflight checks passed.";
}

function formatDuration(seconds) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  return minutes ? `${minutes} min ${rounded % 60} s` : `${rounded} s`;
}
