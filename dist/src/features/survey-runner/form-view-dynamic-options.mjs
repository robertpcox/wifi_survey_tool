// FEATURE:      Dynamic room Runner entry options
// SURFACE:      DYNAMIC_OPTION_NAMES, ensureDynamicOptionsMarkup(form)
// WHY TOGETHER: Site identity, dwell choice, and mark spacing form one injected fieldset.
// STATE:        None
// RULES:        Hidden for planned routes; sits above credentials; only the device under test is polled.
// PROVENANCE:   Dynamic room capture request; Runner customer/campus entry request

import { RUNNER_SITE_FIELDS } from "./runner-site.mjs";

export const DYNAMIC_OPTION_NAMES = Object.freeze([
  ...RUNNER_SITE_FIELDS,
  "dynamicDwellSeconds",
  "dynamicMarkSpacingM",
]);

const MARKUP = `
    <fieldset class="credential-group dynamic-options" data-dynamic-options hidden>
      <legend>Site and capture options</legend>
      <p id="dynamic-site-help">Customer and campus default to the site template.
        Change them to run a dynamic room survey at another MazeMap customer or campus.
        The positioning config ID must belong to that customer.</p>
      <div class="entry-grid">
        <label>Customer ID
          <input name="siteCustomerId" inputmode="numeric" autocomplete="off"
            spellcheck="false" aria-describedby="dynamic-site-help"></label>
        <label>Campus ID
          <input name="siteCampusId" inputmode="numeric" autocomplete="off"
            spellcheck="false" aria-describedby="dynamic-site-help"></label>
        <label>Positioning config ID
          <input name="siteConfigId" inputmode="numeric" autocomplete="off"
            spellcheck="false" aria-describedby="dynamic-site-help"></label>
      </div>
      <p id="dynamic-options-help">Dwell length applies to every dwell check-in on this run.</p>
      <div class="entry-grid">
        <label>Dwell duration at each checkpoint
          <select name="dynamicDwellSeconds" aria-describedby="dynamic-options-help">
            <option value="5">5 seconds</option>
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="45" selected>45 seconds</option>
          </select></label>
        <label>Mark spacing between checkpoints
          <select name="dynamicMarkSpacingM">
            <option value="0">No marks</option>
            <option value="5" selected>Every 5 m</option>
            <option value="10">Every 10 m</option>
            <option value="15">Every 15 m</option>
          </select></label>
      </div>
    </fieldset>`;

export function ensureDynamicOptionsMarkup(form) {
  if (typeof form?.insertAdjacentHTML !== "function") return false;
  if (form.querySelector?.("[data-dynamic-options]")) return false;
  const credentials = form.querySelector?.(".credential-groups");
  if (typeof credentials?.insertAdjacentHTML === "function") {
    credentials.insertAdjacentHTML("beforebegin", MARKUP);
  } else {
    form.insertAdjacentHTML("beforeend", MARKUP);
  }
  return true;
}
