# Original route-survey smoke

Serve the repository root with `python3 -m http.server 8123 --bind 127.0.0.1`, then run:

```sh
PUPPETEER_CORE_PATH=/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core \
  node tools/step1_browser_smoke.mjs
```

The deterministic browser driver stubs MazeMap and Cloud responses; it performs no provider
network calls. It proves the following original-page flow:

1. Load the saved L00 server route and rebuild it at turns-only, 5, 10, 15, 20, and 30 metres.
2. Clear it, add three exact-coordinate stops, reorder one stop, and build the two legs.
3. Export the edited route and parse the downloaded v2 JSON.
4. Start Cloud polling, receive a stubbed fix, start a walk, and end it early.
5. Clear the session without clearing the route, restart, complete every checkpoint, stop
   polling, export the session, and parse the downloaded v2 JSON.

The driver fails on any browser console error. Its summary contains counts and event names,
never credentials or raw provider values.
