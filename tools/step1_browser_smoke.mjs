import { createRequire } from "node:module";
import { prepareSmokePage } from "./step1_browser_support.mjs";

const require = createRequire(import.meta.url);
const puppeteerRoot = process.env.PUPPETEER_CORE_PATH
  || "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core";
const puppeteer = require(puppeteerRoot);
const pageUrl = process.argv[2]
  || "http://127.0.0.1:8123/src/apps/route-survey/index.html";
const chrome = process.env.CHROME_PATH
  || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
try {
  const page = await browser.newPage();
  const consoleErrors = await prepareSmokePage(page);
  await page.goto(pageUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.launchMap === "function");
  await page.type("#mapAccess", "browser-smoke-access");
  await page.click("button[onclick='launchMap()']");
  await page.waitForFunction(() =>
    document.getElementById("statusText")?.textContent.includes("Select a test route"));

  await page.select("#savedRoutes", "server:0");
  await page.click("#loadRouteBtn");
  await page.waitForFunction(() =>
    document.getElementById("routeInfo")?.textContent.includes("49 legs"));
  const spacingCounts = {};
  for (const spacing of ["0", "5", "10", "15", "20", "30"]) {
    await page.select("#wpSpacing", spacing);
    await page.click("button[onclick='buildRoute()']");
    await page.waitForFunction(() =>
      document.getElementById("statusText")?.textContent.startsWith("Route built:"));
    spacingCounts[spacing] = await page.$eval("#routeInfo", element => element.textContent);
  }

  await page.click("button[onclick='clearStops()']");
  for (const value of [
    "-45.872400,170.508400,1",
    "-45.872500,170.508500,1",
    "-45.872600,170.508600,1",
  ]) {
    await page.type("#addPoiId", value);
    await page.click("button[onclick='addStopFromInput()']");
  }
  await page.select("#wpSpacing", "0");
  await page.type("#routeName", "Smoke Route");
  await page.click("button[onclick='moveStop(2,-1)']");
  await page.click("button[onclick='buildRoute()']");
  await page.waitForFunction(() =>
    document.getElementById("routeInfo")?.textContent.includes("2 legs"));
  await page.click("button[onclick='exportRoute()']");
  await page.waitForFunction(() => window.__step1Downloads[0]?.content);

  await page.$eval("#srcCloud", element => { element.checked = true; });
  await page.$eval("#srcLipi", element => { element.checked = false; });
  await page.$eval("#appId", element => { element.value = "browser-smoke-id"; });
  await page.$eval("#appKey", element => { element.value = "browser-smoke-key"; });
  await page.$eval("#clientIp", element => { element.value = "192.0.2.1"; });
  await page.select("#pollInterval", "10000");
  await page.click("#walkBtn");
  await page.waitForFunction(() =>
    Number(document.getElementById("cntCloud")?.textContent) >= 1);
  await page.click("button[onclick='endWalk()']");
  await page.click("button[onclick='clearSession()']");
  await page.click("#walkBtn");
  await page.waitForFunction(() =>
    Number(document.getElementById("cntCloud")?.textContent) >= 1);
  for (let click = 0; click < 4; click++) await page.click("#walkBtn");
  await page.click("button[onclick='stopPolling()']");
  await page.click("button[onclick='exportSessionJson()']");
  await page.waitForFunction(() => window.__step1Downloads[1]?.content);

  const result = await page.evaluate(() => ({
    creatorExport: JSON.parse(window.__step1Downloads[0].content),
    runnerExport: JSON.parse(window.__step1Downloads[1].content),
    spacingCounts: window.__spacingCounts,
    status: document.getElementById("statusText").textContent,
  }));
  result.spacingCounts = spacingCounts;
  if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(" | ")}`);
  console.log(JSON.stringify({
    creator: {
      filename: "route-Smoke-Route.json",
      stops: result.creatorExport.stops.length,
      version: result.creatorExport.version,
    },
    runner: {
      completion: result.status,
      events: result.runnerExport.events.map(event => event.type),
      samples: result.runnerExport.samples.length,
      version: result.runnerExport.version,
      waypoints: result.runnerExport.waypoints.length,
    },
    spacingCounts: result.spacingCounts,
  }, null, 2));
} finally {
  await browser.close();
}
