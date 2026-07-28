import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSession,
  buildSessionCsv,
} from "./session.mjs";

const replayFixture = new URL(
  "../../../data/characterization/step1/fixtures/session-replay.json",
  import.meta.url,
);
const sessionGolden = new URL(
  "../../../data/characterization/step1/golden/session-export.json",
  import.meta.url,
);

test("buildSession is byte-identical to the recorded session golden", async () => {
  const [fixtureText, expected] = await Promise.all([
    readFile(replayFixture, "utf8"),
    readFile(sessionGolden, "utf8"),
  ]);
  const replay = JSON.parse(fixtureText);
  const actual = buildSession({
    routeState: {
      stops: replay.stops,
      legs: replay.legs,
      waypoints: replay.waypoints,
    },
    sessionState: {
      meta: replay.sessionMeta,
      samples: replay.samples,
      events: replay.events,
    },
    config: replay.fields,
    nowDate: () => new Date("2026-07-28T00:00:00.000Z"),
  });
  assert.equal(`${JSON.stringify(actual, null, 2)}\n`, expected);
});

test("buildSessionCsv preserves ordering, zero values, errors, and quoting", () => {
  const csv = buildSessionCsv({
    samples: [
      {
        source: "cloud",
        tSentMs: 300,
        isoSent: "1970-01-01T00:00:00.300Z",
        tRecvMs: 320,
        isoRecv: "1970-01-01T00:00:00.320Z",
        rttMs: 20,
        http: 200,
        data: {
          lastSeen: 0,
          latitude: 0,
          longitude: 170.5,
          zLevel: 0,
          confidenceFactor: 0,
          locationName: 'Lab, "North"',
        },
      },
      {
        source: "lipi",
        tSentMs: 100,
        isoSent: "1970-01-01T00:00:00.100Z",
        error: 'failed, "offline"',
      },
    ],
    events: [
      {
        type: "checkin",
        tMs: 200,
        iso: "1970-01-01T00:00:00.200Z",
        wpSeq: 0,
        wpKind: "stop",
        wpName: 'A, "Lobby"',
        legIdx: 0,
        lat: -45.8,
        lng: 170.5,
        z: 1,
      },
      {
        type: "walk_end",
        tMs: 400,
        iso: "1970-01-01T00:00:00.400Z",
        note: 'done, "ok"',
      },
    ],
  });
  const lines = csv.split("\n");
  assert.equal(lines.length, 5);
  assert.match(lines[0], /^"event","source","iso_sent"/);
  assert.match(lines[1], /^"sample","lipi"/);
  assert.match(lines[1], /"failed, ""offline"""/);
  assert.match(lines[2], /^"checkin"/);
  assert.match(lines[2], /"A, ""Lobby"""/);
  assert.match(lines[3], /^"sample","cloud"/);
  assert.match(lines[3], /"1970-01-01T00:00:00.000Z"/);
  assert.match(lines[3], /"Lab, ""North"""/);
  assert.match(lines[4], /^"walk_end"/);
  assert.match(lines[4], /"done, ""ok"""/);
});
