import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareSurveyPage } from "./browser-stubs.mjs";
const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const defaultPuppeteer =
  "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core";
const defaultChrome =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export function browserPaths(env = process.env) {
  return {
    chrome: env.CHROME_PATH || defaultChrome,
    puppeteer: env.PUPPETEER_CORE_PATH || defaultPuppeteer,
  };
}
export async function withSurveyBrowser(testContext, run) {
  const dependencies = await loadBrowser();
  if (dependencies.reason) {
    testContext.skip(dependencies.reason);
    return;
  }
  let server;
  let browser;
  try {
    server = await startServer();
  } catch (error) {
    testContext.skip(`browser server unavailable: ${error.message}`);
    return;
  }
  try {
    browser = await dependencies.puppeteer.launch({
      executablePath: dependencies.chrome,
      headless: true,
      args: ["--no-sandbox", "--disable-gpu"],
    });
  } catch (error) {
    stopServer(server.process);
    testContext.skip(`Chrome unavailable: ${error.message}`);
    return;
  }
  const errors = [];
  const requests = [];
  try {
    const page = await browser.newPage();
    await prepareSurveyPage(page, server.origin, errors, requests);
    await run({
      page, requests,
      pageUrl: `${server.origin}/src/apps/route-survey/index.html`,
    });
    if (errors.length) {
      throw new Error(`Browser console errors: ${errors.join(" | ")}`);
    }
  } finally {
    await browser.close();
    stopServer(server.process);
  }
}
async function loadBrowser() {
  const paths = browserPaths();
  try {
    await access(paths.chrome, constants.X_OK);
  } catch {
    return { reason: `Chrome unavailable at ${paths.chrome}` };
  }
  try {
    return { chrome: paths.chrome, puppeteer: require(paths.puppeteer) };
  } catch (error) {
    return {
      reason: `puppeteer-core unavailable at ${paths.puppeteer}: `
        + error.message,
    };
  }
}
async function startServer() {
  const process = spawn(
    "python3",
    ["-u", "-m", "http.server", "0", "--bind", "127.0.0.1"],
    { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      stopServer(process);
      reject(new Error("python http.server did not start"));
    }, 3_000);
    const inspect = chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({ origin: `http://127.0.0.1:${match[1]}`, process });
    };
    process.stdout.on("data", inspect);
    process.stderr.on("data", inspect);
    process.once("error", error => {
      clearTimeout(timer); reject(error);
    });
    process.once("exit", code => {
      if (!output.match(/port (\d+)/)) {
        clearTimeout(timer); reject(
          new Error(`python http.server exited ${code}`),
        );
      }
    });
  });
}
function stopServer(process) {
  if (process && !process.killed) process.kill("SIGTERM");
}
