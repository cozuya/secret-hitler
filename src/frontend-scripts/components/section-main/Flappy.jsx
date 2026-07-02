import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const LANE_GAP = 8;

const birdImage = new Image();

birdImage.src = "/images/default_cardback.png";

const drawLane = (ctx, snapshot, team, laneY, userName) => {
  const { config } = snapshot;
  const lane = snapshot[team];
  const isLiberal = team === "liberal";

  const skyGradient = ctx.createLinearGradient(0, laneY, 0, laneY + config.laneHeight);

  skyGradient.addColorStop(0, isLiberal ? "#7db9e8" : "#e8a97d");
  skyGradient.addColorStop(1, isLiberal ? "#1e5799" : "#99321e");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, laneY, config.laneWidth, config.laneHeight);

  ctx.strokeStyle = "#555";
  snapshot.pylons.forEach((pylon) => {
    const pipeGradient = ctx.createLinearGradient(pylon.x, 0, pylon.x + config.pylonWidth, 0);

    pipeGradient.addColorStop(0, "#87B145");
    pipeGradient.addColorStop(0.4, "#b5ffb2");
    pipeGradient.addColorStop(1, "darkgreen");
    ctx.fillStyle = pipeGradient;

    ctx.fillRect(pylon.x, laneY, config.pylonWidth, pylon.gapTop);
    ctx.strokeRect(pylon.x, laneY, config.pylonWidth, pylon.gapTop);
    ctx.fillRect(pylon.x, laneY + pylon.gapBottom, config.pylonWidth, config.laneHeight - pylon.gapBottom);
    ctx.strokeRect(pylon.x, laneY + pylon.gapBottom, config.pylonWidth, config.laneHeight - pylon.gapBottom);
  });

  if (birdImage.complete) {
    ctx.drawImage(birdImage, config.birdX, laneY + lane.bird.y, config.birdWidth, config.birdHeight);
  } else {
    ctx.fillStyle = isLiberal ? "#1a4a8a" : "#8a1a1a";
    ctx.fillRect(config.birdX, laneY + lane.bird.y, config.birdWidth, config.birdHeight);
  }

  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  const controlText =
    lane.controllerUserName === userName ? "YOU - click or press space to flap!" : lane.controllerUserName;

  ctx.fillText(`${isLiberal ? "Liberals" : "Fascists"}: controlled by ${controlText}`, 10, laneY + 22);

  if (snapshot.status === "finished") {
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      snapshot.winningTeam === team ? `${isLiberal ? "Liberals" : "Fascists"} win!` : "Crashed!",
      config.laneWidth / 2,
      laneY + config.laneHeight / 2
    );
  }
};

// The server simulates at ~20Hz but we render at display refresh rate. Drawing raw
// snapshots looks choppy (each position repeats for ~3 frames, then jumps), so we render
// one snapshot behind and interpolate toward the latest — smooth motion at the cost of
// ~one tick (~50ms) of display latency, which is imperceptible here.
const lerp = (a, b, t) => a + (b - a) * t;

const interpolateSnapshot = (prev, curr, alpha) => {
  if (!prev || prev.status !== "running" || curr.status !== "running") {
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

const drawSnapshot = (canvas, snapshot, userName) => {
  if (!canvas) {
    return;
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

  drawLane(ctx, snapshot, "liberal", 0, userName);
  drawLane(ctx, snapshot, "fascist", snapshot.config.laneHeight + LANE_GAP, userName);

  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Gaps passed: ${snapshot.passedGapCount}`, snapshot.config.laneWidth - 10, 22);
};

const Flappy = ({ userInfo, gameInfo, socket }) => {
  const canvasRef = useRef(null);
  const framesRef = useRef({ prev: null, curr: null, currAt: 0, interval: 50 });

  useEffect(() => {
    // seed from the game object so reconnecting players and fresh observers see the field before the next tick arrives
    if (gameInfo.flappyState && gameInfo.flappyState.config) {
      framesRef.current.curr = gameInfo.flappyState;
      framesRef.current.currAt = performance.now();
    }

    const onFlappyUpdate = (data) => {
      if (data && data.type === "snapshot") {
        const frames = framesRef.current;
        const now = performance.now();
        // clamp the measured inter-arrival time so one delayed packet doesn't cause slow-motion
        frames.interval = frames.curr ? Math.min(Math.max(now - frames.currAt, 30), 120) : 50;
        frames.prev = frames.curr;
        frames.curr = data;
        frames.currAt = now;
      }
    };

    let animationFrame;
    const render = () => {
      const frames = framesRef.current;
      let displaySnapshot = frames.curr;

      if (frames.curr && frames.prev) {
        const alpha = Math.min(Math.max((performance.now() - frames.currAt) / frames.interval, 0), 1);
        displaySnapshot = interpolateSnapshot(frames.prev, frames.curr, alpha);
      }

      drawSnapshot(canvasRef.current, displaySnapshot, userInfo && userInfo.userName);
      animationFrame = window.requestAnimationFrame(render);
    };

    const onKeyDown = (e) => {
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
