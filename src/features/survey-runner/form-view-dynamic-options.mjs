// FEATURE:      Dynamic room Runner entry options
// SURFACE:      DYNAMIC_OPTION_NAMES, ensureDynamicOptionsMarkup(form)
// WHY TOGETHER: The dwell choice, proxy override, and extra devices form one injected fieldset.
// STATE:        None
// RULES:        Options stay hidden for planned routes and default to a 45-second dwell.
// PROVENANCE:   Dynamic room multi-device capture request

export const DYNAMIC_OPTION_NAMES = Object.freeze([
  "proxyBase",
  "dynamicDwellSeconds",
  "dynamicMarkSpacingM",
  "extraDevice1Label",
  "extraDevice1Ip",
  "extraDevice1Type",
  "extraDevice1Os",
  "extraDevice2Label",
  "extraDevice2Ip",
  "extraDevice2Type",
  "extraDevice2Os",
]);

export function ensureDynamicOptionsMarkup(form) {
  if (typeof form?.insertAdjacentHTML !== "function") return false;
  if (form.querySelector?.("[data-dynamic-options]")) return false;
  form.insertAdjacentHTML("beforeend", `
    <fieldset class="credential-group dynamic-options" data-dynamic-options hidden>
      <legend>Dynamic room capture</legend>
      <p id="dynamic-options-help">Dwell length applies to every dwell check-in on this run.
        Extra devices are polled alongside the device under test and download their own result files.
        Point the proxy override at a locally hosted positioning proxy to survey off the VPN.</p>
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
        <label>Positioning proxy base override (optional)
          <input name="proxyBase" autocomplete="off" autocapitalize="none" spellcheck="false"
            placeholder="/mm-positioning-proxy"></label>
        <label>Extra device 1 label (optional)
          <input name="extraDevice1Label" autocomplete="off" placeholder="iPhone B"></label>
        <label>Extra device 1 client IP
          <input name="extraDevice1Ip" inputmode="decimal" autocomplete="off"></label>
        <label>Extra device 1 type
          <select name="extraDevice1Type">
            <option value="mobile" selected>Mobile</option>
            <option value="laptop">Laptop</option>
            <option value="asset">Asset</option>
          </select></label>
        <label>Extra device 1 OS (optional, defaults to the label)
          <input name="extraDevice1Os" autocomplete="off" placeholder="iOS 18"></label>
        <label>Extra device 2 label (optional)
          <input name="extraDevice2Label" autocomplete="off" placeholder="iPhone C"></label>
        <label>Extra device 2 client IP
          <input name="extraDevice2Ip" inputmode="decimal" autocomplete="off"></label>
        <label>Extra device 2 type
          <select name="extraDevice2Type">
            <option value="mobile" selected>Mobile</option>
            <option value="laptop">Laptop</option>
            <option value="asset">Asset</option>
          </select></label>
        <label>Extra device 2 OS (optional, defaults to the label)
          <input name="extraDevice2Os" autocomplete="off" placeholder="Spectralink"></label>
      </div>
    </fieldset>`);
  return true;
}
