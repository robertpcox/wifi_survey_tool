// FEATURE:      Report Player KPI summary
// SURFACE:      renderKpiView(analysis)
// WHY TOGETHER: Accuracy, freshness, and availability lanes form one honest summary section.
// STATE:        None
// RULES:        Accuracy quotes unique fixes scored at fix time; delivery lag stays in freshness.
// PROVENANCE:   NDH 2026-07-30 fix-matched accuracy findings

import { esc } from "../../shared/format.mjs";

export function renderKpiView(analysis) {
  const { accuracy, freshness, availability } = analysis.fixes;
  return `
    <div class="section-heading">
      <div><p class="section-kicker">Summary</p><h2>Run at a glance</h2></div>
      <p>${esc(confidenceStatement(accuracy))}</p>
    </div>
    <div class="kpi-grid">
      ${lane("Accuracy", "Radio and AP story · unique fixes scored at their fix time", [
        ["Unique fixes", `${accuracy.scoredFixCount} of ${accuracy.uniqueFixCount} scored`],
        ["Median error", unit(accuracy.medianAccuracyM, "m")],
        ["P95 error", unit(accuracy.p95AccuracyM, "m")],
        ["Within provider confidence", pct(accuracy.withinConfidencePercent)],
        [`Beyond ${analysis.thresholds.accuracyM} m`, pct(accuracy.beyondThresholdPercent)],
      ])}
      ${lane("Freshness", "Cloud pipeline story · how late and how often fixes arrive", [
        ["Delivery latency (median)", unit(freshness.medianDeliveryLatencySeconds, "s")],
        ["Delivery latency (p95)", unit(freshness.p95DeliveryLatencySeconds, "s")],
        ["New fix every", unit(freshness.medianFixIntervalSeconds, "s")],
        ["Longest hold", unit(freshness.longestHoldSeconds, "s")],
        ["No fresh fix while moving", `${unit(freshness.noFreshFixSeconds, "s")}
          · ${pct(freshness.noFreshFixPercent)}`],
        ["Lag behind (median / p95)", `${unit(freshness.medianLagBehindM, "m")}
          / ${unit(freshness.p95LagBehindM, "m")}`],
      ])}
      ${lane("Availability", "Network story · did a usable position come back at all", [
        ["Poll success", pct(availability.successPercent)],
        ["Median RTT", unit(availability.medianRttMs, "ms")],
        ["P95 RTT", unit(availability.p95RttMs, "ms")],
        ["Failed requests", String(availability.failureCount)],
        [`Effectively no position (> ${availability.noPositionThresholdSeconds} s old)`,
          `${unit(availability.noPositionSeconds, "s")}
          · ${pct(availability.noPositionPercent)}`],
      ])}
    </div>`;
}

function confidenceStatement(accuracy) {
  if (!accuracy.confidenceJudgedCount) {
    return "The provider reported no confidence radius to judge fixes against.";
  }
  return `${accuracy.withinConfidenceCount} of ${accuracy.confidenceJudgedCount} `
    + `unique fixes (${pct(accuracy.withinConfidencePercent)}) landed within `
    + "the provider's own confidence radius.";
}

function lane(title, subtitle, rows) {
  return `<article class="kpi-lane">
    <h3>${esc(title)}</h3>
    <p>${esc(subtitle)}</p>
    <dl>${rows.map(([label, value]) => `
      <div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}
    </dl>
  </article>`;
}

function unit(value, suffix) {
  return Number.isFinite(value) ? `${value.toFixed(1)} ${suffix}` : "—";
}

function pct(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
}
