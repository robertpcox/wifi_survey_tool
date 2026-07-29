import { timezoneOptionsMarkup } from "./timezones.mjs";

export function definitionCreatorTemplate() {
  return `
    <section class="definition-creator" aria-labelledby="creator-title">
      <div class="creator-heading">
        <div><p class="eyebrow">Creator</p>
          <h1 id="creator-title">Author a repeatable survey</h1></div>
        <p data-creator-status role="status">Enter the customer and campus, then Engage.</p>
      </div>
      <form class="creator-form" data-creator-form>
        <fieldset class="creator-launch-panel" data-launch-panel>
          <legend>Engage MazeMap</legend>
          <label>Customer ID <input data-field="customerId" required></label>
          <label>Customer name <input data-field="customerName" required></label>
          <label>Campus ID <input data-field="campusId" inputmode="numeric" required></label>
          <label>Campus name <input data-field="campusName" readonly
            placeholder="Loaded from MazeMap on Engage"></label>
          <label>MazeMap access token (private campuses only)
            <input data-engage-access type="password" autocomplete="off"></label>
          <button type="button" class="primary" data-action="engage-map">Engage</button>
        </fieldset>
        <p class="creator-campus-summary" data-campus-summary hidden></p>

        <div class="creator-layout">
          <aside class="creator-route" data-route-sidebar aria-label="Ordered route and review">
            <div data-gps-warning class="creator-warning" hidden></div>
            <div data-short-warning class="creator-warning" hidden>
              <span data-short-warning-text></span>
              <button type="button" data-action="dismiss-short-warning">Dismiss</button>
            </div>
            <fieldset data-plan-fields data-requires-engagement disabled>
              <legend>Checkpoint plan</legend>
              <label>Spacing metres <input data-field="spacingM" type="number" min="1" value="10"></label>
              <label>Default mid-leg dwell seconds
                <input data-field="midLegDwellSeconds" type="number" min="0" value="5"></label>
              <label>Default leg-end dwell seconds
                <input data-field="legEndDwellSeconds" type="number" min="0" value="30"></label>
              <button type="button" class="primary" data-action="lock-plan">Lock checkpoint plan</button>
            </fieldset>
            <h2>Ordered route</h2>
            <button type="button" data-action="clear-current-route"
              data-requires-engagement-action disabled>Clear current route</button>
            <div class="creator-coverage" aria-live="polite">
              <strong>Coverage from committed map points</strong>
              <span data-coverage-buildings>No mapped buildings yet.</span>
              <span data-coverage-floors>No mapped floors yet.</span>
            </div>
            <ol data-stop-list class="creator-stops"></ol>
            <div data-leg-list class="creator-legs"></div>
            <svg data-route-preview viewBox="0 0 600 360" role="img"
              aria-labelledby="creator-route-preview-title creator-route-preview-desc"></svg>
            <dl class="creator-metrics">
              <div><dt>Distance</dt><dd data-metric="distance">0 m</dd></div>
              <div><dt>Checkpoints</dt><dd data-metric="checkpoints">0</dd></div>
              <div><dt>Walking</dt><dd data-metric="walking">0 s</dd></div>
              <div><dt>Dwell</dt><dd data-metric="dwell">0 s</dd></div>
              <div><dt>Total estimate</dt><dd data-metric="total">0 s</dd></div>
            </dl>
            <div class="creator-actions">
              <button type="button" class="primary" data-action="export-definition"
                data-requires-engagement-action disabled>Validate and export</button>
              <button type="button" data-action="choose-import"
                data-requires-engagement-action disabled>Import definition</button>
              <input data-definition-file type="file" accept=".json,application/json" hidden>
            </div>
          </aside>

          <section class="creator-map-stage" data-map-stage aria-label="MazeMap route authoring">
            <span data-route-mode>Engage MazeMap to load the campus and routing.</span>
            <div class="creator-map-frame">
              <div id="map" data-floor-map aria-label="MazeMap floor map"></div>
              <section class="creator-map-choice" data-map-choice hidden
                aria-label="Choose the mapped stop position">
                <strong>Choose this route stop</strong>
                <span data-clicked-summary></span>
                <span data-poi-summary></span>
                <div class="creator-actions">
                  <button type="button" class="primary" data-action="add-exact">Use clicked point</button>
                  <button type="button" data-action="add-poi"
                    data-map-choice-poi-action>Use POI centre</button>
                  <button type="button" data-action="cancel-map-choice">Cancel</button>
                </div>
              </section>
            </div>
          </section>

          <div class="creator-authoring" data-authoring-panel>
            <fieldset data-requires-engagement disabled>
              <legend>Survey identity</legend>
              <p class="wide creator-help">A UUID is generated automatically when the definition is built.</p>
              <label>Survey name <input data-field="surveyName" required></label>
              <label>Timezone <select data-field="timezone" required>
                ${timezoneOptionsMarkup()}</select></label>
              <label>Route ID <input data-field="routeId" required></label>
            </fieldset>
            <fieldset data-requires-engagement disabled>
              <legend>Runner positioning provider</legend>
              <p class="wide creator-help">These settings tell Runner how to request live positions.
                They do not configure the authoring map or its routing.</p>
              <label>Provider <select data-field="positionSourceId" disabled>
                <option value="mazemap-cloud">MazeMap Cloud</option></select></label>
              <label>Config ID <input data-field="configId" required></label>
              <label>Poll interval ms <input data-field="pollIntervalMs"
                type="number" min="1" value="2000"></label>
              <label>Proxy base <input data-field="proxyBase"
                value="/mm-positioning-proxy" required></label>
              <label><input data-field="needsMapAccess" type="checkbox" disabled>
                Private map access</label>
              <label><input data-field="needsAppId" type="checkbox" checked disabled> Cloud App ID</label>
              <label><input data-field="needsAppKey" type="checkbox" checked disabled> Cloud App Key</label>
              <label><input data-field="needsClientIp" type="checkbox" checked disabled> Client IP</label>
            </fieldset>
            <fieldset data-requires-engagement disabled>
              <legend>Authorship</legend>
              <label>Author name <input data-field="authorName"></label>
              <label class="wide">Author notes <textarea data-field="authorNotes" rows="3"></textarea></label>
            </fieldset>
            <fieldset data-stop-fields hidden disabled>
              <legend>Stop details</legend>
              <label>Name <input data-field="stopName"></label>
              <label>Longitude <input data-field="stopLng" type="number" step="any" readonly></label>
              <label>Latitude <input data-field="stopLat" type="number" step="any" readonly></label>
              <label>Z-level <input data-field="stopZ" type="number" step="any" readonly></label>
              <label>Location <select data-field="locationType">
                <option value="room">Room / indoor point</option>
                <option value="outdoors">Outdoors</option></select></label>
              <label>POI ID <input data-field="poiId" readonly></label>
              <button type="button" data-action="adjust-stop" disabled>Adjust selected stop</button>
              <p class="wide creator-help">Optional current-device capture records browser geolocation
                separately from mapped points.</p>
              <label>Current-device stop name <input data-field="gpsName"></label>
              <label>Current-device z-level <input data-field="gpsZ" type="number" step="any"></label>
              <button type="button" data-action="capture-gps">Capture optional current-device position</button>
            </fieldset>
          </div>
        </div>
      </form>
    </section>
  `;
}
