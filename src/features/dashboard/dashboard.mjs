// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      renderDashboard(model), mountDashboard(options)
// WHY TOGETHER: Landing-page rendering and its one manifest load form one user capability.
// STATE:        Rendered customer manifest model
// RULES:        Escape manifest text and expose completed results only.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import {
  consolidatedReportUrl,
  createDashboardModel,
  reportPlayerUrl,
} from "../../domain/dashboard-selection.mjs";
import { esc } from "../../shared/format.mjs";
import { renderDashboardMapAccess } from "./dashboard-map-access.mjs";

export function renderDashboard(model, reportPlayerBase) {
  const consolidated = renderConsolidated(model, reportPlayerBase);
  const surveyCards = model.surveys.map(survey => {
    const options = survey.results.length
      ? survey.results.map(result => `
        <li>
          <div>
            <strong>${esc(result.deviceLabel)}</strong>
            <span>${esc(formatDate(result.exportedAt))}</span>
          </div>
          <a class="dashboard-launch" data-report-launch
            href="${esc(reportPlayerUrl(result, reportPlayerBase))}">
            Open Report Player
          </a>
        </li>`).join("")
      : `<li class="dashboard-empty">No completed results yet.</li>`;
    return `
      <article class="dashboard-survey">
        <div>
          <p class="dashboard-kicker">Survey</p>
          <h2>${esc(survey.surveyName)}</h2>
          <p>Campus ${esc(survey.campusId)} · Route ${esc(survey.routeId)}</p>
        </div>
        <ul>${options}</ul>
      </article>`;
  }).join("");
  return `
    <section class="dashboard-heading">
      <p class="eyebrow">Customer dashboard</p>
      <h1>${esc(model.customerName)}</h1>
      <p>${model.surveys.length} available survey${model.surveys.length === 1 ? "" : "s"}</p>
    </section>
    ${renderDashboardMapAccess()}
    ${consolidated}
    <section class="dashboard-grid">${surveyCards || emptyDashboard()}</section>`;
}

function renderConsolidated(model, reportPlayerBase) {
  const campuses = model.campuses ?? [];
  const actions = campuses.map(campus => `
    <li>
      <div>
        <strong>Campus ${esc(campus.campusId)}</strong>
        <span>${esc(campus.runCount)} completed runs ·
          ${esc(campus.surveyCount)} surveys</span>
      </div>
      <a class="dashboard-consolidated-launch" data-report-launch
        href="${esc(consolidatedReportUrl(campus, reportPlayerBase))}">
        Open report and choose runs
      </a>
    </li>`).join("");
  return `<section class="dashboard-consolidated" aria-labelledby="consolidated-title">
    <div>
      <p class="dashboard-kicker">First look</p>
      <h2 id="consolidated-title">Consolidated issue report</h2>
      <p>Choose eligible runs by campus to find frozen path sections,
        held Cisco positions, lag, and room/corridor area failures.</p>
    </div>
    <ul>${actions || '<li class="dashboard-empty">No completed runs to consolidate.</li>'}</ul>
  </section>`;
}

export async function mountDashboard({
  root,
  customerId,
  manifestSource,
  reportPlayerBase,
}) {
  if (!customerId) {
    root.innerHTML = `
      <section class="shell-card">
        <h1>Choose a customer</h1>
        <p>Add <code>?customer_id=customer-id</code> to this dashboard URL.</p>
      </section>`;
    return null;
  }
  root.setAttribute("aria-busy", "true");
  try {
    const model = createDashboardModel(
      await manifestSource.customer(customerId),
      customerId,
    );
    root.innerHTML = renderDashboard(model, reportPlayerBase);
    return model;
  } catch (error) {
    root.innerHTML = `
      <section class="shell-card dashboard-error">
        <h1>Dashboard unavailable</h1>
        <p>${esc(error.message)}</p>
      </section>`;
    return null;
  } finally {
    root.removeAttribute("aria-busy");
  }
}

function emptyDashboard() {
  return `<article class="dashboard-survey"><h2>No surveys available</h2></article>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
