# Preserved v2 references

This family contains source and data preserved for behavior comparison during the v3
refactor. Do not serve these files as applications and do not copy their embedded
credentials or inline data into `src/`.

Representative sources:

- `route-survey-index.html` — original combined Creator, Runner, and session-playback page.
- `report_player/index.html` — original report.
- `report_player/ndh_player.html` — original session player.
- `report_player/analyze-survey.js` — original analyzer.

Step 5 migrated the report's exact inline `DATA` object to
`report_player/report_data.inline.json`; the preserved report now fetches that file.
It also removed the player's embedded `MAP_TOKEN` and prompts for an in-memory value.
These references remain v1/v2 characterization sources and are not production inputs.

Safe JSON inspection:

```sh
jq 'keys' data/reference/report_player/route-survey-2026-07-27T08-10-20-847Z.json
jq '{samples:(.samples|length),events:(.events|length)}' \
  data/reference/report_player/route-survey-2026-07-27T08-10-20-847Z.json
```

Move-preservation SHA-256 values:

```text
946f619f2eb03525772f8795b8b3e60bf57710e9fd91f5ffcd4ecb1a8aab4d04  report_player/analyze-survey.js
0a1a6a5fc6ce0695797264fc806cb7f09a9bfd0949cc171682043fd105a989b8  report_player/index.html
0b2912061718fbf2a2431c5d51e185fc9e5661cd4689278bb3b59588c6029f52  report_player/ndh_player.html
7b625e95b3e908d1a49b7b735eb57ba3662788854430d0ed59425ffb48fe2add  report_player/report_data.inline.json
0fbcfa06e98ebf43c8b9f7ae259f2b6f5d7c6bd828cfc17db2864777d9405d63  route-survey-index.html
```
