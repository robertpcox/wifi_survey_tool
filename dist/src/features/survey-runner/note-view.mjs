// FEATURE:      Runner incident-note interface
// SURFACE:      createRunnerNoteView(documentRef)
// WHY TOGETHER: Prompt, warning, text, held coordinates, map placement, and actions form one panel.
// STATE:        Current note ID and whether the next map click places its position
// RULES:        Add requires note text and finite held ground truth.
// PROVENANCE:   Runner offline field feedback

import { RUNNER_NOTES_ENABLED } from "./feature-flags.mjs";

export function createRunnerNoteView(documentRef) {
  const find = selector => documentRef.querySelector(selector);
  if (RUNNER_NOTES_ENABLED) ensureMarkup(find);
  let currentId = null;
  let placing = false;

  function render(note) {
    if (!RUNNER_NOTES_ENABLED) return;
    const panel = find("[data-note-panel]");
    if (!panel) return;
    panel.hidden = !note;
    if (!note) {
      currentId = null;
      placing = false;
      return;
    }
    if (currentId !== note.id) {
      currentId = note.id;
      placing = false;
      const input = find("[data-note-text]");
      if (input) input.value = "";
    }
    if (note.position) placing = false;
    panel.dataset.placing = String(placing);
    setText(find, "[data-note-reason]", reasonText(note));
    setText(find, "[data-note-position]", positionText(note.position));
    setText(
      find,
      "[data-note-placement-help]",
      placing ? "Tap the map to hold the note position there." : "",
    );
    updateAdd(find, note);
  }

  function bind(handlers) {
    if (!RUNNER_NOTES_ENABLED) return;
    find('[data-action="manual-note"]')?.addEventListener("click", handlers.manualNote);
    find('[data-action="add-note"]')?.addEventListener("click", handlers.addNote);
    find('[data-action="cancel-note"]')?.addEventListener("click", handlers.cancelNote);
    find('[data-action="place-note"]')?.addEventListener("click", () => {
      placing = true;
      const panel = find("[data-note-panel]");
      if (panel) panel.dataset.placing = "true";
      setText(find, "[data-note-placement-help]", "Tap the map to hold the note position there.");
    });
    find("[data-note-text]")?.addEventListener("input", () => {
      updateAdd(find, handlers.noteState?.());
    });
  }

  return Object.freeze({
    bind,
    noteText: () => RUNNER_NOTES_ENABLED
      ? find("[data-note-text]")?.value ?? ""
      : "",
    placementArmed: () => RUNNER_NOTES_ENABLED && placing,
    render,
  });
}

function ensureMarkup(find) {
  if (!find('[data-action="manual-note"]')) {
    find(".capture-actions")?.insertAdjacentHTML(
      "beforeend",
      '<button class="note-button" data-action="manual-note">Add note</button>',
    );
  }
  if (find("[data-note-panel]")) return;
  find("[data-run-panel]")?.insertAdjacentHTML("beforeend", `
    <section class="note-panel" data-note-panel role="dialog" aria-label="Add field note" hidden>
      <strong>Hold position and add a note</strong>
      <p class="note-warning">Stop walking before typing. Your position is held on the map.</p>
      <p data-note-reason></p>
      <label>What happened?<textarea data-note-text rows="3"></textarea></label>
      <p class="note-position" data-note-position></p>
      <p class="note-placement-help" data-note-placement-help aria-live="polite"></p>
      <div class="note-actions">
        <button type="button" data-action="place-note">Place on map</button>
        <button class="primary" type="button" data-action="add-note" disabled>Add</button>
        <button type="button" data-action="cancel-note">Cancel</button>
      </div>
    </section>`);
}

function updateAdd(find, note) {
  const button = find('[data-action="add-note"]');
  if (button) {
    button.disabled = !note?.position || !find("[data-note-text]")?.value.trim();
  }
}

function setText(find, selector, value) {
  const node = find(selector);
  if (node) node.textContent = value;
}

function reasonText(note) {
  return note.trigger === "source-failure"
    ? `Positioning connection failed${note.sourceError ? `: ${note.sourceError}` : "."}`
    : "Manual field note.";
}

function positionText(point) {
  return point
    ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)} · z ${point.z}`
    : "No held position. Use Place on map.";
}
