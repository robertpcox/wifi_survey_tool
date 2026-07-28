import {
  buildPlaybackFrame,
  playbackTimes,
} from "./playback-frame.mjs";

export function createPlaybackController(options) {
  const {
    routeState,
    sessionState,
    mapAdapter,
    walkView,
    captureView,
    stopPolling,
    setStatus,
    setIntervalImpl = globalThis.setInterval,
    clearIntervalImpl = globalThis.clearInterval,
  } = options;
  const playback = {
    active: false,
    data: null,
    t0: 0,
    t1: 0,
    t: 0,
    playing: false,
    timer: null,
  };

  function importSession(input) {
    const file = input.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const data = JSON.parse(text);
      if (!Array.isArray(data.samples)) {
        throw new Error("not a route_survey session file");
      }
      enterPlayback(data);
    }).catch(error => {
      setStatus("err", `Session import failed: ${error.message}`);
    });
    input.value = "";
  }

  function enterPlayback(data) {
    if (!data) return;
    const times = playbackTimes(data);
    if (!times.length) {
      setStatus("err", "No samples or events in that file");
      return;
    }
    stopPolling();
    playback.active = true;
    playback.data = data;
    playback.t0 = Math.min(...times);
    playback.t1 = Math.max(...times);
    playback.t = playback.t0;
    captureView.showPlayback(data, playback);
    mapAdapter.drawRoute?.(data.legs || []);
    mapAdapter.drawStops?.(data.stops || []);
    mapAdapter.clearTargetMarker?.();
    walkView.updateCard(true);
    render();
  }

  function exitPlayback() {
    pause();
    playback.active = false;
    playback.data = null;
    captureView.hidePlayback();
    mapAdapter.drawRoute?.(routeState.legs);
    mapAdapter.drawStops?.(routeState.stops);
    mapAdapter.drawWaypoints?.(routeState.waypoints);
    mapAdapter.drawTrails?.(sessionState.samples);
    walkView.updateCard();
  }

  function pbTogglePlay() {
    if (playback.playing) pause();
    else play();
  }

  function play() {
    if (!playback.active) return;
    playback.playing = true;
    captureView.setPlaybackPlaying(true);
    playback.timer = setIntervalImpl(() => {
      playback.t += captureView.playbackSpeed() * 100;
      if (playback.t >= playback.t1) {
        playback.t = playback.t1;
        pause();
      }
      render();
    }, 100);
  }

  function pause() {
    playback.playing = false;
    captureView.setPlaybackPlaying(false);
    clearIntervalImpl(playback.timer);
  }

  function pbSeek(value) {
    if (!playback.active) return;
    playback.t = playback.t0
      + (playback.t1 - playback.t0) * (value / 1000);
    render();
  }

  function render() {
    const frame = buildPlaybackFrame(playback.data, playback.t);
    mapAdapter.drawTrails?.(frame.samples);
    mapAdapter.drawWaypoints?.(frame.waypoints);
    mapAdapter.setActiveLeg?.(frame.activeLeg);
    captureView.renderPlayback(playback, frame.lastEvent);
  }

  return {
    enterPlayback,
    exitPlayback,
    get active() {
      return playback.active;
    },
    importSession,
    pbSeek,
    pbTogglePlay,
  };
}
