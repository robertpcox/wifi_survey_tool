// FEATURE:      Consolidated report run selection
// SURFACE:      createCampusRunSelection(options)
// WHY TOGETHER: Eligible run rows, draft checkboxes, and the applied subset share one identity set.
// STATE:        Draft and applied eligible result IDs for one report session
// RULES:        Default all; ignore unknown IDs; require at least one run before applying.
// PROVENANCE:   User-selected campus consolidation

import { esc } from "../../shared/format.mjs";

export function createCampusRunSelection({
  currentResult, entries = [], surveys = [], includeCurrent = true,
}) {
  const surveyNames = new Map(surveys.map(item => [item.surveyId, item.surveyName]));
  const rows = [
    ...(includeCurrent ? [currentRow(currentResult)] : []),
    ...entries.map(entry => entryRow(entry, surveyNames)),
  ].sort((left, right) => right.at.localeCompare(left.at)
    || left.resultId.localeCompare(right.resultId));
  const eligible = new Set(rows.map(row => row.resultId));
  let applied = new Set(eligible);
  let draft = new Set(applied);

  function setDraft(ids) {
    draft = new Set([...ids].filter(id => eligible.has(id)));
    return [...draft];
  }

  function applyDraft(ids = draft) {
    setDraft(ids);
    if (!draft.size) return null;
    applied = new Set(draft);
    return [...applied];
  }

  function bind(root, onApply) {
    const inputs = [...root.querySelectorAll("[data-campus-run-id]")];
    const apply = root.querySelector("[data-campus-run-action=apply]");
    const count = root.querySelector("[data-campus-run-count]");
    const status = root.querySelector("[data-campus-run-status]");
    const sync = () => {
      setDraft(inputs.filter(input => input.checked).map(input => input.dataset.campusRunId));
      if (count) count.textContent = `${draft.size} of ${rows.length} selected`;
      if (apply) apply.disabled = !draft.size || sameSet(draft, applied);
      if (status) status.textContent = draft.size
        ? (sameSet(draft, applied) ? "Report is using this selection." : "Selection ready to apply.")
        : "Choose at least one run.";
    };
    inputs.forEach(input => input.addEventListener("change", sync));
    bindChoice(root, "all", inputs, true, sync);
    bindChoice(root, "clear", inputs, false, sync);
    apply?.addEventListener("click", async () => {
      if (!draft.size || sameSet(draft, applied)) return;
      const selected = applyDraft();
      sync();
      if (status) status.textContent = "Updating consolidated report…";
      try {
        await onApply(selected);
        if (status) status.textContent = "Consolidated report updated.";
      } catch (error) {
        if (status) status.textContent = error.message;
      }
    });
  }

  function html({ enabled = true } = {}) {
    const disabled = enabled ? "" : " disabled";
    return `<details class="campus-run-selection">
      <summary>Runs included <strong data-campus-run-count>${draft.size} of ${rows.length} selected</strong></summary>
      <p>Only checked runs enter the map, graphs, and room/corridor scores.</p>
      <div class="campus-run-selection-actions">
        <button type="button" data-campus-run-action="all"${disabled}>Select all</button>
        <button type="button" data-campus-run-action="clear"${disabled}>Clear</button>
        <button type="button" class="primary" data-campus-run-action="apply"
          ${!enabled || !draft.size || sameSet(draft, applied) ? "disabled" : ""}>Update consolidated report</button>
      </div>
      <div class="campus-run-selection-grid">${rows.map(row => `<label>
        <input type="checkbox" data-campus-run-id="${esc(row.resultId)}"
          ${draft.has(row.resultId) ? "checked" : ""}${disabled}>
        <span>${esc(row.surveyName)}<small>${esc(row.detail)}</small></span>
      </label>`).join("")}</div>
      <p data-campus-run-status>${enabled
    ? (draft.size ? "Report is using this selection." : "Choose at least one run.")
    : "Eligible runs are loading…"}</p>
    </details>`;
  }

  return Object.freeze({
    apply: applyDraft,
    bind,
    html,
    includes: id => applied.has(id),
    setDraft,
    get eligibleCount() { return rows.length; },
    get selectedCount() { return applied.size; },
    get selectedIds() { return [...applied]; },
  });
}

function bindChoice(root, action, inputs, checked, sync) {
  root.querySelector(`[data-campus-run-action=${action}]`)?.addEventListener("click", () => {
    inputs.forEach(input => { input.checked = checked; });
    sync();
  });
}

function currentRow(result) {
  return {
    resultId: result.run.resultId,
    surveyName: result.meta.surveyName,
    at: result.run.startedAt,
    detail: detail(result.run.device, result.run.startedAt, result.run.resultId, result.run.band),
  };
}

function entryRow(entry, surveyNames) {
  return {
    resultId: entry.resultId,
    surveyName: surveyNames.get(entry.surveyId) ?? "Survey run",
    at: entry.exportedAt,
    detail: detail(entry.device, entry.exportedAt, entry.resultId, entry.band),
  };
}

function detail(device = {}, at, id, band) {
  return [device.name, device.os, device.type, band ? `${band} GHz` : null, at,
    String(id).slice(0, 8)].filter(Boolean).join(" · ");
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every(value => right.has(value));
}
