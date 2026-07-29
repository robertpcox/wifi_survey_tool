# Report Player fixtures

`result.fixture.v3.json` is a compact, hand-checked SurveyResultV3 shared by the
Step 5 analysis, playback, comparison, and independent view tests. It contains
three ordered check-ins, planned dwell, two named meta floors, repeated provider
fix times, raw timing evidence, an operator comment, and eight successful polls.

`route-turns.fixture.v3.json` is the focused domain fixture for cumulative route
distance. Its first leg turns through a right angle, and its second leg begins
with an exact same-coordinate floor transition.

`route-truth-analysis.golden.json` is the retained reviewed receipt for the removed
private field input. It records the independently verified chord baseline and
cumulative-route result without requiring or republishing that result. Verify it with:

```sh
node --test src/domain/report-route-truth-golden.test.mjs
```

The values are synthetic documentation ranges and contain no credential or real
device identity. Tests load the receipt directly; production staging does not copy
this fixture family.
