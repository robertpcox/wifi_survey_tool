// FEATURE:      Dashboard capture converter
// SURFACE:      bindCaptureConvertPanel(options)
// WHY TOGETHER: Deployed or uploaded spine, capture upload, and per-device downloads share one panel.
// STATE:        Spine choices, an optional uploaded spine, parsed capture, and conversion outputs
// RULES:        The latest chosen spine source wins; downloads re-mint through the same validation.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import { downloadFile as browserDownload } from "../../adapters/download.mjs";
import { normalizePositionOutcome } from "../../adapters/positioning/source-contract.mjs";
import { esc } from "../../shared/format.mjs";
import {
  captureConversionPlan,
  collectDeviceOverrides,
  renderCaptureConvertPanel,
  renderCaptureSummary,
} from "./capture-convert.mjs";
import {
  captureSpineChoices,
  parseCaptureRecords,
  parseSpineResult,
  spineRunLabel,
} from "./capture-spine.mjs";

export async function bindCaptureConvertPanel({
  root,
  customerId,
  manifestSource,
  downloadFile = browserDownload,
  normalizeOutcome = normalizePositionOutcome,
  resultId = () => globalThis.crypto.randomUUID(),
}) {
  if (!root || !customerId) return null;
  const choices = captureSpineChoices(
    await manifestSource.customer(customerId).catch(() => null),
  );
  root.hidden = false;
  root.innerHTML = renderCaptureConvertPanel(choices);
  const spineSelect = root.querySelector("[data-capture-spine]");
  const spineFile = root.querySelector("[data-capture-spine-file]");
  const fileInput = root.querySelector("[data-capture-file]");
  const runButton = root.querySelector("[data-capture-run]");
  const status = root.querySelector("[data-capture-status]");
  const summary = root.querySelector("[data-capture-summary]");
  let outputs = [];
  let context = null;
  let uploadedSpine = null;

  spineFile.addEventListener("change", async () => {
    summary.innerHTML = "";
    try {
      uploadedSpine = spineFile.files?.[0]
        ? parseSpineResult(await spineFile.files[0].text())
        : null;
      status.textContent = uploadedSpine
        ? `Using uploaded run: ${spineRunLabel(uploadedSpine)}`
        : "Pick a deployed run or upload one.";
    } catch (error) {
      uploadedSpine = null;
      status.textContent = error.message;
    }
    updateRun();
  });
  spineSelect?.addEventListener("change", () => {
    uploadedSpine = null;
    spineFile.value = "";
    summary.innerHTML = "";
    const chosen = choices.find(choice => choice.resultId === spineSelect.value);
    status.textContent = `Using deployed run: ${chosen?.label ?? "unknown run"}`;
    updateRun();
  });
  fileInput.addEventListener("change", () => {
    summary.innerHTML = "";
    updateRun();
    status.textContent = runButton.disabled
      ? (fileInput.files?.[0]
        ? "Pick a deployed run or upload one first."
        : "Choose the capture file to enable conversion.")
      : "Ready to convert.";
  });
  runButton.addEventListener("click", () => convert());
  summary.addEventListener("click", event => {
    if (!event.target.closest?.("[data-capture-download]") || !context) return;
    try {
      outputs = captureConversionPlan(context.spine, context.captures, {
        normalizeOutcome,
        resultId,
        deviceOverrides: collectDeviceOverrides(summary),
      }).outputs;
    } catch (error) {
      status.textContent = error.message;
      return;
    }
    for (const output of outputs) {
      downloadFile(
        output.filename,
        `${JSON.stringify(output.result, null, 2)}\n`,
        "application/json",
      );
    }
    status.textContent = `Downloaded ${outputs.length} result file(s).`;
  });

  function updateRun() {
    runButton.disabled = !fileInput.files?.[0]
      || (!uploadedSpine && !choices.length);
  }

  async function convert() {
    runButton.disabled = true;
    status.textContent = "Converting…";
    summary.innerHTML = "";
    try {
      const spine = uploadedSpine ?? await deployedSpine();
      const captures = parseCaptureRecords(await fileInput.files[0].text());
      const plan = captureConversionPlan(spine, captures, {
        normalizeOutcome,
        resultId,
      });
      outputs = plan.outputs;
      context = { spine, captures };
      status.textContent = `${outputs.length} device result(s) ready from `
        + `${uploadedSpine ? "uploaded" : "deployed"} run ${spineRunLabel(spine)} · `
        + "adjust identities below, then download.";
      summary.innerHTML = `${renderCaptureSummary(plan.summaries, {
        type: spine.run.device.type,
        band: spine.run.band,
      })}
        <button type="button" data-capture-download>
          Download ${esc(outputs.length)} result file(s)</button>`;
    } catch (error) {
      outputs = [];
      context = null;
      status.textContent = error.message;
    } finally {
      updateRun();
    }
  }

  async function deployedSpine() {
    const entry = choices.find(choice => choice.resultId === spineSelect?.value)
      ?? choices[0];
    if (!entry) throw new Error("Pick a deployed run or upload a run result file first.");
    return manifestSource.result(entry.path);
  }

  return Object.freeze({ convert, get outputs() { return [...outputs]; } });
}
