// FEATURE:      Full-screen Report Player
// SURFACE:      mountPlayerCharts(root, options)
// WHY TOGETHER: Error and fix-age plots share one time scale, cursor, and seek interaction.
// STATE:        Playback cursor positions in two deterministic SVG plots
// RULES:        Dots mark unique fixes sized by hold time; seeks never alter evidence.
// PROVENANCE:   Scope/steps/05a_recast_player.md

const WIDTH = 320;
const HEIGHT = 96;
const PAD = 18;

export function mountPlayerCharts(root, {
  series = [],
  durationMs,
  onSeek,
}) {
  root.innerHTML = [
    chart("Position error", "distanceM", "m", series, durationMs),
    chart("Fix age", "fixAgeSeconds", "s", series, durationMs),
  ].join("");
  root.addEventListener("click", event => seekFrom(event.target, onSeek));
  root.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (seekFrom(event.target, onSeek)) event.preventDefault();
  });
  return Object.freeze({
    update(elapsedMs) {
      const x = xAt(elapsedMs, durationMs);
      root.querySelectorAll("[data-chart-cursor]").forEach(line => {
        line.setAttribute("x1", x);
        line.setAttribute("x2", x);
      });
    },
  });
}

function chart(label, key, unit, series, durationMs) {
  const values = series.filter(item => Number.isFinite(item[key]));
  const maximum = Math.max(1, ...values.map(item => item[key]));
  const polyline = values.map(item => (
    `${xAt(item.elapsedMs, durationMs)},${yAt(item[key], maximum)}`
  )).join(" ");
  return `
    <figure class="player-chart">
      <figcaption>${label}<span>max ${format(maximum)} ${unit}</span></figcaption>
      <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${label} over playback time">
        <line x1="${PAD}" y1="${HEIGHT - PAD}" x2="${WIDTH - PAD}"
          y2="${HEIGHT - PAD}" class="chart-axis"/>
        <polyline points="${polyline}" class="chart-line"/>
        ${uniqueFixDots(values, key, unit, maximum, durationMs)}
        <line x1="${PAD}" y1="${PAD}" x2="${PAD}" y2="${HEIGHT - PAD}"
          class="chart-cursor" data-chart-cursor/>
      </svg>
    </figure>`;
}

function uniqueFixDots(values, key, unit, maximum, durationMs) {
  const changed = values.filter(item => item.identityChanged);
  const dots = changed.length ? changed : values;
  const endMs = values.at(-1)?.elapsedMs ?? 0;
  return dots.map((item, index) => point(
    item,
    key,
    unit,
    maximum,
    durationMs,
    ((dots[index + 1]?.elapsedMs ?? endMs) - item.elapsedMs) / 1000,
  )).join("");
}

function point(item, key, unit, maximum, durationMs, holdSeconds) {
  const label = `${item.pollId}: ${format(item[key])} ${unit}`
    + `, held ${format(holdSeconds)} s`;
  const radius = Math.min(8, 2.5 + Math.sqrt(Math.max(0, holdSeconds)) * 0.8);
  return `<circle cx="${xAt(item.elapsedMs, durationMs)}" cy="${yAt(item[key], maximum)}"
    r="${format(radius)}" tabindex="0" role="button" aria-label="${label}"
    data-chart-seek="${item.elapsedMs}"><title>${label}</title></circle>`;
}

function seekFrom(target, onSeek) {
  const value = target?.dataset?.chartSeek;
  if (value == null) return false;
  onSeek(Number(value));
  return true;
}

function xAt(elapsedMs, durationMs) {
  const fraction = durationMs > 0 ? Math.min(1, Math.max(0, elapsedMs / durationMs)) : 0;
  return PAD + fraction * (WIDTH - PAD * 2);
}

function yAt(value, maximum) {
  return HEIGHT - PAD - (value / maximum) * (HEIGHT - PAD * 2);
}

function format(value) {
  return Number(value).toFixed(1);
}
