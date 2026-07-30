// FEATURE:      Creator post-Engage MazeMap access
// SURFACE:      createCreatorMapAccess({ credentials, view })
// WHY TOGETHER: Optional public/private Engage choice shares one memory-only boundary.
// STATE:        None
// RULES:        Blank access launches public; entered access launches private.
// PROVENANCE:   Scope/steps/03_build_creator.md public-first access contract

export function createCreatorMapAccess({ credentials, view }) {
  function take() {
    const entered = clean(view.takeMapAccess?.());
    if (entered) credentials?.set?.("mapAccess", entered);
    return entered || null;
  }

  function rethrow(error, access) {
    if (!access && error?.promptForAccess) {
      throw new Error(
        "This campus requires MazeMap access. Enter the optional token, then Engage again.",
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
