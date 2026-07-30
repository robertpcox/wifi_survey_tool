// FEATURE:      Runner two-run mobile browser profile
// SURFACE:      exerciseRunnerBrowserProfile(options)
// WHY TOGETHER: 3D, aborted Clear, fresh preflight, completion, and export form one user journey.
// STATE:        One isolated browser page and its synthetic map/source doubles
// RULES:        The final export contains only evidence recorded after Clear capture.
// PROVENANCE:   Runner urgent field acceptance

import { bearingTo } from "../src/adapters/map/camera-bearing.mjs";
import {
  openRunnerShareLink, readRunnerActiveView, runnerActiveViewFindings,
  runnerDownloadFindings, startRunnerCapture,
} from "./runner_browser_assertions.mjs";
import {
  readRunnerClearedState, runnerClearFindings, runnerFreshSetupFindings,
  runnerSecondRunFindings, selectRunnerSurveyAgain,
} from "./runner_browser_clear.mjs";
import {
  exerciseRunner3dToggle, readRunner3dState, runner3dFindings,
  runner3dRelaunchFindings,
} from "./runner_browser_3d.mjs";
import {
  installRunnerBrowserEnvironment, RUNNER_BROWSER_POSITION,
} from "./runner_browser_environment.mjs";
import {
  readRunnerMapStack, runnerMapStackFindings,
} from "./runner_browser_map_stack.mjs";
import {
  completeRunnerCheckpoints, downloadResetFindings, finishAndDownloadRunner,
  preflightAndStartRunner, stoppedPollingFindings,
} from "./runner_browser_lifecycle.mjs";
import { runnerNoteFindings } from "./runner_browser_note.mjs";

export async function exerciseRunnerBrowserProfile({
  browser, definition, origin, path, profile,
}) {
  const page = await browser.newPage();
  const failures = [];
  const requestState = await configurePage(
    page,
    profile,
    failures,
    origin,
    definition,
  );
  const surveyId = definition.meta.surveyId;
  await openRunnerShareLink(
    page,
    `${origin}${path}?survey_id=${encodeURIComponent(surveyId)}`,
  );
  await startRunnerCapture(page, profile.name);
  failures.push(...runnerMapStackFindings(await readRunnerMapStack(page)));
  const first = definition.route.checkpoints[0];
  const floor = definition.meta.zLevelNames[String(first.z)];
  const states3d = await exerciseRunner3dToggle(page);
  failures.push(...runner3dFindings(states3d));
  await page.waitForFunction(() => (
    document.querySelector("[data-poll-indicator]")?.dataset.state === "ok"
    && Number(document.querySelector("[data-poll-count]")?.textContent) > 1
  ));
  failures.push(...runnerActiveViewFindings(
    await readRunnerActiveView(page),
    floor,
    bearingTo(RUNNER_BROWSER_POSITION, first),
  ));
  await stopAndClear(page, profile, definition, failures, requestState);
  const fresh = await selectRunnerSurveyAgain(page, surveyId);
  failures.push(...runnerFreshSetupFindings(fresh, surveyId));
  failures.push(...await stoppedPollingFindings(page, requestState));
  failures.push(...await preflightAndStartRunner(page, requestState));
  const relaunched3d = await readRunner3dState(page);
  failures.push(...runner3dRelaunchFindings(relaunched3d));
  failures.push(...runnerMapStackFindings(await readRunnerMapStack(page), 2));
  failures.push(...await completeRunnerCheckpoints(
    page,
    definition,
    relaunched3d,
  ));
  const download = await finishAndDownloadRunner(page, profile.name);
  failures.push(...runnerDownloadFindings(download, definition.route.checkpoints.length));
  failures.push(...runnerNoteFindings(download.result, 0));
  failures.push(...runnerSecondRunFindings(download.result));
  failures.push(...await downloadResetFindings(page, profile.name));
  await page.close();
  if (failures.length) throw new Error(`${profile.name}: ${failures.join("\n")}`);
  return {
    filename: download.filename,
    freshPreflightTrace: requestState.freshPreflightTrace,
    profile: profile.name,
  };
}

async function configurePage(page, profile, failures, origin, definition) {
  await page.setViewport({
    width: profile.width, height: profile.height, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
  });
  const requestState = await installRunnerBrowserEnvironment(page, origin, definition);
  page.on("console", message => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("pageerror", error => failures.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  return requestState;
}

async function stopAndClear(
  page,
  profile,
  definition,
  failures,
  requestState,
) {
  await page.waitForFunction(() => Number(
    document.querySelector("[data-poll-count]").textContent,
  ) > 1);
  await page.click('[data-action="stop"]');
  await page.waitForSelector("[data-finish-panel]:not([hidden])");
  failures.push(...await stoppedPollingFindings(page, requestState));
  await page.click('[data-action="clear-capture"]');
  await page.waitForFunction(() => document.querySelector("[data-finish-panel]").hidden);
  failures.push(...await stoppedPollingFindings(page, requestState));
  failures.push(...runnerClearFindings(
    await readRunnerClearedState(page),
    profile.name,
    definition.meta.surveyId,
  ));
}
