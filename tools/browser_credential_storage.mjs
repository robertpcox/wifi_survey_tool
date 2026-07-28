// FEATURE:      Browser credential-storage inspection
// SURFACE:      inspectBrowserCredentialStorage(scope, secretNeedles)
// WHY TOGETHER: Web Storage and IndexedDB need one browser-executable credential check.
// STATE:        Read-only snapshot of the current page origin's browser storage
// RULES:        Provider telemetry may exist; named app credentials or supplied secret values may not.
// PROVENANCE:   Scope/test_standard.md secret scanning

export async function inspectBrowserCredentialStorage(
  scope = globalThis,
  secretNeedles = [],
) {
  const credentialName = /^(mapAccess|viewToken|access_token|authorization|appKey)$/i;
  const needles = secretNeedles.map(String).filter(Boolean);
  const findings = [];
  const errors = [];

  function storageEntries(storage) {
    if (!storage) return [];
    return Array.from({ length: storage.length }, (_, index) => {
      const key = storage.key(index);
      return [key, storage.getItem(key)];
    });
  }

  function inspect(value, location, seen = new WeakSet(), depth = 0) {
    if (depth > 8 || value == null) return false;
    if (typeof value === "string") {
      const secret = needles.find(needle => value.includes(needle));
      if (secret) {
        findings.push(`${location}: supplied secret value`);
        return true;
      }
      if (/^\s*[\[{]/.test(value)) {
        try {
          return inspect(JSON.parse(value), location, seen, depth + 1);
        } catch {}
      }
      return false;
    }
    if (typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    for (const [key, nested] of Object.entries(value)) {
      if (credentialName.test(key) && String(nested ?? "").trim()) {
        findings.push(`${location}: credential field ${key}`);
        return true;
      }
      if (inspect(nested, `${location}.${key}`, seen, depth + 1)) return true;
    }
    return false;
  }

  const local = storageEntries(scope.localStorage);
  const session = storageEntries(scope.sessionStorage);
  inspect(Object.fromEntries(local), "localStorage");
  inspect(Object.fromEntries(session), "sessionStorage");
  const databases = typeof scope.indexedDB?.databases === "function"
    ? await scope.indexedDB.databases()
    : [];
  for (const info of databases) {
    if (!info.name) continue;
    try {
      const database = await new Promise((resolve, reject) => {
        const request = scope.indexedDB.open(info.name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const storeName of database.objectStoreNames) {
        await new Promise((resolve, reject) => {
          const transaction = database.transaction(storeName, "readonly");
          const request = transaction.objectStore(storeName).openCursor();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return resolve();
            inspect(cursor.key, `indexedDB.${info.name}.${storeName}.key`);
            inspect(cursor.value, `indexedDB.${info.name}.${storeName}.value`);
            cursor.continue();
          };
        });
      }
      database.close();
    } catch (error) {
      errors.push(`${info.name}: ${error?.message ?? error}`);
    }
  }
  return {
    databaseNames: databases.map(item => item.name).filter(Boolean),
    errors,
    findings,
    local,
    session,
  };
}
