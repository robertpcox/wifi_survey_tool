// FEATURE:      Runner browser environment installation
// SURFACE:      installRunnerBrowserEnvironment(page, origin, definition)
// WHY TOGETHER: Page doubles and intercepted static/source responses form one browser boundary.
// STATE:        Per-page positioning request count
// RULES:        External requests stay blocked and test fixtures remain deterministic.
// PROVENANCE:   Runner browser acceptance

import {
  respondRunnerBrowserRequest,
  RUNNER_BROWSER_POSITION,
} from "./runner_browser_responses.mjs";
import { installBrowserDoubles } from "./runner_browser_map_doubles.mjs";

export { RUNNER_BROWSER_POSITION };

export async function installRunnerBrowserEnvironment(
  page,
  origin,
  definition,
) {
  const responseState = {};
  await page.evaluateOnNewDocument(installBrowserDoubles);
  await page.setRequestInterception(true);
  page.on("request", request => {
    void respondRunnerBrowserRequest(request, origin, definition, responseState);
  });
  return responseState;
}
