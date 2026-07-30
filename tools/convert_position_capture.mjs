// FEATURE:      DesktopCloud position-capture converter
// SURFACE:      convertPositionCapture(spine, captures), captureDeviceGroups(captures), and the CLI
// WHY TOGETHER: The CLI wraps the shared domain conversion core with filesystem input and output.
// STATE:        None
// RULES:        Conversion logic lives in src/domain/capture-conversion-v3.mjs; this file only wires it.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizePositionOutcome } from "../src/adapters/positioning/source-contract.mjs";
import {
  captureDeviceGroups,
  convertPositionCapture as convertCore,
} from "../src/domain/capture-conversion-v3.mjs";

export { captureDeviceGroups };

export function convertPositionCapture(spine, captures, options = {}) {
  return convertCore(spine, captures, {
    normalizeOutcome: normalizePositionOutcome,
    resultId: () => randomUUID(),
    ...options,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const devicesFlag = args.find(arg => arg.startsWith("--devices="));
  const [spinePath, capturePath, outDir = "results"] = args
    .filter(arg => !arg.startsWith("--"));
  if (!spinePath || !capturePath) {
    console.error("Usage: node tools/convert_position_capture.mjs <spine.result.v3.json>"
      + " <mazemap-position-capture.json> [outDir] [--devices=<clientIp-overrides.json>]");
    process.exitCode = 1;
    return;
  }
  const spine = JSON.parse(await readFile(spinePath, "utf-8"));
  const captures = JSON.parse(await readFile(capturePath, "utf-8"));
  if (!Array.isArray(captures)) throw new Error("Capture file must be a JSON array of records.");
  const deviceOverrides = devicesFlag
    ? JSON.parse(await readFile(devicesFlag.slice("--devices=".length), "utf-8"))
    : undefined;
  const outputs = convertPositionCapture(spine, captures, { deviceOverrides });
  if (!outputs.length) throw new Error("No convertible device records found in the capture.");
  await mkdir(outDir, { recursive: true });
  for (const { filename, result } of outputs) {
    await writeFile(join(outDir, filename), `${JSON.stringify(result, null, 2)}\n`);
    console.log(`${filename}: ${result.polls.length} polls for ${result.run.device.name} (${result.run.device.clientIp})`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
