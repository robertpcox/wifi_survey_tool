// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      renderDashboard(model), mountDashboard(options)
// WHY TOGETHER: Landing-page rendering and its one manifest load form one user capability.
// STATE:        Rendered customer manifest model
// RULES:        Escape manifest text and expose completed results only.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { createDashboardModel, reportPlayerUrl } from "../../domain/dashboard-selection.mjs";
import { esc } from "../../shared/format.mjs";

export function renderDashboard(model) {
  const surveyCards = model.surveys.map(survey => {
    const options = survey.results.length
      ? survey.results.map(result => `
        <li>
          <div>
            <strong>${esc(result.deviceLabel)}</strong>
            <span>${esc(formatDate(result.exportedAt))}</span>
          </div>
          <a class="dashboard-launch" href="${esc(reportPlayerUrl(result))}">
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
    <section class="dashboard-grid">${surveyCards || emptyDashboard()}</section>`;
}

export async function mountDashboard({ root, customerId, manifestSource }) {
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
    root.innerHTML = renderDashboard(model);
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
