import {
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";

export const V3_APPS = Object.freeze([
  "dashboard",
  "creator",
  "runner",
  "report-player",
]);

export async function stageDistribution(root, destination) {
  await mkdir(destination, { recursive: true });
  await copyProductionTree(resolve(root, "src"), resolve(destination, "src"));
  for (const app of V3_APPS) {
    const source = await readFile(resolve(root, `src/apps/${app}/index.html`), "utf8");
    await mkdir(resolve(destination, app), { recursive: true });
    await writeFile(
      resolve(destination, app, "index.html"),
      builtAppHtml(source, app, false),
    );
  }
  const dashboard = await readFile(
    resolve(root, "src/apps/dashboard/index.html"),
    "utf8",
  );
  await writeFile(resolve(destination, "index.html"), builtAppHtml(dashboard, "dashboard", true));
  for (const family of ["data/manifests", "data/surveys", "results"]) {
    await copyIfPresent(resolve(root, family), resolve(destination, family));
  }
  return verifyDistribution(destination);
}

export async function verifyDistribution(root) {
  const failures = [];
  for (const path of await productionFiles(root)) {
    if (path.endsWith(".test.mjs")) failures.push(`${path}: test file emitted`);
    if (![".html", ".mjs", ".css"].includes(extname(path))) continue;
    const text = await readFile(path, "utf8");
    if (/\bhttps?:\/\//i.test(text)) failures.push(`${path}: external asset URL`);
    for (const reference of dependencies(text, extname(path))) {
      if (!reference.startsWith(".")) continue;
      const target = resolve(dirname(path), reference.split(/[?#]/)[0]);
      try {
        if (!(await stat(target)).isFile()) failures.push(`${path}: missing ${reference}`);
      } catch {
        failures.push(`${path}: missing ${reference}`);
      }
    }
  }
  if (failures.length) throw new Error(`Distribution verification failed:\n${failures.join("\n")}`);
  return { files: (await productionFiles(root)).length };
}

function builtAppHtml(source, app, rootIndex) {
  const assetPrefix = rootIndex ? "./src" : "../src";
  let output = source
    .replace("../../shared/app-shell.css", `${assetPrefix}/shared/app-shell.css`)
    .replace("./main.mjs", `${assetPrefix}/apps/${app}/main.mjs`);
  if (rootIndex) output = output.replaceAll("href=\"../", "href=\"./");
  return output;
}

async function copyProductionTree(source, destination) {
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name === "route-survey" && source.endsWith(`${sep}apps`)) continue;
    if (entry.name === "fixtures" || entry.name.endsWith(".test.mjs")) continue;
    const from = resolve(source, entry.name);
    const to = resolve(destination, entry.name);
    if (entry.isDirectory()) {
      await mkdir(to, { recursive: true });
      await copyProductionTree(from, to);
    } else if (entry.isFile() && [".mjs", ".css"].includes(extname(entry.name))) {
      await mkdir(dirname(to), { recursive: true });
      await cp(from, to);
    }
  }
}

async function copyIfPresent(source, destination) {
  try {
    await cp(source, destination, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function productionFiles(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await productionFiles(path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths.sort();
}

function dependencies(text, extension) {
  const values = [];
  const patterns = extension === ".html"
    ? [/<(?:link|script)\b[^>]*(?:href|src)=["']([^"']+)["']/gi]
    : [/\b(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) values.push(match[1]);
  }
  return values;
}

export function relativeFiles(root, files) {
  return files.map(path => relative(root, path).split(sep).join("/"));
}
