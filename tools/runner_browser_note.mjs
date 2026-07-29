// FEATURE:      Runner browser incident-note path
// SURFACE:      exercisePromptedRunnerNote(page), runnerNoteFindings(result, expectedCount)
// WHY TOGETHER: First-failure prompt, placement, resume, and route-anchor export form one gate.
// STATE:        Active Runner page
// RULES:        Note IDs stay distinct; typed anchors resolve only inside the embedded route.
// PROVENANCE:   Runner offline field feedback

export async function exercisePromptedRunnerNote(page) {
  await page.waitForSelector("[data-note-panel]:not([hidden])");
  const warning = await page.$eval(".note-warning", node => node.textContent);
  if (!warning.includes("Stop walking")) throw new Error("note safety warning is missing");
  await page.type("[data-note-text]", "Wi-Fi disconnected during walk");
  await page.click('[data-action="place-note"]');
  await page.evaluate(() => window.__runnerMapClick?.({
    lngLat: { lng: 170.50851, lat: -45.87247 },
  }));
  await page.waitForFunction(() => document
    .querySelector("[data-note-position]").textContent.includes("170.508510"));
  await page.click('[data-action="add-note"]');
  await page.waitForSelector("[data-note-panel][hidden]");
  await page.waitForFunction(() => document
    .querySelector("[data-poll-indicator]").dataset.state === "ok");
}

export function runnerNoteFindings(result, expectedCount) {
  const findings = [];
  const checkpoints = new Set((result.route?.checkpoints ?? []).map(item => item.id));
  const legs = new Set((result.route?.legs ?? []).map(item => item.id));
  if ((result.notes ?? []).length !== expectedCount) findings.push("notes missing");
  for (const note of result.notes ?? []) {
    const anchor = note.routeAnchor;
    if (Object.hasOwn(note, "checkpointId")) findings.push("note pseudo-checkpoint ID present");
    if (anchor?.type !== "checkpoint-interval") findings.push("note anchor type missing");
    if (anchor?.routeHash !== result.route?.hash
      || anchor?.routeHash !== result.run?.routeHash) {
      findings.push("note route hash mismatch");
    }
    for (const key of ["fromCheckpointId", "toCheckpointId"]) {
      if (anchor?.[key] !== null && !checkpoints.has(anchor?.[key])) {
        findings.push("note anchor checkpoint missing");
      }
      if (anchor?.[key] === note.id) findings.push("note ID reused as checkpoint");
    }
    if (anchor?.legId !== null && !legs.has(anchor?.legId)) {
      findings.push("note anchor leg missing");
    }
    const event = result.events.find(item => item.noteId === note.id);
    if (!event) findings.push("note event link missing");
    else {
      if (Object.hasOwn(event, "checkpointId")) {
        findings.push("note event pseudo-checkpoint ID present");
      }
      if (!sameAnchor(event.routeAnchor, anchor)) {
        findings.push("note event anchor mismatch");
      }
    }
  }
  return findings;
}

function sameAnchor(left, right) {
  return ["type", "routeHash", "fromCheckpointId", "toCheckpointId", "legId"]
    .every(key => left?.[key] === right?.[key]);
}
