// FEATURE:      Runner browser Clear-capture acceptance
// SURFACE:      cleared/fresh state readers and deterministic findings
// WHY TOGETHER: Discarded evidence, retained setup, reselection, and second-run purity form one gate.
// STATE:        Browser DOM, map-stub sources, and final exported result
// RULES:        Clear downloads nothing, requires fresh preflight, and leaks no first-run evidence.
// PROVENANCE:   Runner post-stop Clear-capture field acceptance

export function expectedRunnerSetup(profileName) {
  return {
    appId: "browser-app-id",
    appKey: ["browser", "app", "key"].join("-"),
    band: "5",
    clientIp: "192.0.2.8",
    deviceName: `${profileName} field device`,
    deviceOs: `${profileName} OS 1`,
    deviceType: "mobile",
    mapAccess: "browser-map-value",
  };
}

export async function readRunnerClearedState(page) {
  return page.evaluate(() => {
    const sourceCount = id => (
      window.__runnerMap?.getSource(id)?.data?.features?.length ?? null
    );
    const fields = {};
    for (const name of [
      "appId", "appKey", "band", "clientIp", "deviceName",
      "deviceOs", "deviceType", "mapAccess",
    ]) fields[name] = document.querySelector(`[name="${name}"]`)?.value ?? null;
    return {
      activeLeg: window.__runnerFilters?.["route-active-lyr"]?.at(-1),
      consent: Boolean(document.querySelector('[name="consent"]')?.checked),
      downloaded: Boolean(window.__runnerDownloadName || window.__runnerBlob),
      fields,
      finishHidden: Boolean(document.querySelector("[data-finish-panel]")?.hidden),
      markerRemovals: window.__runnerMarkerRemoveCount ?? 0,
      pollCount: Number(document.querySelector("[data-poll-count]")?.textContent),
      preflightHidden: Boolean(document.querySelector("[data-preflight-result]")?.hidden),
      runHidden: Boolean(document.querySelector("[data-run-panel]")?.hidden),
      sources: {
        route: sourceCount("route-lines"),
        stops: sourceCount("stop-pts"),
        trail: sourceCount("cloud-trail"),
        trailPoints: sourceCount("cloud-pts"),
        waypoints: sourceCount("wp-pts"),
      },
      survey: document.querySelector("[data-survey-select]")?.value ?? null,
    };
  });
}

export function runnerClearFindings(state, profileName, surveyId) {
  const findings = [];
  if (state.downloaded) findings.push("Clear capture created a download");
  if (!state.finishHidden || !state.runHidden || !state.preflightHidden) {
    findings.push("Clear capture left run or preflight UI visible");
  }
  if (state.pollCount !== 0) findings.push("Clear capture retained poll count");
  if (state.activeLeg !== -1 || state.markerRemovals < 1) {
    findings.push("Clear capture retained active map target evidence");
  }
  if (Object.values(state.sources).some(count => count !== 0)) {
    findings.push("Clear capture retained map route or capture features");
  }
  if (JSON.stringify(state.fields) !== JSON.stringify(expectedRunnerSetup(profileName))
      || !state.consent) {
    findings.push("Clear capture did not retain setup entries and consent");
  }
  if (![surveyId, ""].includes(state.survey)) {
    findings.push("Clear capture left an unexpected survey selection");
  }
  return findings;
}

export async function selectRunnerSurveyAgain(page, surveyId) {
  await page.select("[data-survey-select]", surveyId);
  await page.waitForFunction(id => (
    document.querySelector("[data-survey-select]").value === id
    && !document.querySelector('[data-action="preflight"]').disabled
  ), {}, surveyId);
  return page.evaluate(() => ({
    goDisabled: document.querySelector('[data-action="go"]').disabled,
    pollCount: Number(document.querySelector("[data-poll-count]").textContent),
    preflightDisabled: document.querySelector('[data-action="preflight"]').disabled,
    preflightHidden: document.querySelector("[data-preflight-result]").hidden,
    routeFeatures: window.__runnerMap?.getSource("route-lines")?.data?.features?.length ?? 0,
    survey: document.querySelector("[data-survey-select]").value,
  }));
}

export function runnerFreshSetupFindings(state, surveyId) {
  const findings = [];
  if (state.survey !== surveyId || state.preflightDisabled) {
    findings.push("survey could not be selected after Clear capture");
  }
  if (!state.goDisabled || !state.preflightHidden || state.pollCount !== 0) {
    findings.push("Clear capture did not require fresh preflight");
  }
  if (state.routeFeatures < 1) findings.push("selected survey route was not redrawn");
  return findings;
}

export function runnerSecondRunFindings(result) {
  const findings = [];
  const types = (result.events ?? []).map(event => event.type);
  if (types.filter(type => type === "run-started").length !== 1
      || types.filter(type => type === "run-completed").length !== 1
      || types.includes("run-aborted")) {
    findings.push("cleared first-run lifecycle leaked into final result");
  }
  if (!(result.polls ?? []).length || result.polls.some(poll => !poll.success)) {
    findings.push("cleared first-run polls leaked into final result");
  }
  if ((result.notes ?? []).length) findings.push("cleared first-run notes leaked into final result");
  return findings;
}
