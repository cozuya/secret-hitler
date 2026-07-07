import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const LANE_GAP = 8;

const defaultBirdImage = new Image();

defaultBirdImage.src = "/images/default_cardback.png";

// image cache keyed by URL; a broken image degrades to the default cardback
const imageCache = {};

const imageFor = (url) => {
  if (!url) {
    return defaultBirdImage;
  }

  if (!imageCache[url]) {
    const image = new Image();

    image.src = url;
    image.onerror = () => {
      // degrade to the default cardback now, but EVICT after a pause so a transient
      // blip (network hiccup, 5xx) doesn't hide role-card/cardback art for the whole
      // browser session - the next frame that wants this URL retries the load
      imageCache[url] = defaultBirdImage;
      setTimeout(() => {
        if (imageCache[url] === defaultBirdImage) {
          delete imageCache[url];
        }
      }, 10000);
    };
    imageCache[url] = image;
  }

  return imageCache[url];
};

// Bird sprite rules:
// - before lock-in (pilot identities secret): everyone sees the default cardback, except
//   the pilot's own client which shows their own custom cardback as a "that's me" cue
// - after lock-in (identities public): the bird is the pilot's actual role card
const birdImageFor = (lane, team, youControl, ownCardbackUrl) => {
  if (lane.controllerRole) {
    const { cardName, icon } = lane.controllerRole;

    return imageFor(`/images/cards/${cardName}${typeof icon === "number" ? icon : ""}.png`);
  }

  if (youControl === team && ownCardbackUrl) {
    return imageFor(ownCardbackUrl);
  }

  return defaultBirdImage;
};

// gradients are rebuilt at display refresh rate otherwise - cache the static ones per
// canvas context (sky per lane; pipe gradients are built in local coordinates and drawn
// under a translate so one gradient serves every pylon x)
const gradientCache = new WeakMap();

const laneGradients = (ctx, laneY, laneHeight, pylonWidth) => {
  let cache = gradientCache.get(ctx);

  if (!cache) {
    cache = {};
    gradientCache.set(ctx, cache);
  }

  const key = `${laneY}-${laneHeight}-${pylonWidth}`;

  if (!cache[key]) {
    const liberalSky = ctx.createLinearGradient(0, laneY, 0, laneY + laneHeight);
    liberalSky.addColorStop(0, "#7db9e8");
    liberalSky.addColorStop(1, "#1e5799");

    const fascistSky = ctx.createLinearGradient(0, laneY, 0, laneY + laneHeight);
    fascistSky.addColorStop(0, "#e8a97d");
    fascistSky.addColorStop(1, "#99321e");

    const pipe = ctx.createLinearGradient(0, 0, pylonWidth, 0);
    pipe.addColorStop(0, "#87B145");
    pipe.addColorStop(0.4, "#b5ffb2");
    pipe.addColorStop(1, "darkgreen");

    // gold pipes mark the gap that rotates control to the next player
    const goldPipe = ctx.createLinearGradient(0, 0, pylonWidth, 0);
    goldPipe.addColorStop(0, "#b8860b");
    goldPipe.addColorStop(0.4, "#ffe9a0");
    goldPipe.addColorStop(1, "#8a6d1d");

    cache[key] = { liberalSky, fascistSky, pipe, goldPipe };
  }

  return cache[key];
};

const drawLane = (ctx, snapshot, team, laneY, view) => {
  const { config } = snapshot;
  const lane = snapshot[team];
  const isLiberal = team === "liberal";
  const gradients = laneGradients(ctx, laneY, config.laneHeight, config.pylonWidth);

  ctx.fillStyle = isLiberal ? gradients.liberalSky : gradients.fascistSky;
  ctx.fillRect(0, laneY, config.laneWidth, config.laneHeight);

  ctx.strokeStyle = "#555";
  snapshot.pylons.forEach((pylon) => {
    ctx.save();
    ctx.translate(pylon.x, 0);
    ctx.fillStyle = pylon.isRotator ? gradients.goldPipe : gradients.pipe;

    ctx.fillRect(0, laneY, config.pylonWidth, pylon.gapTop);
    ctx.strokeRect(0, laneY, config.pylonWidth, pylon.gapTop);
    ctx.fillRect(0, laneY + pylon.gapBottom, config.pylonWidth, config.laneHeight - pylon.gapBottom);
    ctx.strokeRect(0, laneY + pylon.gapBottom, config.pylonWidth, config.laneHeight - pylon.gapBottom);
    ctx.restore();
  });

  const birdImage = birdImageFor(lane, team, view.youControl, view.ownCardbackUrl);

  if (!lane.bird.alive) {
    ctx.globalAlpha = 0.35;
  }
  if (birdImage.complete && birdImage.naturalWidth) {
    ctx.drawImage(birdImage, config.birdX, laneY + lane.bird.y, config.birdWidth, config.birdHeight);
  } else {
    ctx.fillStyle = isLiberal ? "#1a4a8a" : "#8a1a1a";
    ctx.fillRect(config.birdX, laneY + lane.bird.y, config.birdWidth, config.birdHeight);
  }
  ctx.globalAlpha = 1;

  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";

  if (view.youControl === team && (snapshot.status === "running" || snapshot.status === "countdown")) {
    // status gate: without it the losing pilot's end screen still showed the active
    // "YOU are in control" prompt over the finished race (countdown is included so the
    // pilot knows to get ready before "go")
    ctx.fillStyle = "#ffe14d";
    ctx.fillText(
      `${isLiberal ? "Liberals" : "Fascists"}: YOU are in control - click or press space to flap`,
      10,
      laneY + 22
    );
  } else if (snapshot.lockedIn && lane.controllerUserName) {
    ctx.fillText(`${isLiberal ? "Liberals" : "Fascists"}: controlled by ${lane.controllerUserName}`, 10, laneY + 22);
  } else {
    ctx.fillText(`${isLiberal ? "Liberals" : "Fascists"}: pilot hidden until the first gate`, 10, laneY + 22);
  }

  if (snapshot.status === "finished") {
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    // "Crashed" only when this bird actually died - topdeck and coin-flip endings
    // finish with both birds alive, and labeling a non-crash a crash misreports the
    // ending (the winner line + gamechat carry the real story)
    if (snapshot.winningTeam === team) {
      ctx.fillText(`${isLiberal ? "Liberals" : "Fascists"} win`, config.laneWidth / 2, laneY + config.laneHeight / 2);
    } else if (!lane.bird.alive) {
      ctx.fillText("Crashed", config.laneWidth / 2, laneY + config.laneHeight / 2);
    }
  }
};

// The server simulates at ~20Hz but we render at display refresh rate. Drawing raw
// snapshots looks choppy (each position repeats for ~3 frames, then jumps), so we render
// one snapshot behind and interpolate toward the latest — smooth motion at the cost of
// ~one tick (~50ms) of display latency, which is imperceptible here.
const lerp = (a, b, t) => a + (b - a) * t;

// NOTE(perf): this allocates a fresh snapshot per animation frame (~60Hz). Measured cost
// is negligible for <20 pylons and it keeps the render path stateless - don't memoize
// without profiling first.
const interpolateSnapshot = (prev, curr, alpha) => {
  if (!prev || prev.status !== "running" || curr.status !== "running") {
    return curr;
  }

  // never lerp across a field reset - fresh birds should snap to center, not glide up
  // from the previous crash position
  if (prev.fieldResets !== curr.fieldResets) {
    return curr;
  }

  const prevPylonsById = {};
  prev.pylons.forEach((pylon) => {
    prevPylonsById[pylon.id] = pylon;
  });

  return {
    ...curr,
    liberal: {
      ...curr.liberal,
      bird: { ...curr.liberal.bird, y: lerp(prev.liberal.bird.y, curr.liberal.bird.y, alpha) },
    },
    fascist: {
      ...curr.fascist,
      bird: { ...curr.fascist.bird, y: lerp(prev.fascist.bird.y, curr.fascist.bird.y, alpha) },
    },
    pylons: curr.pylons.map((pylon) => {
      const prevPylon = prevPylonsById[pylon.id];
      return prevPylon ? { ...pylon, x: lerp(prevPylon.x, pylon.x, alpha) } : pylon;
    }),
  };
};

const drawSnapshot = (canvas, snapshot, view) => {
  if (!canvas) {
    return;
  }

  // dimensions come from the server-sent config, not the JSX attributes (which are
  // only the pre-snapshot defaults) - if laneHeight/laneWidth ever become
  // difficulty-scaled like their config neighbors, the canvas follows automatically
  if (snapshot && snapshot.config) {
    const width = snapshot.config.laneWidth;
    const height = 2 * snapshot.config.laneHeight + LANE_GAP;
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
  }

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!snapshot) {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FLAPPY HITLER - waiting for server..", canvas.width / 2, canvas.height / 2);
    return;
  }

  drawLane(ctx, snapshot, "liberal", 0, view);
  drawLane(ctx, snapshot, "fascist", snapshot.config.laneHeight + LANE_GAP, view);

  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  if (snapshot.lockedIn) {
    ctx.fillText(`Gaps passed: ${snapshot.passedGapCount}`, snapshot.config.laneWidth - 10, 22);
  } else {
    ctx.fillText(`First gate - attempt ${(snapshot.failedAttempts || 0) + 1}`, snapshot.config.laneWidth - 10, 22);
  }

  // pre-race "get ready" overlay: a dimming wash plus a large centered count so pilots
  // orient before the birds start falling (the same number rides the status bar)
  if (snapshot.status === "countdown") {
    const midX = canvas.width / 2;
    const midY = canvas.height / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffe14d";
    ctx.font = "bold 120px sans-serif";
    ctx.fillText(String(snapshot.countdownSeconds || ""), midX, midY - 24);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("GET READY", midX, midY + 60);
    ctx.textBaseline = "alphabetic"; // restore default for the next frame's lane text
  }
};

const Flappy = ({ userInfo, gameInfo, socket }) => {
  const canvasRef = useRef(null);
  const framesRef = useRef({ prev: null, curr: null, currAt: 0, interval: 50, seeded: false });
  const youControlRef = useRef(null);
  // fresh props every render: the mount-time effect closure would otherwise pin
  // gameInfo/userInfo to whatever was hydrated at mount (e.g. an empty
  // publicPlayersState, or a not-yet-hydrated userName on a refresh directly into a
  // live flappy game - which would hide the pilot's own-cardback cue forever)
  const gameInfoRef = useRef(gameInfo);
  const userInfoRef = useRef(userInfo);

  gameInfoRef.current = gameInfo;
  userInfoRef.current = userInfo;

  useEffect(() => {
    // seed from the game object so reconnecting players and fresh observers see the
    // field before the next tick arrives. Marked so the first live snapshot doesn't
    // interpolate from these possibly-stale positions (a visible one-time glide).
    if (gameInfo.flappyState && gameInfo.flappyState.config) {
      framesRef.current.curr = gameInfo.flappyState;
      framesRef.current.currAt = performance.now();
      framesRef.current.seeded = true;
    }

    // own custom cardback (public info, own seat) - shown on the bird pre-lock-in as a
    // private "you're flying" cue. Computed per-frame from the live gameInfo because
    // the seat row may not be hydrated yet at mount.
    const ownCardbackUrl = () => {
      const info = gameInfoRef.current;
      const me = userInfoRef.current;
      const ownSeat =
        me && me.userName && info.publicPlayersState && info.publicPlayersState.find((p) => p.userName === me.userName);

      // NOTE(cleanup): this URL template also exists in Players.jsx, DisplayLobbies.jsx,
      // Profile.jsx and Settings.jsx - extracting a shared helper is a standalone
      // cleanup PR across those files, deliberately not smuggled into the flappy diff
      return ownSeat && ownSeat.customCardback
        ? `../images/custom-cardbacks/${ownSeat.userName}.${ownSeat.customCardback}?${ownSeat.customCardbackUid}`
        : null;
    };

    let animationFrame;
    let renderLoopStopped = false;

    const render = () => {
      const frames = framesRef.current;
      let displaySnapshot = frames.curr;

      if (frames.curr && frames.prev) {
        const alpha = Math.min(Math.max((performance.now() - frames.currAt) / frames.interval, 0), 1);
        displaySnapshot = interpolateSnapshot(frames.prev, frames.curr, alpha);
      }

      drawSnapshot(canvasRef.current, displaySnapshot, {
        youControl: youControlRef.current,
        ownCardbackUrl: ownCardbackUrl(),
      });

      // once the race is over no more snapshots arrive - draw the end screen once and
      // stop instead of redrawing a static frame at display refresh rate forever. The
      // pre-race "countdown" keeps animating (the overlay number is live).
      if (displaySnapshot && displaySnapshot.status !== "running" && displaySnapshot.status !== "countdown") {
        renderLoopStopped = true;
        return;
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    const onFlappyUpdate = (data) => {
      if (data && data.type === "snapshot") {
        const frames = framesRef.current;
        const now = performance.now();
        // clamp the measured inter-arrival time so one delayed packet doesn't cause slow-motion
        frames.interval = frames.curr ? Math.min(Math.max(now - frames.currAt, 30), 120) : 50;
        // don't interpolate from the gameUpdate seed - it can be stale
        frames.prev = frames.seeded ? data : frames.curr;
        frames.seeded = false;
        frames.curr = data;
        frames.currAt = now;
        youControlRef.current = data.youControl || null;

        if (renderLoopStopped) {
          renderLoopStopped = false;
          animationFrame = window.requestAnimationFrame(render);
        }
      }
    };

    const onKeyDown = (e) => {
      // never steal Space from text entry (e.g. typing in gamechat) - it would eat the
      // character and, if the typist is the current pilot, flap their bird into a pipe
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      // holding Space auto-repeats ~30/s, which would pin the bird to the ceiling
      if (e.repeat) {
        return;
      }

      // only the current pilot's Space is game input - spectators, dead players, and
      // non-controlling seats keep normal Space behavior (page scroll etc.)
      if (!youControlRef.current) {
        return;
      }

      // once the race is over the canvas lingers as the end screen - stop stealing
      // Space from the post-game review
      const curr = framesRef.current.curr;
      if (!curr || curr.status !== "running") {
        return;
      }

      if (e.code === "Space" || e.keyCode === 32) {
        e.preventDefault();
        flap();
      }
    };

    socket.on("flappyUpdate", onFlappyUpdate);
    window.addEventListener("keydown", onKeyDown);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      socket.removeListener("flappyUpdate", onFlappyUpdate);
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const flap = () => {
    const curr = framesRef.current.curr;

    if (!curr || curr.status !== "running") {
      return;
    }

    // shared by the click and Space paths: only the current pilot's input is game
    // input. The server rejects non-pilot flaps anyway - this just stops observers
    // and non-piloting seats from spamming pointless flappyEvent traffic by clicking
    if (!youControlRef.current) {
      return;
    }

    socket.emit("flappyEvent", {
      uid: gameInfo.general.uid,
      type: "flap",
    });
  };

  return (
    <canvas
      ref={canvasRef}
      width="750"
      height="448"
      id="flappy-canvas"
      style={{
        background: "#222",
        cursor: "pointer",
        maxWidth: "100%",
        maxHeight: "100%",
        // height:auto keeps the aspect ratio when maxWidth bites on narrow screens
        // (without it the canvas squishes horizontally but stays 448px tall)
        height: "auto",
        // rapid taps are the whole game - without this, mobile browsers interpret
        // them as double-tap-to-zoom and hijack the race mid-flight
        touchAction: "manipulation",
        display: "block",
        margin: "auto",
      }}
      onClick={flap}
    />
  );
};

Flappy.propTypes = {
  userInfo: PropTypes.object,
  gameInfo: PropTypes.object,
  socket: PropTypes.object,
};

export default Flappy;
