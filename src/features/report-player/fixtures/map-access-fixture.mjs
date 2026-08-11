// FEATURE:      Report Player map-access test fixture
// SURFACE:      fakeAccessRoot(), memoryCredentials(initialAccess)
// WHY TOGETHER: Access-control nodes and their in-memory store support one test boundary.
// STATE:        Synthetic DOM attributes, focus counts, and credential map
// RULES:        Model only behavior used by map-access binding tests.
// PROVENANCE:   Report Player unit tests

export function memoryCredentials(initialAccess = null) {
  const values = new Map();
  const credentials = {
    clear: key => values.delete(key),
    has: key => Boolean(values.get(key)),
    read: key => values.get(key),
    set: (key, value) => value ? values.set(key, value) : values.delete(key),
  };
  if (initialAccess) credentials.set("mapAccess", initialAccess);
  return credentials;
}

export function fakeAccessRoot() {
  const panel = { hidden: true };
  const input = listenerNode({ value: "" });
  const status = { textContent: "", innerHTML: "" };
  const saveButton = listenerNode();
  const clearButton = listenerNode();
  const toggleButton = listenerNode();
  const nodes = new Map([
    ["[data-map-access-panel]", panel], ["[data-map-access]", input],
    ["[data-map-access-status]", status], ["[data-save-access]", saveButton],
    ["[data-clear-access]", clearButton], ["[data-toggle-map-access]", toggleButton],
  ]);
  return {
    clearButton, input, panel, saveButton, status, toggleButton,
    root: { querySelector: key => nodes.get(key) },
  };
}

function listenerNode(values = {}) {
  return {
    attributes: {}, disabled: false, focused: 0, hidden: false, ...values,
    addEventListener(name, listener) { this[name] = listener; },
    focus() { this.focused += 1; },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}
