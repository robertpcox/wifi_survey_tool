import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const inventoryPath = resolve(
  root,
  "data/characterization/step1/monofile-inventory.json",
);
const referencePath = resolve(root, "data/reference/route-survey-index.html");
const appPath = resolve(root, "src/apps/route-survey/index.html");
const reportPath = resolve(
  root,
  "data/characterization/step1/split-inventory.json",
);
const aliases = {
  drawStopsFrom: ["src/adapters/map/layers.mjs", "drawStops"],
  fetchSource: ["src/adapters/positioning/sources.mjs", "fetchPositionSource"],
  mkWaypoint: ["src/domain/checkpoints.mjs", "makeCheckpoint"],
  pbPause: ["src/features/runner/playback.mjs", "pause"],
  pbPlay: ["src/features/runner/playback.mjs", "play"],
  pbRender: ["src/features/runner/playback.mjs", "render"],
  redrawRoute: ["src/adapters/map/layers.mjs", "drawRoute"],
  setSrc: ["src/adapters/map/layers.mjs", "setSource"],
  trailPtPaint: ["src/adapters/map/layer-styles.mjs", "trailPoint"],
  updateWalkDist: ["src/features/runner/walk-view.mjs", "updateDistance"],
};

async function collectModules(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collectModules(path, files);
    else if (entry.isFile()
      && extname(path) === ".mjs"
      && !path.endsWith(".test.mjs")) {
      files.push(path);
    }
  }
  return files;
}

function containsIdentifier(text, identifier) {
  return new RegExp(`\\b${identifier}\\b`).test(text);
}

const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const reference = await readFile(referencePath, "utf8");
const actualHash = createHash("sha256").update(reference).digest("hex");
const failures = [];
if (actualHash !== inventory.sha256) {
  failures.push("the preserved monofile hash changed");
}

const modulePaths = await collectModules(resolve(root, "src"));
const modules = await Promise.all(modulePaths.map(async path => ({
  path: relative(root, path),
  text: await readFile(path, "utf8"),
})));
const mappings = {};
for (const name of inventory.functions) {
  const direct = modules.find(module => containsIdentifier(module.text, name));
  if (direct) {
    mappings[name] = { path: direct.path, symbol: name };
    continue;
  }
  const alias = aliases[name];
  const target = alias && modules.find(module => module.path === alias[0]);
  if (!target || !containsIdentifier(target.text, alias[1])) {
    failures.push(`legacy function ${name} has no split mapping`);
  } else {
    mappings[name] = { path: alias[0], symbol: alias[1] };
  }
}

const appHtml = await readFile(appPath, "utf8");
for (const id of inventory.elementIds) {
  if (!appHtml.includes(`id="${id}"`)) {
    failures.push(`legacy element #${id} is missing`);
  }
}
const moduleText = modules.map(module => module.text).join("\n");
for (const action of inventory.inlineActions) {
  if (!containsIdentifier(moduleText, action)) {
    failures.push(`legacy browser action ${action} is missing`);
  }
}

const report = {
  sourceSha256: actualHash,
  legacyFunctionCount: inventory.functions.length,
  mappedFunctions: mappings,
  legacyElementCount: inventory.elementIds.length,
  retainedElementCount: inventory.elementIds.length
    - failures.filter(failure => failure.startsWith("legacy element")).length,
  legacyActionCount: inventory.inlineActions.length,
};
await mkdir(resolve(reportPath, ".."), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) {
  console.error(`Step 1 completeness failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(
    `Step 1 completeness passed: ${inventory.functions.length} functions, `
      + `${inventory.elementIds.length} element IDs, `
      + `${inventory.inlineActions.length} actions mapped.`,
  );
}
