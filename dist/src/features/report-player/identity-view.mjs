// FEATURE:      Report Player identity and metadata
// SURFACE:      renderIdentityView(result)
// WHY TOGETHER: Run identity and survey metadata form one report header.
// STATE:        None
// RULES:        Escape result text and name floors only from the embedded meta block.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

export function renderIdentityView(result) {
  const meta = result?.meta ?? {};
  const run = result?.run ?? {};
  const device = run.device ?? {};
  const floors = (meta.zLevels ?? []).map(z => {
    const name = floorName(meta, z);
    return `<li><span>${esc(name)}</span> <small>z ${esc(z)}</small></li>`;
  }).join("");
  return `
    <section class="report-identity" aria-labelledby="report-identity-title">
      <header>
        <p class="eyebrow">${esc(meta.customerName)} · ${esc(meta.campusName)}</p>
        <h1 id="report-identity-title">${esc(meta.surveyName)}</h1>
        <p>${esc(run.completionStatus)} · ${esc(run.resultId)}</p>
      </header>
      <dl class="identity-grid">
        ${row("Customer", meta.customerName, meta.customerId)}
        ${row("Campus", meta.campusName, meta.campusId)}
        ${row("Survey", meta.surveyName, meta.surveyId)}
        ${row("Device type", device.type)}
        ${row("Device", device.name)}
        ${row("Operating system", device.os)}
        ${row("Wi-Fi band", bandLabel(run.band))}
        ${row("Run status", run.completionStatus)}
        ${timeRow("Started", run.startedAt)}
        ${timeRow("Stopped", run.stoppedAt)}
        ${timeRow("Exported", run.exportedAt)}
        ${row("Elapsed", elapsedLabel(run.startedAt, run.stoppedAt))}
        ${row("Operator comment", run.operatorComment || "None recorded")}
      </dl>
      <div class="identity-floors">
        <h2>Survey floors</h2>
        <ul>${floors || "<li>No floors configured</li>"}</ul>
      </div>
    </section>`;
}

function row(label, value, detail) {
  const secondary = detail ? ` <small>${esc(detail)}</small>` : "";
  return `<div><dt>${esc(label)}</dt><dd>${esc(value)}${secondary}</dd></div>`;
}

function timeRow(label, value) {
  if (!value) return row(label, "Not recorded");
  const safe = esc(value);
  return `<div><dt>${esc(label)}</dt><dd><time datetime="${safe}">${safe}</time></dd></div>`;
}

function elapsedLabel(start, stop) {
  const elapsed = (Date.parse(stop) - Date.parse(start)) / 1000;
  return Number.isFinite(elapsed) && elapsed >= 0
    ? `${elapsed.toFixed(1)} seconds`
    : "Not available";
}

function bandLabel(value) {
  return value && value !== "mixed" ? `${value} GHz` : value;
}

function floorName(meta, z) {
  const name = meta.zLevelNames?.[String(z)];
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError(`meta.zLevelNames.${z} must name the floor`);
  }
  return name;
}
