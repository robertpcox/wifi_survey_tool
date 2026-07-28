# Preserved v2 references

This family contains source and data preserved for behavior comparison during the v3
refactor. Do not serve these files as applications and do not copy their embedded
credentials or inline data into `src/`.

Representative sources:

- `route-survey-index.html` — original combined Creator, Runner, and session-playback page.
- `report_player/index.html` — original report.
- `report_player/ndh_player.html` — original session player.
- `report_player/analyze-survey.js` — original analyzer.

Safe JSON inspection:

```sh
jq 'keys' data/reference/report_player/route-survey-2026-07-27T08-10-20-847Z.json
jq '{samples:(.samples|length),events:(.events|length)}' \
  data/reference/report_player/route-survey-2026-07-27T08-10-20-847Z.json
```

Move-preservation SHA-256 values:

```text
946f619f2eb03525772f8795b8b3e60bf57710e9fd91f5ffcd4ecb1a8aab4d04  report_player/analyze-survey.js
1f43e19832e8a16d2eae13708c25fb2691ecbd26923f54eb576e23f2fdb16e9c  report_player/index.html
859eb7928b5983acc2eaa937cbe7d90bf4bfe3fa7cbd749db7086aa4ace04451  report_player/ndh_player.html
0fbcfa06e98ebf43c8b9f7ae259f2b6f5d7c6bd828cfc17db2864777d9405d63  route-survey-index.html
```
