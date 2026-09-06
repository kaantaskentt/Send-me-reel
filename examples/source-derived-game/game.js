const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const stateEl = document.getElementById("state");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayCopy = document.getElementById("overlayCopy");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const muteBtn = document.getElementById("muteBtn");
const touchLeft = document.getElementById("touchLeft");
const touchLaunch = document.getElementById("touchLaunch");
const touchRight = document.getElementById("touchRight");

const DPR_LIMIT = 2;
const state = {
  mode: "idle",
  score: 0,
  lives: 3,
  muted: false,
  lastTime: 0,
  keys: new Set(),
  pointerActive: false,
  pointerX: null,
  moveIntent: 0,
  stars: [],
};

const world = {
  width: 900,
  height: 600,
  paddle: { x: 0, y: 0, w: 156, h: 24, speed: 560, targetX: 0 },
  ball: { x: 0, y: 0, vx: 0, vy: 0, r: 11, attached: true, speed: 340 },
  blocks: [],
  blockLayout: null,
};

let audioCtx = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function formatScore(value) {
  return String(value).padStart(4, "0");
}

function setState(nextState) {
  state.mode = nextState;
  stateEl.textContent = nextState.charAt(0).toUpperCase() + nextState.slice(1);
  const paused = nextState === "paused";
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  pauseBtn.disabled = nextState === "idle" || nextState === "won" || nextState === "lost";
  startBtn.textContent = "Start";
  startBtn.disabled = nextState === "running";

  const showOverlay = nextState !== "running";
  overlay.classList.toggle("is-hidden", !showOverlay);

  if (nextState === "idle") {
    overlayTitle.textContent = "Press Start";
    overlayCopy.textContent = "Move with arrow keys or drag on the playfield. Launch with Start or Space.";
  } else if (nextState === "paused") {
    overlayTitle.textContent = "Paused";
    overlayCopy.textContent = "The spell is frozen in the air. Resume or press P to continue.";
  } else if (nextState === "won") {
    overlayTitle.textContent = "Ward broken";
    overlayCopy.textContent = "You cleared the entire tower. Press Restart to play again.";
  } else if (nextState === "lost") {
    overlayTitle.textContent = "Spell failed";
    overlayCopy.textContent = "The orb fell through the floor. Restart to try the tower again.";
  }
}

function updateHUD() {
  scoreEl.textContent = formatScore(state.score);
  livesEl.textContent = String(state.lives);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / world.width;
  const scaleY = rect.height / world.height;
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  world.width = rect.width;
  world.height = rect.height;
  world.paddle.x *= scaleX;
  if (!world.ball.attached) {
    world.ball.x *= scaleX;
    world.ball.y *= scaleY;
  }
  layoutWorld();
}

function layoutWorld() {
  const w = world.width;
  const h = world.height;
  const paddleWidth = clamp(w * 0.17, 112, 180);
  world.paddle.w = paddleWidth;
  world.paddle.h = clamp(h * 0.043, 20, 28);
  world.paddle.y = h - Math.max(36, h * 0.065);
  world.paddle.x = clamp(world.paddle.x || w / 2 - paddleWidth / 2, 18, w - paddleWidth - 18);
  world.paddle.targetX = world.paddle.x;

  if (!world.ball.attached) {
    world.ball.x = clamp(world.ball.x, world.ball.r + 8, w - world.ball.r - 8);
  } else {
    attachBall();
  }

  if (world.blocks.length === 0) {
    createBlocks();
  } else {
    layoutBlocks();
  }
  createStars();
}

function createStars() {
  state.stars = Array.from({ length: 48 }, () => ({
    x: Math.random() * world.width,
    y: Math.random() * world.height,
    r: randomBetween(0.8, 2.3),
    a: randomBetween(0.2, 0.9),
    vx: randomBetween(-7, 7),
    vy: randomBetween(3, 13),
  }));
}

function createBlocks() {
  const cols = world.width < 560 ? 7 : 9;
  const rows = world.width < 560 ? 4 : 5;
  const marginX = clamp(world.width * 0.05, 18, 44);
  const marginTop = clamp(world.height * 0.09, 48, 72);
  const gap = clamp(world.width * 0.012, 8, 14);
  const availableW = world.width - marginX * 2 - gap * (cols - 1);
  const blockW = availableW / cols;
  const blockH = clamp(world.height * 0.056, 24, 34);
  const palette = ["#f7d66b", "#9f7cff", "#4fd6ff", "#6ff0b3", "#ff7d8e"];

  world.blockLayout = { cols, rows, marginX, marginTop, gap, blockW, blockH };
  world.blocks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      world.blocks.push({
        row,
        col,
        x: 0,
        y: 0,
        w: blockW,
        h: blockH,
        alive: true,
        hue: palette[row % palette.length],
        glow: 0.22 + row * 0.05,
      });
    }
  }
  layoutBlocks();
}

function layoutBlocks() {
  const layout = world.blockLayout;
  if (!layout) {
    return;
  }
  // Post-generation QA fix: recompute geometry on resize while retaining every
  // block's identity/alive state, including a paused game or orientation change.
  layout.marginX = clamp(world.width * 0.05, 12, 44);
  layout.marginTop = clamp(world.height * 0.09, 20, 72);
  layout.gap = clamp(world.width * 0.012, 4, 14);
  layout.blockW = (world.width - layout.marginX * 2 - layout.gap * (layout.cols - 1)) / layout.cols;
  const availableHeight = world.paddle.y - world.ball.r * 3 - layout.marginTop - layout.gap * (layout.rows - 1);
  layout.blockH = Math.min(clamp(world.height * 0.056, 16, 34), Math.max(8, availableHeight / layout.rows));
  const { marginX, marginTop, gap, blockW, blockH } = layout;
  for (const block of world.blocks) {
    block.x = marginX + block.col * (blockW + gap);
    block.y = marginTop + block.row * (blockH + gap);
    block.w = blockW;
    block.h = blockH;
  }
}

function attachBall() {
  world.ball.attached = true;
  world.ball.speed = 340;
  world.ball.vx = 0;
  world.ball.vy = 0;
  world.ball.x = world.paddle.x + world.paddle.w / 2;
  world.ball.y = world.paddle.y - world.ball.r - 2;
}

function resetRound(keepScore = true) {
  if (!keepScore) {
    state.score = 0;
    state.lives = 3;
    updateHUD();
  }
  world.paddle.x = world.width / 2 - world.paddle.w / 2;
  world.paddle.targetX = world.paddle.x;
  attachBall();
}

function launchBall() {
  if (!world.ball.attached || state.mode === "lost" || state.mode === "won") {
    return;
  }
  const angle = randomBetween(-0.95, -0.45);
  const speed = world.ball.speed;
  world.ball.vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
  world.ball.vy = Math.sin(angle) * speed;
  world.ball.attached = false;
  if (state.mode === "idle" || state.mode === "paused") {
    setState("running");
  }
  playTone(523.25, 0.06, "triangle", 0.04);
}

function playTone(freq, duration, type = "sine", gain = 0.05) {
  if (state.muted) {
    return;
  }
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  const osc = audioCtx.createOscillator();
  const envelope = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  envelope.gain.value = 0;
  osc.connect(envelope);
  envelope.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function toggleMute(force) {
  state.muted = typeof force === "boolean" ? force : !state.muted;
  muteBtn.textContent = state.muted ? "Sound Off" : "Sound On";
  muteBtn.setAttribute("aria-pressed", String(state.muted));
}

function startGame() {
  if (state.mode === "won" || state.mode === "lost") {
    restartGame();
    return;
  }
  if (state.mode === "idle") {
    setState("running");
    launchBall();
  } else if (state.mode === "paused") {
    setState("running");
  } else if (state.mode !== "running") {
    setState("running");
  }
}

function pauseGame() {
  if (state.mode === "running") {
    setState("paused");
  } else if (state.mode === "paused") {
    setState("running");
  }
}

function restartGame() {
  state.score = 0;
  state.lives = 3;
  updateHUD();
  buildRound();
  setState("idle");
  resetRound(false);
  drawFrame();
}

function buildRound() {
  createBlocks();
  createStars();
}

function movePaddleToward(targetX, dt) {
  const maxX = world.width - world.paddle.w - 18;
  const minX = 18;
  const target = clamp(targetX - world.paddle.w / 2, minX, maxX);
  const delta = target - world.paddle.x;
  const maxStep = world.paddle.speed * dt;
  world.paddle.x += clamp(delta, -maxStep, maxStep);
  world.ball.x = clamp(world.ball.x, world.ball.r + 8, world.width - world.ball.r - 8);
}

function applyKeyboard(dt) {
  let dir = 0;
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA")) {
    dir -= 1;
  }
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD")) {
    dir += 1;
  }
  if (dir !== 0) {
    world.paddle.x = clamp(
      world.paddle.x + dir * world.paddle.speed * dt,
      18,
      world.width - world.paddle.w - 18,
    );
  }
}

function stepBall(dt) {
  if (world.ball.attached) {
    world.ball.x = world.paddle.x + world.paddle.w / 2;
    world.ball.y = world.paddle.y - world.ball.r - 2;
    return;
  }

  world.ball.x += world.ball.vx * dt;
  world.ball.y += world.ball.vy * dt;

  if (world.ball.x - world.ball.r <= 0) {
    world.ball.x = world.ball.r;
    world.ball.vx *= -1;
    playTone(370, 0.04, "sine", 0.025);
  } else if (world.ball.x + world.ball.r >= world.width) {
    world.ball.x = world.width - world.ball.r;
    world.ball.vx *= -1;
    playTone(370, 0.04, "sine", 0.025);
  }

  if (world.ball.y - world.ball.r <= 0) {
    world.ball.y = world.ball.r;
    world.ball.vy *= -1;
    playTone(392, 0.04, "sine", 0.025);
  }

  const paddle = world.paddle;
  const ballBottom = world.ball.y + world.ball.r;
  const ballLeft = world.ball.x - world.ball.r;
  const ballRight = world.ball.x + world.ball.r;
  const ballTop = world.ball.y - world.ball.r;

  if (
    world.ball.vy > 0 &&
    ballBottom >= paddle.y &&
    ballTop <= paddle.y + paddle.h &&
    ballRight >= paddle.x &&
    ballLeft <= paddle.x + paddle.w
  ) {
    const hit = (world.ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const angle = clamp(hit, -1, 1) * 1.08;
    const speed = Math.min(590, Math.hypot(world.ball.vx, world.ball.vy) * 1.03 + 4);
    world.ball.vx = Math.sin(angle) * speed;
    world.ball.vy = -Math.sqrt(Math.max(40, speed * speed - world.ball.vx * world.ball.vx));
    world.ball.y = paddle.y - world.ball.r - 0.5;
    world.ball.speed = speed;
    playTone(659, 0.05, "triangle", 0.035);
  }

  for (const block of world.blocks) {
    if (!block.alive) {
      continue;
    }
    if (
      ballRight < block.x ||
      ballLeft > block.x + block.w ||
      ballBottom < block.y ||
      ballTop > block.y + block.h
    ) {
      continue;
    }
    block.alive = false;
    state.score += 50;
    updateHUD();
    playTone(880 - Math.min(240, block.y), 0.05, "square", 0.03);

    const overlapLeft = ballRight - block.x;
    const overlapRight = block.x + block.w - ballLeft;
    const overlapTop = ballBottom - block.y;
    const overlapBottom = block.y + block.h - ballTop;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      world.ball.vx *= -1;
    } else {
      world.ball.vy *= -1;
    }

    world.ball.vx *= 1.01;
    world.ball.vy *= 1.01;
    break;
  }

  if (world.blocks.every((block) => !block.alive)) {
    setState("won");
    playTone(783.99, 0.12, "triangle", 0.04);
  }

  if (world.ball.y - world.ball.r > world.height + 10) {
    state.lives -= 1;
    updateHUD();
    playTone(164.81, 0.12, "sawtooth", 0.05);
    if (state.lives <= 0) {
      setState("lost");
    } else {
      setState("idle");
      resetRound(true);
    }
  }
}

function drawBackground() {
  const w = world.width;
  const h = world.height;
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, "#090611");
  gradient.addColorStop(0.52, "#120d22");
  gradient.addColorStop(1, "#1a1230");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const moonGlow = ctx.createRadialGradient(w * 0.5, h * 0.12, 8, w * 0.5, h * 0.12, h * 0.48);
  moonGlow.addColorStop(0, "rgba(159,124,255,0.22)");
  moonGlow.addColorStop(1, "rgba(159,124,255,0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, w, h);

  for (const star of state.stars) {
    star.x += star.vx * 0.016;
    star.y += star.vy * 0.016;
    if (star.y > h + 4) {
      star.y = -4;
      star.x = Math.random() * w;
    }
    if (star.x < -4) {
      star.x = w + 4;
    } else if (star.x > w + 4) {
      star.x = -4;
    }
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${star.a})`;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#f7d66b";
  ctx.fillRect(0, h - 28, w, 28);
  ctx.restore();
}

function drawBlocks() {
  for (const block of world.blocks) {
    if (!block.alive) {
      continue;
    }
    const radius = Math.min(10, block.h / 2);
    const glow = ctx.createLinearGradient(block.x, block.y, block.x + block.w, block.y + block.h);
    glow.addColorStop(0, block.hue);
    glow.addColorStop(1, "#fef6d0");
    ctx.save();
    ctx.shadowColor = block.hue;
    ctx.shadowBlur = 18 * block.glow;
    roundRect(block.x, block.y, block.w, block.h, radius, glow, "rgba(255,255,255,0.24)");
    ctx.restore();
  }
}

function drawPaddle() {
  const { x, y, w, h } = world.paddle;
  const center = x + w / 2;
  const top = y;
  const staffX = center + w * 0.18;

  ctx.save();
  ctx.shadowColor = "rgba(159,124,255,0.82)";
  ctx.shadowBlur = 24;
  const robe = ctx.createLinearGradient(x, y, x, y + h);
  robe.addColorStop(0, "#d0b5ff");
  robe.addColorStop(0.55, "#7c5de8");
  robe.addColorStop(1, "#3d2d7a");
  roundRect(x, y, w, h, h / 2, robe, "rgba(255,255,255,0.25)");
  ctx.restore();

  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = "rgba(247,214,107,0.7)";
  ctx.fillStyle = "#f7d66b";
  ctx.beginPath();
  ctx.arc(center, y - h * 0.46, h * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#f4efff";
  ctx.strokeStyle = "#cab8ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(staffX, y - h * 1.35);
  ctx.lineTo(staffX, y + h * 0.06);
  ctx.stroke();
  ctx.fillRect(staffX - 2, y - h * 1.35, 4, h * 1.38);
  ctx.beginPath();
  ctx.arc(staffX, y - h * 1.35, h * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = "#f7d66b";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x + 12, top + 5, w - 24, 3);
  ctx.restore();
}

function drawBall() {
  const { x, y, r } = world.ball;
  const glow = ctx.createRadialGradient(x, y, 2, x, y, r * 2.6);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.35, "rgba(247,214,107,0.94)");
  glow.addColorStop(1, "rgba(159,124,255,0)");
  ctx.save();
  ctx.shadowColor = "rgba(247,214,107,0.9)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#fff7cb";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArenaDetails() {
  const w = world.width;
  const h = world.height;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 22);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 8; i += 1) {
    const x = w * (0.1 + i * 0.12);
    ctx.fillRect(x, 24, 1, 8);
  }
  ctx.restore();
}

function roundRect(x, y, w, h, radius, fillStyle, strokeStyle) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawFrame() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackground();
  drawArenaDetails();
  drawBlocks();
  drawPaddle();
  drawBall();
}

function tick(timestamp) {
  const dt = Math.min(0.022, (timestamp - state.lastTime) / 1000 || 0.016);
  state.lastTime = timestamp;

  if (state.mode === "running") {
    applyKeyboard(dt);
    if (state.pointerActive && state.pointerX !== null) {
      movePaddleToward(state.pointerX, dt);
    } else if (state.moveIntent !== 0) {
      world.paddle.x = clamp(
        world.paddle.x + state.moveIntent * world.paddle.speed * dt,
        18,
        world.width - world.paddle.w - 18,
      );
    }
    stepBall(dt);
  } else if (state.mode === "idle" || state.mode === "paused") {
    if (state.pointerActive && state.pointerX !== null) {
      movePaddleToward(state.pointerX, dt);
    }
  }

  if (world.ball.attached) {
    world.ball.x = world.paddle.x + world.paddle.w / 2;
    world.ball.y = world.paddle.y - world.ball.r - 2;
  }

  drawFrame();
  requestAnimationFrame(tick);
}

function handlePointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  state.pointerX = event.clientX - rect.left;
}

canvas.addEventListener("pointerdown", (event) => {
  state.pointerActive = true;
  canvas.setPointerCapture(event.pointerId);
  handlePointerMove(event);
  if (state.mode === "idle") {
    startGame();
  } else if (state.mode === "paused") {
    setState("running");
  }
  if (world.ball.attached && state.mode === "running") {
    launchBall();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.pointerActive && event.pointerType !== "mouse") {
    return;
  }
  handlePointerMove(event);
});

canvas.addEventListener("pointerup", () => {
  state.pointerActive = false;
  state.pointerX = null;
});

canvas.addEventListener("pointercancel", () => {
  state.pointerActive = false;
  state.pointerX = null;
});

window.addEventListener("keydown", (event) => {
  state.keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    if (state.mode === "idle") {
      startGame();
    } else if (state.mode === "paused") {
      setState("running");
    } else if (state.mode === "running" && world.ball.attached) {
      launchBall();
    }
  }
  if (event.code === "KeyP") {
    event.preventDefault();
    pauseGame();
  }
  if (event.code === "Enter") {
    event.preventDefault();
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

startBtn.addEventListener("click", () => {
  startGame();
  if (world.ball.attached) {
    launchBall();
  }
});

pauseBtn.addEventListener("click", () => {
  pauseGame();
});

restartBtn.addEventListener("click", () => {
  restartGame();
});

muteBtn.addEventListener("click", () => {
  toggleMute();
});

touchLeft.addEventListener("pointerdown", () => {
  state.moveIntent = -1;
  if (state.mode === "idle") {
    startGame();
  }
});

touchLeft.addEventListener("pointerup", () => {
  state.moveIntent = 0;
});

touchLeft.addEventListener("pointerleave", () => {
  state.moveIntent = 0;
});

touchLeft.addEventListener("pointercancel", () => {
  state.moveIntent = 0;
});

touchRight.addEventListener("pointerdown", () => {
  state.moveIntent = 1;
  if (state.mode === "idle") {
    startGame();
  }
});

touchRight.addEventListener("pointerup", () => {
  state.moveIntent = 0;
});

touchRight.addEventListener("pointerleave", () => {
  state.moveIntent = 0;
});

touchRight.addEventListener("pointercancel", () => {
  state.moveIntent = 0;
});

touchLaunch.addEventListener("click", () => {
  if (state.mode === "idle") {
    startGame();
  }
  if (world.ball.attached) {
    launchBall();
  }
});

window.addEventListener("resize", resizeCanvas, { passive: true });
window.addEventListener("blur", () => {
  if (state.mode === "running") {
    setState("paused");
  }
});

toggleMute(false);
updateHUD();
setState("idle");
resizeCanvas();
resetRound(false);
requestAnimationFrame(tick);
