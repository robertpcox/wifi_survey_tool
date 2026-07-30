// FEATURE:      Dashboard capture converter
// SURFACE:      renderCaptureConvertPanel, captureConversionPlan, renderCaptureSummary, collectDeviceOverrides
// WHY TOGETHER: Panel markup, capture planning, and per-device summaries form one conversion page.
// STATE:        None
// RULES:        Deployed and uploaded spines are co-equal; the spine's own device IP is skipped.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import {
  captureDeviceGroups,
  convertPositionCapture,
} from "../../domain/capture-conversion-v3.mjs";
import { esc } from "../../shared/format.mjs";

export const CAPTURE_DEVICE_TYPES = Object.freeze(["mobile", "laptop", "asset"]);
export const CAPTURE_DEVICE_BANDS = Object.freeze(["2.4", "5", "6", "mixed"]);

export function renderCaptureConvertPanel(choices) {
  const options = choices.map(choice => `
    <option value="${esc(choice.resultId)}">${esc(choice.label)}</option>`).join("");
  return `
    <section class="shell-card capture-convert" data-capture-convert>
      <p class="eyebrow">External capture</p>
      <h2>Convert a DesktopCloud capture</h2>
      <p>Pick a completed run as the spine — or upload one straight from the device —
        add the multi-device capture JSON, and mint one v3 result per extra device,
        entirely in this browser.</p>
      ${choices.length ? `<label>Spine · pick a deployed run
        <select data-capture-spine>${options}</select>
      </label>` : ""}
      <label>${choices.length ? "or upload" : "Spine · upload"} a run result file
        (.result.v3.json)
        <input type="file" accept=".json,application/json" data-capture-spine-file>
      </label>
      <label>DesktopCloud capture JSON
        <input type="file" accept=".json,application/json" data-capture-file>
      </label>
      <button type="button" data-capture-run disabled>Convert capture</button>
      <p data-capture-status>${choices.length
        ? "Pick a deployed run or upload one, then add the capture file."
        : "No deployed runs listed — upload a run result file to use as the spine."}</p>
      <div data-capture-summary></div>
    </section>`;
}

export function captureConversionPlan(spine, captures, {
  normalizeOutcome,
  resultId,
  deviceOverrides,
}) {
  if (!Array.isArray(captures)) {
    throw new Error("Capture file must be a JSON array of records.");
  }
  if (!captures.length) throw new Error("Capture file is empty.");
  const spineIp = spine?.run?.device?.clientIp ?? null;
  const skipped = [...captureDeviceGroups(captures)]
    .filter(([key]) => spineIp && key.split("|")[1] === spineIp)
    .map(([key, records]) => ({
      deviceName: key.split("|")[0],
      clientIp: spineIp,
      pollCount: records.length,
      skipped: true,
    }));
  const outputs = convertPositionCapture(spine, captures, {
    normalizeOutcome,
    resultId,
    deviceOverrides,
    excludeClientIps: spineIp ? [spineIp] : [],
  });
  if (!outputs.length) {
    throw new Error(skipped.length
      ? "Every capture device matches the survey device itself — nothing to convert."
      : "No convertible device records found in the capture.");
  }
  return { outputs, summaries: [...outputs.map(deviceSummary), ...skipped] };
}

export function renderCaptureSummary(summaries, defaults = {}) {
  return `<ul class="capture-devices">${summaries.map(item => `
    <li${item.skipped ? ' class="is-skipped"' : ""}
      data-capture-device="${esc(item.clientIp)}">
      <strong>${esc(item.deviceName)}</strong>
      <span>${esc(item.clientIp)} · ${esc(item.pollCount)} polls</span>
      <span>${item.skipped
        ? "Skipped — already the survey device"
        : esc(item.spanLabel)}</span>
      ${item.skipped ? "" : identityFields(defaults)}
    </li>`).join("")}
  </ul>`;
}

export function collectDeviceOverrides(summaryRoot) {
  const overrides = {};
  for (const row of summaryRoot.querySelectorAll?.("[data-capture-device]") ?? []) {
    overrides[row.dataset.captureDevice] = {
      type: row.querySelector("[data-device-type]")?.value || undefined,
      os: row.querySelector("[data-device-os]")?.value?.trim() || undefined,
      band: row.querySelector("[data-device-band]")?.value || undefined,
    };
  }
  return overrides;
}

function identityFields(defaults) {
  return `<span class="capture-identity">
    <label>Type <select data-device-type>
      ${optionList(CAPTURE_DEVICE_TYPES, defaults.type)}</select></label>
    <label>OS <input data-device-os placeholder="external-capture" value=""></label>
    <label>Band <select data-device-band>
      ${optionList(CAPTURE_DEVICE_BANDS, defaults.band)}</select></label>
  </span>`;
}

function optionList(values, selected) {
  return values.map(value => `<option value="${esc(value)}"${value === selected
    ? " selected" : ""}>${esc(value)}</option>`).join("");
}

function deviceSummary({ filename, result }) {
  const polls = result.polls;
  return {
    deviceName: result.run.device.name,
    clientIp: result.run.device.clientIp,
    pollCount: polls.length,
    skipped: false,
    filename,
    spanLabel: `${clockTime(polls[0].sentAt)} → ${clockTime(polls.at(-1).receivedAt)} UTC`,
  };
}

function clockTime(value) {
  return String(value).slice(11, 19);
}
