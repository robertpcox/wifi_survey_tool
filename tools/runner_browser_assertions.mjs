export async function setRunnerEntry(page, name) {
  const values = {
    mapAccess: "browser-map-value",
    appId: "browser-app-id",
    appKey: ["browser", "app", "key"].join("-"),
    clientIp: "192.0.2.8",
    deviceOs: `${name} OS 1`,
    deviceName: `${name} field device`,
  };
  for (const [field, value] of Object.entries(values)) {
    await page.type(`[name="${field}"]`, value);
  }
  await page.select('[name="deviceType"]', "mobile");
  await page.select('[name="band"]', "5");
  await page.click('[name="consent"]');
}

export function runnerDownloadFindings(download, checkpointCount) {
  const text = JSON.stringify(download.result);
  const findings = [];
  if (download.result.run.completionStatus !== "completed") {
    findings.push("not completed");
  }
  if (download.result.checkIns.length !== checkpointCount) {
    findings.push("check-ins missing");
  }
  if (!download.result.polls[0]?.raw) findings.push("raw poll missing");
  if (!download.result.polls[0]?.normalized) findings.push("normalized poll missing");
  if (!download.result.run.device?.name || download.result.run.band !== "5") {
    findings.push("device or band missing");
  }
  if (!download.mapAccessUsed) findings.push("private map access unused");
  if (download.storageEntries) findings.push("browser storage was written");
  for (const secret of ["browser-map-value", "browser-app-id", "browser-app-key"]) {
    if (text.includes(secret)) findings.push("credential reached result");
  }
  if (!download.filename.endsWith(".result.v3.json")) {
    findings.push("filename invalid");
  }
  return findings;
}
