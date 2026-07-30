// FEATURE:      Report diagnostic chart primitives
// SURFACE:      CHART, chartX, chartY, bucketExtremes, render chart helpers
// WHY TOGETHER: Shared axes, outage bands, and point thinning keep all run panels synchronized.
// STATE:        None
// RULES:        Preserve bucket extremes and use one elapsed-time projection.
// PROVENANCE:   Scope/steps/05b_improve_report.md

export const CHART = Object.freeze({
  width: 1000,
  left: 54,
  right: 18,
  top: 10,
  bottom: 90,
});

export function renderChartGrid(max, unit) {
  return [0, 0.5, 1].map(fraction => {
    const value = Math.round(max * (1 - fraction));
    const position = CHART.top + (CHART.bottom - CHART.top) * fraction;
    return `<line class="chart-grid" x1="${CHART.left}" x2="${CHART.width - CHART.right}"
      y1="${position}" y2="${position}"></line>
      <text x="${CHART.left - 7}" y="${position + 4}" text-anchor="end">${value}${unit}</text>`;
  }).join("");
}

export function renderCriticalDots(points, insights, key, max, offset = 0) {
  return thin(points, 120).map(point => `<circle class="chart-critical"
    cx="${chartX(point.elapsedSeconds, insights.durationSeconds)}"
    cy="${chartY(point[key] - offset, max)}" r="3"></circle>`).join("");
}

export function renderOutageBands(insights) {
  return insights.requestOutages.map(outage => `<rect class="chart-outage"
    x="${chartX(outage.elapsedSeconds, insights.durationSeconds)}" y="${CHART.top}"
    width="${Math.max(
      2,
      chartX(outage.durationSeconds, insights.durationSeconds) - CHART.left,
    )}" height="${CHART.bottom - CHART.top}"></rect>`).join("");
}

export function renderTimeAxis(duration) {
  return `<text class="chart-time" x="${CHART.left}" y="106">0:00</text>
    <text class="chart-time" x="${CHART.width - CHART.right}" y="106"
      text-anchor="end">${clock(duration)}</text>`;
}

export function bucketExtremes(points, key, buckets = 120) {
  if (points.length <= buckets * 2) return points;
  const size = Math.ceil(points.length / buckets);
  return Array.from({ length: Math.ceil(points.length / size) }, (_, index) => {
    const bucket = points.slice(index * size, (index + 1) * size);
    const peak = bucket.reduce((highest, point) => (
      point[key] > highest[key] ? point : highest
    ), bucket[0]);
    return [bucket[0], peak, bucket.at(-1)];
  }).flat().sort((left, right) => left.elapsedSeconds - right.elapsedSeconds);
}

export function chartX(seconds, duration) {
  return round(CHART.left + seconds / Math.max(duration, 1)
    * (CHART.width - CHART.left - CHART.right));
}

export function chartY(value, max) {
  return round(CHART.bottom - Math.max(0, value) / Math.max(max, 1)
    * (CHART.bottom - CHART.top));
}

function thin(points, limit) {
  const step = Math.max(1, Math.ceil(points.length / limit));
  return points.filter((_point, index) => index % step === 0);
}

function clock(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}
