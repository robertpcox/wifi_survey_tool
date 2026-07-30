// FEATURE:      Runner mobile checkpoint navigation acceptance
// SURFACE:      exerciseRunnerNavigation(page, definition), runnerNavigationFindings(trace)
// WHY TOGETHER: Double-tap, Back, Skip, and undo form one field correction journey.
// STATE:        Browser-observed checkpoint label, marker, and waypoint state snapshots
// RULES:        The temporary skip is undone so the exported acceptance result has full ground truth.
// PROVENANCE:   Android field safety and closed-area Runner feedback

export async function exerciseRunnerNavigation(page, definition) {
  const read = () => page.evaluate(() => {
    const rectangle = selector => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect && {
        bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top,
      };
    };
    return {
      back: rectangle('[data-action="back-checkpoint"]'),
      marker: window.__runnerMarker?.glyph,
      navigation: rectangle(".checkpoint-navigation"),
      progress: document.querySelector("[data-run-progress]")?.textContent,
      skip: rectangle('[data-action="skip-checkpoint"]'),
      states: window.__runnerMap?.sources.get("wp-pts")?.data?.features
        ?.map(feature => feature.properties.state),
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
  await page.waitForFunction(() => (
    !document.querySelector('[data-action="check-in"]').disabled
  ));
  await page.evaluate(() => {
    const action = document.querySelector('[data-action="check-in"]');
    action.click();
    action.click();
  });
  await page.waitForFunction(() => window.__runnerMarker?.glyph === "2");
  const doubleTap = await read();
  await page.click('[data-action="back-checkpoint"]');
  await page.waitForFunction(() => window.__runnerMarker?.glyph === "1");
  const backed = await read();
  await page.click('[data-action="skip-checkpoint"]');
  await page.waitForFunction(() => window.__runnerMarker?.glyph === "2");
  const skipped = await read();
  await page.click('[data-action="back-checkpoint"]');
  await page.waitForFunction(() => window.__runnerMarker?.glyph === "1");
  const restored = await read();
  return runnerNavigationFindings({
    backed,
    checkpointCount: definition.route.checkpoints.length,
    doubleTap,
    restored,
    skipped,
  });
}

export function runnerNavigationFindings(trace) {
  const findings = [];
  const label = index => `${index} of ${trace.checkpointCount}`;
  if (trace.doubleTap.progress !== label(2) || trace.doubleTap.marker !== "2") {
    findings.push("double-tap advanced more than one checkpoint");
  }
  if (!inside(trace.doubleTap.navigation, trace.doubleTap.viewport)
      || !inside(trace.doubleTap.back, trace.doubleTap.viewport)
      || !inside(trace.doubleTap.skip, trace.doubleTap.viewport)) {
    findings.push("checkpoint navigation leaves the mobile viewport");
  }
  if (trace.backed.progress !== label(1) || trace.backed.marker !== "1") {
    findings.push("Back did not reopen the reached checkpoint");
  }
  if (trace.skipped.progress !== label(2)
      || trace.skipped.states?.[0] !== "skipped") {
    findings.push("closed-area Skip did not advance with exception styling");
  }
  if (trace.restored.progress !== label(1)
      || trace.restored.states?.[0] !== "current") {
    findings.push("Back did not remove the temporary skip");
  }
  return findings;
}

function inside(rect, viewport) {
  return rect && rect.top >= -1 && rect.left >= -1
    && rect.bottom <= viewport.height + 1 && rect.right <= viewport.width + 1;
}
