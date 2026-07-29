// FEATURE:      Creator post-Engage MazeMap access
// SURFACE:      showCreatorMapAccessPrompt(), takeCreatorMapAccess()
// WHY TOGETHER: Access prompt visibility and secret extraction operate on the same controls.
// STATE:        Creator launch-panel DOM
// RULES:        The password input is hidden initially and cleared whenever read.
// PROVENANCE:   Scope/steps/03_build_creator.md public-first access contract

export function showCreatorMapAccessPrompt(find, visible) {
  find("[data-engage-access-prompt]").hidden = !visible;
  find('[data-action="engage-map"]').textContent = visible
    ? "Retry Engage"
    : "Engage";
}

export function takeCreatorMapAccess(find) {
  const input = find("[data-engage-access]");
  const value = input.value.trim();
  input.value = "";
  return value;
}
