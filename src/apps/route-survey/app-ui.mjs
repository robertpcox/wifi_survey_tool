export function createAppUi(documentRef, windowRef) {
  function setStatus(type, text) {
    const status = documentRef.getElementById("statusText");
    status.textContent = text;
    status.style.color = type === "err" ? "#d92d20" : "#667085";
  }

  function showTab(name) {
    for (const tab of ["route", "log", "live", "play"]) {
      documentRef.getElementById(`tab-${tab}`)
        .classList.toggle("active", tab === name);
      documentRef.getElementById(`tabbtn-${tab}`)
        .classList.toggle("active", tab === name);
    }
  }

  function bindActions(...actionGroups) {
    for (const actions of actionGroups) Object.assign(windowRef, actions);
    windowRef.showTab = showTab;
  }

  function wireMapResize(mapAdapter) {
    documentRef.querySelector("details.config")
      .addEventListener("toggle", mapAdapter.resizeMapSoon);
    windowRef.addEventListener("resize", mapAdapter.resizeMapSoon);
  }

  return {
    bindActions,
    setStatus,
    showTab,
    wireMapResize,
  };
}
