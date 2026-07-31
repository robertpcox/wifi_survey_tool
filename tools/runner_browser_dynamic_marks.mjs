// FEATURE:      Dynamic room browser mark-walk steps
// SURFACE:      exerciseDynamicMarkWalk, exerciseDefinitionUploadRerun, resolveRunnerRoute
// WHY TOGETHER: Dwell staging, planned-style check-ins, and re-run upload form one walk script.
// STATE:        Drives one prepared Runner page through the staged corridor
// RULES:        The staged leg resolves during dwell and every check-in uses the planned button.
// PROVENANCE:   Structured dynamic capture browser acceptance

export async function exerciseDynamicMarkWalk(page, definition) {
  const first = definition.route.stops[0];
  const second = { lng: first.lng, lat: first.lat + 0.0002 };
  await mapClick(page, first);
  await checkIn(page);
  await page.waitForSelector('[data-dynamic-room-panel][data-phase="dwelling"]');
  await mapClick(page, second);
  await resolveRunnerRoute(page, "staged corridor leg");
  await page.waitForFunction(() => (
    document.querySelector("[data-dynamic-room-panel]")?.dataset.phase === "dwelling"
    && (window.__runnerMap.sources.get("staged-leg")?.data?.features?.length ?? 0) > 0
  ));
  await page.click('[data-action="dynamic-continue-dwell"]');
  await checkInAt(page, "Mark 1 of 2");
  await checkInAt(page, "Mark 2 of 2");
  await page.waitForFunction(() => (
    document.querySelector("[data-run-progress]").textContent === "checkpoint 2"
  ));
  await checkIn(page);
  await page.waitForSelector('[data-dynamic-room-panel][data-phase="dwelling"]');
  await page.waitForFunction(() => (
    (window.__runnerMap.sources.get("staged-leg")?.data?.features?.length ?? 0) === 0
  ));
  await page.click('[data-action="dynamic-continue-dwell"]');
  await page.waitForSelector('[data-dynamic-room-panel][data-phase="walking"]');
}

export async function exerciseDefinitionUploadRerun(page, definition) {
  await page.evaluate(json => {
    const input = document.querySelector("[data-definition-upload]");
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(
      [json],
      "rerun.definition.v3.json",
      { type: "application/json" },
    ));
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, JSON.stringify(definition));
  await page.waitForFunction(() => document
    .querySelector("[data-runner-status]").textContent.includes("Loaded"));
  await page.click('[data-action="preflight"]');
  await page.waitForFunction(() => (
    document.querySelector("[data-preflight-light]").textContent === "GREEN"
  ));
}

export async function resolveRunnerRoute(page, label) {
  await page.waitForFunction(
    () => typeof window.__resolveRunnerRoute === "function",
    { timeout: 5000 },
  ).catch(error => {
    throw new Error(`No pending ${label} route request: ${error.message}`);
  });
  await page.evaluate(() => {
    const resolve = window.__resolveRunnerRoute;
    delete window.__resolveRunnerRoute;
    resolve();
  });
}

async function checkInAt(page, expectedTarget) {
  await page.waitForFunction(label => (
    document.querySelector("[data-current-target]").textContent === label
  ), {}, expectedTarget);
  await checkIn(page);
}

async function checkIn(page) {
  await page.waitForFunction(() => (
    !document.querySelector('[data-action="check-in"]').disabled
  ));
  await page.click('[data-action="check-in"]');
}

async function mapClick(page, point) {
  await page.evaluate(value => window.__runnerMapClick({
    lngLat: { lng: value.lng, lat: value.lat },
  }), point);
}
