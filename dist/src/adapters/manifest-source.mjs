// FEATURE:      Generated manifest and result discovery
// SURFACE:      createManifestSource(options)
// WHY TOGETHER: URL resolution and JSON transport form one static-data adapter boundary.
// STATE:        Fetch implementation and deployment origin
// RULES:        Resolve only repository result paths and never scan folders at runtime.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

export function createManifestSource({
  fetchRef = globalThis.fetch,
  origin = new URL("../../", import.meta.url),
} = {}) {
  async function read(path) {
    const response = await fetchRef(new URL(path.replace(/^\/+/, ""), origin));
    if (!response.ok) throw new Error(`Unable to load ${path} (${response.status})`);
    return response.json();
  }

  return Object.freeze({
    customer(customerId) {
      const id = encodeURIComponent(String(customerId ?? "").trim());
      if (!id) return Promise.reject(new Error("Customer identity is required in the URL"));
      return read(`/data/manifests/customers/${id}.manifest.v3.json`);
    },
    results() {
      return read("/data/manifests/result-manifest.v3.json");
    },
    result(path) {
      const normalized = String(path ?? "").replace(/^\/+/, "");
      const parts = normalized.split("/");
      const safeParts = parts.length >= 2
        && parts[0] === "results"
        && parts.every(part => part && part !== "." && part !== ".."
          && !/[?#\\]/.test(part));
      if (!safeParts || !parts.at(-1).endsWith(".result.v3.json")) {
        return Promise.reject(new Error("Result path must name a generated v3 result"));
      }
      return read(`/${normalized}`);
    },
  });
}
