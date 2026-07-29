// FEATURE:      Creator post-Engage MazeMap access
// SURFACE:      createCreatorMapAccess({ credentials, view })
// WHY TOGETHER: Public-first launch and typed-denial retry share one memory-only boundary.
// STATE:        Whether MazeMap has proved that the selected campus needs access
// RULES:        Never read or submit access before a typed public-launch denial.
// PROVENANCE:   Scope/steps/03_build_creator.md public-first access contract

export function createCreatorMapAccess({ credentials, view }) {
  let requested = false;

  function take() {
    if (!requested) return null;
    const entered = clean(view.takeMapAccess?.());
    const access = entered || clean(credentials?.read?.("mapAccess"));
    if (!access) {
      throw new TypeError(
        "MazeMap access token: enter a token, then retry Engage.",
      );
    }
    credentials?.set?.("mapAccess", access);
    return access;
  }

  function rethrow(error, access) {
    if (!access && error?.promptForAccess) {
      requested = true;
      view.showMapAccessPrompt?.(true);
      throw new Error(
        "This campus requires MazeMap access. Enter the token, then retry Engage.",
        { cause: error },
      );
    }
    throw error;
  }

  return { rethrow, take };
}

function clean(value) {
  return String(value ?? "").trim();
}
