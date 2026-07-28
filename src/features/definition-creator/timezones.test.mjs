import assert from "node:assert/strict";
import test from "node:test";

import {
  creatorTimezones,
  ensureTimezoneOption,
  timezoneOptionsMarkup,
} from "./timezones.mjs";

test("Creator timezones include runtime values and guaranteed choices", () => {
  const intlRef = {
    supportedValuesOf: () => ["Europe/London", "Pacific/Auckland"],
  };
  assert.deepEqual(creatorTimezones(intlRef), [
    "Australia/Melbourne",
    "Europe/London",
    "Pacific/Auckland",
    "UTC",
  ]);
  const markup = timezoneOptionsMarkup("Australia/Melbourne", intlRef);
  assert.match(markup, /value="Australia\/Melbourne" selected/);
  assert.match(markup, /value="Pacific\/Auckland"/);
  assert.match(markup, /value="UTC"/);
});

test("unknown imported timezones are preserved as select options", () => {
  const select = {
    append(option) {
      this.options.push(option);
    },
    options: [{ value: "Australia/Melbourne" }],
    tagName: "SELECT",
  };
  const documentRef = { createElement: () => ({}) };
  ensureTimezoneOption(select, "Custom/Imported", documentRef);
  ensureTimezoneOption(select, "Custom/Imported", documentRef);
  assert.deepEqual(select.options.map(option => option.value), [
    "Australia/Melbourne",
    "Custom/Imported",
  ]);
});
