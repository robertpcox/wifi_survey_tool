// FEATURE:      Report Player browser acceptance
// SURFACE:      exercisePublicReportPlayer(options)
// WHY TOGETHER: Dashboard launch, public map, responsive Player, seek, and clean exit form one path.
// STATE:        One Chrome page and counted result requests
// RULES:        Assert one result/map instance, exact fit, no body scroll, and no hidden Player writes.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import { installReportPlayerMazeMapStub } from "./report_player_browser_stub.mjs";
import {
  exercisePlayerFollow,
  inspectPlayerLayout,
} from "./report_player_browser_player.mjs";

export async function exercisePublicReportPlayer({
  browser,
  completedCount,
  customerId,
  expectedFloors,
  fixture,
  origin,
  path,
}) {
  const page = await browser.newPage();
  const failures = [];
  let resultRequests = 0;
  page.on("pageerror", error => failures.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("response", response => {
    if (new URL(response.url()).pathname.includes("/results/")) resultRequests += 1;
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  await installReportPlayerMazeMapStub(page, origin, "public", fixture);
  await page.goto(
    `${origin}${path}?customer_id=${encodeURIComponent(customerId)}`,
    { waitUntil: "networkidle0" },
  );
  await page.waitForSelector(".dashboard-launch");
  const dashboard = await page.evaluate(() => ({
    launches: document.querySelectorAll(".dashboard-launch").length,
    text: document.body.textContent,
  }));
  if (dashboard.launches !== completedCount) failures.push("completed dashboard count differs");
  if (!dashboard.text.includes(fixture.meta.customerName)) failures.push("customer name missing");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click(".dashboard-launch"),
  ]);
  await page.waitForFunction(() => (
    document.querySelector("[data-map-runtime-status]")?.textContent.includes("Public MazeMap")
  ));
  const reportUrl = page.url();
  await changeThreshold(page);
  await page.evaluate(() => scrollTo(0, 420));
  const programmatic = await page.evaluate(async () => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    const atMs = Date.parse(
      session.result.checkIns[0]?.at ?? session.result.run.startedAt,
    );
    session.player.setMode("playback", { atMs });
    return { atMs: session.player.atMs, expected: atMs };
  });
  if (programmatic.atMs !== programmatic.expected) failures.push("programmatic seek differs");
  await page.waitForSelector("body.player-active");
  await delay(50);
  failures.push(...await exercisePlayerFollow(page));
  const desktop = await inspectPlayerLayout(page, expectedFloors);
  failures.push(...desktop.failures);
  await page.setViewport({ width: 390, height: 844 });
  await delay(100);
  const narrow = await inspectPlayerLayout(page, expectedFloors);
  failures.push(...narrow.failures.map(value => `narrow: ${value}`));
  const beforeLeave = await page.evaluate(() => {
    const sources = [...window.__reportMapState.map.sources.values()];
    return { atMs: null, writes: sources.reduce((sum, source) => sum + source.updates, 0) };
  });
  await page.evaluate(async () => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    window.__playerAtLeave = session.player.atMs;
    session.player.setMode("analysis");
  });
  await delay(250);
  const afterLeave = await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return {
      active: document.body.classList.contains("player-active"),
      atMs: window.__playerAtLeave,
      bodyScrollable: document.documentElement.scrollHeight > innerHeight,
      instances: window.__reportMapState.instances,
      storage: localStorage.length + sessionStorage.length + databases.length,
      writes: [...window.__reportMapState.map.sources.values()]
        .reduce((sum, source) => sum + source.updates, 0),
    };
  });
  if (afterLeave.active) failures.push("Player body mode remained active");
  if (!afterLeave.bodyScrollable) failures.push("Report scrolling was not restored");
  if (afterLeave.instances !== 1) failures.push(`map constructed ${afterLeave.instances} times`);
  if (afterLeave.storage) failures.push("browser storage was written");
  if (afterLeave.writes !== beforeLeave.writes + 1
      && afterLeave.writes !== beforeLeave.writes + 2) {
    failures.push("hidden Player or unexpected source writes continued");
  }
  if (resultRequests !== 1) failures.push(`result loaded ${resultRequests} times`);
  await page.close();
  return { failures, reportUrl, resultRequests };
}

async function changeThreshold(page) {
  const before = await page.$$eval(".kpi-card", cards => cards
    .find(item => item.querySelector("span")?.textContent === "Sticky while moving")?.textContent);
  await page.$eval('[data-threshold="stickySeconds"]', input => {
    input.value = "0";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForFunction(previous => {
    const card = [...document.querySelectorAll(".kpi-card")]
      .find(item => item.querySelector("span")?.textContent === "Sticky while moving");
    return card?.textContent !== previous;
  }, {}, before);
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
