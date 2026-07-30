// FEATURE:      Dynamic room browser mark-walk steps
// SURFACE:      exerciseDynamicMarkWalk(page, definition), resolveRunnerRoute(page, label)
// WHY TOGETHER: Dwell staging, mark taps, and deferred route release form one walk script.
// STATE:        Drives one prepared Runner page through the staged corridor
// RULES:        The staged leg resolves during dwell and marks are tapped before arrival.
// PROVENANCE:   Structured dynamic capture browser acceptance

export async function exerciseDynamicMarkWalk(page, definition) {
  const first = definition.route.stops[0];
  const second = { lng: first.lng, lat: first.lat + 0.0002 };
  await mapClick(page, first);
  await page.waitForSelector('[data-action="dynamic-dwell"]:not([hidden])');
  await page.click('[data-action="dynamic-dwell"]');
  await page.waitForSelector('[data-dynamic-room-panel][data-phase="dwelling"]');
  await mapClick(page, second);
  await resolveRunnerRoute(page, "staged corridor leg");
  await page.waitForSelector(
    '[data-action="dynamic-pass-mark"]:not([hidden])',
    { timeout: 10_000 },
  );
  await passMark(page, "Passed mark 1 of 2");
  await passMark(page, "Passed mark 2 of 2");
  await page.waitForSelector('[data-action="dynamic-check-in"]:not([hidden])');
  await page.click('[data-action="dynamic-check-in"]');
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

async function passMark(page, expectedLabel) {
  await page.waitForFunction(label => document.querySelector(
    '[data-action="dynamic-pass-mark"]',
  ).textContent === label, {}, expectedLabel);
  await page.click('[data-action="dynamic-pass-mark"]');
}

async function mapClick(page, point) {
  await page.evaluate(value => window.__runnerMapClick({
    lngLat: { lng: value.lng, lat: value.lat },
  }), point);
}
