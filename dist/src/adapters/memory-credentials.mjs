const CREDENTIAL_FIELDS = Object.freeze([
  "mapAccess",
  "appId",
  "appKey",
]);

export function createMemoryCredentialStore() {
  const values = new Map();
  return Object.freeze({
    set(name, value) {
      assertField(name);
      const normalized = String(value || "").trim();
      if (normalized) values.set(name, normalized);
      else values.delete(name);
    },
    read(name) {
      assertField(name);
      return values.get(name) || null;
    },
    has(name) {
      assertField(name);
      return values.has(name);
    },
    clear(name) {
      if (name === undefined) values.clear();
      else {
        assertField(name);
        values.delete(name);
      }
    },
    missing(required = {}) {
      return CREDENTIAL_FIELDS.filter(name => required[name] && !values.has(name));
    },
  });
}

function assertField(name) {
  if (!CREDENTIAL_FIELDS.includes(name)) {
    throw new TypeError(`Unsupported in-memory credential field: ${name}`);
  }
}
