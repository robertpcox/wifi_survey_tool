# Report Player fixtures

`result.fixture.v3.json` is a compact, hand-checked SurveyResultV3 shared by the
Step 5 analysis, playback, comparison, and independent view tests. It contains
three ordered check-ins, planned dwell, two named meta floors, repeated provider
fix times, raw timing evidence, an operator comment, and eight successful polls.

`route-turns.fixture.v3.json` is the focused domain fixture for cumulative route
distance. Its first leg turns through a right angle, and its second leg begins
with an exact same-coordinate floor transition.

`route-truth-analysis.golden.json` records the independently verified chord
baseline and reviewed cumulative-route result for the explicitly authorized
field file named inside the golden. Verify the test-readable golden with:

```sh
node --test src/domain/report-route-truth-golden.test.mjs
```

The values are synthetic documentation ranges and contain no credential or real
device identity. Tests load the file directly; production staging does not copy
this fixture family. The golden names but does not copy or stage the authorized
physical result.
