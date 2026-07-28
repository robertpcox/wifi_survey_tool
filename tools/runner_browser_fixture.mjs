// FEATURE:      Runner browser fixture variants
// SURFACE:      multiFloorRunnerDefinition(definition)
// WHY TOGETHER: One deterministic transformation supplies the Runner browser's floor transition.
// STATE:        None; the input definition is cloned
// RULES:        Preserve survey identity while moving the latter route section to z-level 2.
// PROVENANCE:   Runner multi-floor field feedback

export function multiFloorRunnerDefinition(definition) {
  const fixture = structuredClone(definition);
  fixture.meta.zLevels = [1, 2];
  fixture.meta.zLevelNames["2"] = "Level 01";
  fixture.route.stops.at(-1).z = 2;
  const geometry = fixture.route.legs[0].geometry;
  for (let index = Math.floor(geometry.length / 2); index < geometry.length; index++) {
    geometry[index].z = 2;
  }
  for (let index = 1; index < fixture.route.checkpoints.length; index++) {
    fixture.route.checkpoints[index].z = 2;
  }
  return fixture;
}
