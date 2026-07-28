import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

export const FIXED_ISO = "2026-07-28T00:00:00.000Z";

export async function firstReadable(root, paths) {
  for (const path of paths) {
    try {
      return { path, text: await readFile(new URL(path, root), "utf8") };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw new Error(`None of these inputs exist: ${paths.join(", ")}`);
}

function makeElement(id) {
  const defaults = {
    clientIp: "",
    configId: "1185",
    lipiUrl: "https://ndh-ob-public.mazepos.com/position",
    pollInterval: "2000",
    routeName: "",
    wpSpacing: "15",
  };
  return {
    id,
    value: defaults[id] ?? "",
    checked: false,
    textContent: "",
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
  };
}

export function loadBaseline(source) {
  const match = source.match(/<script>\s*([\s\S]*?)<\/script>/);
  if (!match) throw new Error("The route survey inline script was not found");
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    querySelector() {
      return { addEventListener() {}, open: true };
    },
  };
  class FixedDate extends Date {
    constructor(value) {
      super(value === undefined ? FIXED_ISO : value);
    }
    static now() {
      return Date.parse(FIXED_ISO);
    }
  }
  const context = {
    AbortController,
    Blob,
    Date: FixedDate,
    JSON,
    Math,
    URL,
    URLSearchParams,
    clearInterval,
    clearTimeout,
    console,
    document,
    fetch() {
      throw new Error("Characterization must not use the network");
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: {},
    setInterval,
    setTimeout,
    structuredClone,
    window: {
      addEventListener() {},
      matchMedia() {
        return { matches: false };
      },
    },
  };
  const expose = `
    globalThis.step1Baseline = {
      checkpoints(routeStops, routeLegs, spacing) {
        stops = normalizeStops(structuredClone(routeStops));
        legs = structuredClone(routeLegs);
        document.getElementById("wpSpacing").value = String(spacing);
        generateWaypoints();
        return structuredClone(waypoints);
      },
      routeExport(name, routeStops) {
        stops = normalizeStops(structuredClone(routeStops));
        return routeDefinition(name);
      },
      sessionExport(input) {
        stops = structuredClone(input.stops);
        legs = structuredClone(input.legs);
        waypoints = structuredClone(input.waypoints);
        samples = structuredClone(input.samples);
        events = structuredClone(input.events);
        sessionMeta = structuredClone(input.sessionMeta);
        for (const [id, value] of Object.entries(input.fields)) {
          document.getElementById(id).value = String(value);
        }
        return buildSession();
      },
    };
  `;
  vm.runInNewContext(`${match[1]}\n${expose}`, context, {
    filename: "route-survey-baseline.js",
  });
  return context.step1Baseline;
}

export function monofileInventory(source, path) {
  const functions = [...source.matchAll(
    /^\s*(?:async\s+)?function\s+(\w+)\s*\(/gm,
  )].map(match => match[1]);
  const actions = [...source.matchAll(
    /\bon(?:click|change|input)="([A-Za-z_$][\w$]*)\s*\(/g,
  )].map(match => match[1]);
  const elementIds = [...source.matchAll(/\bid="([^"]+)"/g)]
    .map(match => match[1]);
  return {
    source: path,
    sha256: createHash("sha256").update(source).digest("hex"),
    functions: [...new Set(functions)].sort(),
    inlineActions: [...new Set(actions)].sort(),
    elementIds: [...new Set(elementIds)].sort(),
  };
}
