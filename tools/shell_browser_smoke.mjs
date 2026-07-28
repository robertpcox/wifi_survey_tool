import { createServer } from "node:http";
import { constants, createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
export const SHELL_PATHS = Object.freeze([
  "/dashboard/",
  "/creator/",
  "/runner/",
  "/report-player/",
]);

export function contentTypeFor(path) {
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
  }[extname(path)] || "application/octet-stream";
}

export async function runShellBrowserSmoke({
  root,
  origin,
  chrome = process.env.CHROME_PATH
    || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  puppeteerPath = process.env.PUPPETEER_CORE_PATH
    || "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core",
} = {}) {
  try {
    await access(chrome, constants.X_OK);
  } catch {
    return { skipped: true, reason: `Chrome unavailable at ${chrome}` };
  }
  let puppeteer;
  try {
    puppeteer = require(puppeteerPath);
  } catch (error) {
    return { skipped: true, reason: `puppeteer-core unavailable: ${error.message}` };
  }
  const server = origin ? null : await startStaticServer(root);
  const baseOrigin = origin || server.origin;
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
    const failures = [];
    for (const path of SHELL_PATHS) {
      failures.push(...await inspectShell(browser, `${baseOrigin}${path}`));
    }
    if (origin) failures.push(...await inspectDeepLinks(browser, baseOrigin));
    if (failures.length) throw new Error(failures.join("\n"));
    return { skipped: false, shells: SHELL_PATHS.length };
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolveClose => server.instance.close(resolveClose));
  }
}

async function inspectShell(browser, url) {
  const page = await browser.newPage();
  const failures = [];
  page.on("console", message => {
    if (message.type() === "error") failures.push(`${url}: ${message.text()}`);
  });
  page.on("pageerror", error => failures.push(`${url}: ${error.message}`));
  page.on("requestfailed", request => failures.push(`${url}: failed ${request.url()}`));
  page.on("response", response => {
    if (response.status() >= 400) failures.push(`${url}: ${response.status()} ${response.url()}`);
  });
  await page.goto(url, { waitUntil: "networkidle0" });
  const ready = await page.$eval("[data-shell-status]", element => element.textContent);
  if (!ready.endsWith("shell ready.")) failures.push(`${url}: shell did not report ready`);
  if (await page.$("[data-map-access]")) {
    await page.type("[data-map-access]", ["browser", "runtime", "value"].join("-"));
    await page.click("[data-save-access]");
    const storage = await page.evaluate(() => ({
      local: Object.keys(localStorage).length,
      session: Object.keys(sessionStorage).length,
    }));
    if (storage.local || storage.session) failures.push(`${url}: credential reached storage`);
  }
  await page.close();
  return failures;
}

async function inspectDeepLinks(browser, origin) {
  const page = await browser.newPage();
  const failures = [];
  for (const path of SHELL_PATHS) {
    const deepLink = `${origin}${path.slice(0, -1)}`;
    const response = await page.goto(deepLink, { waitUntil: "domcontentloaded" });
    const redirects = response.request().redirectChain().length;
    if (response.status() >= 400) failures.push(`${deepLink}: status ${response.status()}`);
    if (redirects > 1) failures.push(`${deepLink}: ${redirects} redirects`);
    if (!page.url().endsWith(path)) failures.push(`${deepLink}: ended at ${page.url()}`);
  }
  await page.close();
  return failures;
}

async function startStaticServer(root) {
  const instance = createServer(async (request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, "http://local").pathname);
    if (requestPath === "/favicon.ico") {
      response.writeHead(204).end();
      return;
    }
    const relativePath = requestPath.endsWith("/") ? `${requestPath}index.html` : requestPath;
    const path = resolve(root, `.${relativePath}`);
    if (!path.startsWith(resolve(root))) {
      response.writeHead(403).end();
      return;
    }
    try {
      const metadata = await stat(path);
      if (!metadata.isFile()) throw new Error("not a file");
      response.writeHead(200, { "Content-Type": contentTypeFor(path) });
      createReadStream(path).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise(resolveListen => instance.listen(0, "127.0.0.1", resolveListen));
  const { port } = instance.address();
  return { instance, origin: `http://127.0.0.1:${port}` };
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const target = process.argv[2] || "dist";
  const options = /^https?:\/\//.test(target)
    ? { origin: target.replace(/\/$/, "") }
    : { root: resolve(target) };
  const result = await runShellBrowserSmoke(options);
  if (result.skipped) console.log(`SKIP shell browser smoke: ${result.reason}`);
  else console.log(`Shell browser smoke passed (${result.shells} shells).`);
}
