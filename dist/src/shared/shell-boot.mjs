export function mountAppShell({
  appName,
  credentials = null,
  documentRef = document,
}) {
  const status = documentRef.querySelector("[data-shell-status]");
  const input = documentRef.querySelector("[data-map-access]");
  const save = documentRef.querySelector("[data-save-access]");
  const clear = documentRef.querySelector("[data-clear-access]");
  const setStatus = message => {
    if (status) status.textContent = message;
  };
  setStatus(`${appName} shell ready.`);
  if (credentials && input && save) {
    save.addEventListener("click", () => {
      credentials.set("mapAccess", input.value);
      input.value = "";
      setStatus(credentials.has("mapAccess")
        ? "Private map access is held in memory for this tab."
        : "No private map access supplied; public map mode remains available.");
    });
  }
  if (credentials && clear) {
    clear.addEventListener("click", () => {
      credentials.clear("mapAccess");
      if (input) input.value = "";
      setStatus("Private map access cleared from memory.");
    });
  }
  return Object.freeze({ appName, credentials });
}
