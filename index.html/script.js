const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const board = $("#board");

/* ============ Toast ============ */
let tt;
function toast(msg, ms = 3200) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove("show"), ms);
}

/* ============ Passport stamps (the goal) ============ */
const STAMPS = [
  ["drag", "✋", "Moved a note"],
  ["photo", "📸", "Took a pic"],
  ["scratch", "🪙", "Scratched the card"],
  ["sticker", "⭐", "Picked a sticker"],
  ["guess", "🕵️", "Guessed the lie"],
  ["tool", "💡", "Used a desk tool"]
];
const got = new Set();
STAMPS.forEach(([k, e, t]) => {
  const s = document.createElement("span");
  s.className = "stamp"; s.dataset.k = k; s.title = t; s.textContent = e;
  $("#stamps").appendChild(s);
});
function earn(k, msg) {
  if (got.has(k)) return;
  got.add(k);
  $(`.stamp[data-k="${k}"]`).classList.add("got");
  $("#pcount").textContent = got.size;
  if (got.size === STAMPS.length) {
    toast("🏆 Passport complete! You explored my whole desk. Thanks for staying!", 6000);
    confetti();
  } else if (msg) toast(msg);
}

/* ============ Typewriter ============ */
const roles = ["web developer 💻", "creative thinker 🎨", "lifelong learner 📚", "coffee lover ☕"];
let ri = 0, ci = 0, del = false;
(function type() {
  const w = roles[ri];
  $("#typed").textContent = w.slice(0, ci);
  if (!del && ci < w.length) { ci++; setTimeout(type, 85); }
  else if (!del) { del = true; setTimeout(type, 1300); }
  else if (ci > 0) { ci--; setTimeout(type, 40); }
  else { del = false; ri = (ri + 1) % roles.length; setTimeout(type, 300); }
})();

/* ============ Polaroid ============ */
const shot = $(".shot"), img = $("#photoImg");
function photoFallback() {
  img.remove();
  const d = document.createElement("div");
  d.className = "initials";
  d.textContent = "YN"; // <- change to your initials
  shot.prepend(d);
}
img.addEventListener("error", photoFallback);
if (img.complete && img.naturalWidth === 0) photoFallback();

$("#polaroid").addEventListener("click", e => {
  if (e.currentTarget.dataset.justDragged) return;
  shot.classList.remove("redo");
  void shot.offsetWidth;
  shot.classList.add("redo");
  earn("photo", "📸 Click! Developing your photo...");
});

/* ============ Drag any piece (direct manipulation) ============ */
let zTop = 10;
function setPos(p, dx, dy, r) {
  p.dataset.dx = dx; p.dataset.dy = dy;
  p.style.setProperty("--dx", dx + "px");
  p.style.setProperty("--dy", dy + "px");
  if (r !== undefined) p.style.setProperty("--r", r + "deg");
}
$$(".piece").forEach((p, i) => {
  p.style.animationDelay = i * 0.12 + "s";
  p.dataset.r0 = parseFloat(p.style.getPropertyValue("--r")) || 0;
  setPos(p, 0, 0);
  let sx, sy, ox, oy, active = false, moved = 0;

  p.addEventListener("pointerdown", e => {
    if (document.body.classList.contains("doodling")) return;
    if (e.target.closest("[data-nodrag], a, button")) return;
    if (e.pointerType === "touch" && !e.target.closest(".pin")) return; // touch: drag by the pin/tape
    active = true; moved = 0;
    sx = e.clientX; sy = e.clientY;
    ox = +p.dataset.dx; oy = +p.dataset.dy;
    p.setPointerCapture(e.pointerId);
    p.style.zIndex = ++zTop;
  });
  p.addEventListener("pointermove", e => {
    if (!active) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    if (moved > 5) {
      p.classList.add("drag");
      setPos(p, ox + dx, oy + dy);
    }
  });
  const end = () => {
    if (!active) return;
    active = false;
    p.classList.remove("drag");
    if (moved > 5) {
      p.dataset.justDragged = "1";
      setTimeout(() => delete p.dataset.justDragged, 60);
      earn("drag", "✋ Nice! Everything here is movable.");
    }
  };
  p.addEventListener("pointerup", end);
  p.addEventListener("pointercancel", end);
});

/* ============ Count-up & pencil bars when visible ============ */
function countUp(el) {
  const target = +el.dataset.count, start = performance.now(), dur = 1600;
  (function step(now) {
    const k = Math.min((now - start) / dur, 1);
    el.textContent = Math.floor(target * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  })(start);
}
const io = new IntersectionObserver(es => {
  es.forEach(e => {
    if (!e.isIntersecting) return;
    $$("[data-count]", e.target).forEach(countUp);
    $$(".skill", e.target).forEach((s, i) =>
      setTimeout(() => ($("i", s).style.width = s.dataset.level + "%"), 300 + i * 150));
    io.unobserve(e.target);
  });
}, { threshold: 0.3 });
$$(".piece").forEach(p => io.observe(p));

$$(".skill").forEach(s =>
  s.addEventListener("click", () => {
    const bar = $("i", s);
    bar.style.width = "0";
    setTimeout(() => (bar.style.width = s.dataset.level + "%"), 80);
  })
);

/* ============ Stickers ============ */
$$(".sticker").forEach(b =>
  b.addEventListener("click", () => {
    const bub = $("#bubble");
    bub.textContent = b.dataset.msg;
    bub.classList.remove("pop"); void bub.offsetWidth; bub.classList.add("pop");
    earn("sticker", "⭐ Sticker stamp collected!");
  })
);

/* ============ Scratch card ============ */
const sc = $("#scratch"), sctx = sc.getContext("2d");
let sw, sh, scDone = false, down = false, moves = 0;
function drawCover() {
  if (scDone) return;
  sw = sc.width = sc.clientWidth; sh = sc.height = sc.clientHeight;
  const g = sctx.createLinearGradient(0, 0, sw, sh);
  g.addColorStop(0, "#c9ccd6"); g.addColorStop(0.5, "#f4f5f9"); g.addColorStop(1, "#aeb2c0");
  sctx.globalCompositeOperation = "source-over";
  sctx.fillStyle = g; sctx.fillRect(0, 0, sw, sh);
  sctx.fillStyle = "#6b6f80"; sctx.font = "700 20px system-ui, sans-serif"; sctx.textAlign = "center";
  sctx.fillText("✨ SCRATCH HERE ✨", sw / 2, sh / 2 + 7);
}
function cleared() {
  const d = sctx.getImageData(0, 0, sw, sh).data;
  let c = 0, n = 0;
  for (let i = 3; i < d.length; i += 80) { n++; if (d[i] === 0) c++; }
  return c / n;
}
function scratchAt(e) {
  if (scDone) return;
  const r = sc.getBoundingClientRect();
  const x = (e.clientX - r.left) * (sw / r.width), y = (e.clientY - r.top) * (sh / r.height);
  sctx.globalCompositeOperation = "destination-out";
  sctx.beginPath(); sctx.arc(x, y, 17, 0, Math.PI * 2); sctx.fill();
  if (++moves % 6 === 0 && cleared() > 0.4) {
    scDone = true;
    sc.classList.add("gone");
    earn("scratch", "🪙 Secret revealed!");
    confetti();
  }
}
sc.addEventListener("pointerdown", e => { down = true; sc.setPointerCapture(e.pointerId); scratchAt(e); });
sc.addEventListener("pointermove", e => { if (down) scratchAt(e); });
["pointerup", "pointercancel"].forEach(ev => sc.addEventListener(ev, () => (down = false)));
addEventListener("load", drawCover);
addEventListener("resize", drawCover);

/* ============ Spot the lie ============ */
let guessed = false;
$$(".sn").forEach(b =>
  b.addEventListener("click", () => {
    if (guessed) return;
    guessed = true;
    const lie = b.dataset.lie === "true";
    $$(".sn").forEach(x => { x.disabled = true; if (x.dataset.lie === "true") x.classList.add("right"); });
    if (lie) { $("#guessResult").textContent = "🎯 Yes! You caught my lie. You know me already!"; }
    else { b.classList.add("wrong"); $("#guessResult").textContent = "😅 Nope, that one's true! The green one was the lie."; }
    earn("guess", "🕵️ Detective stamp earned!");
  })
);

/* ============ Surprise ============ */
const surprises = [
  "🍕 Fun fact: I can eat pizza any time of day.",
  "🚀 My dream: build something that helps people.",
  "🎧 I code best with music on.",
  "🌟 Thanks for being here, you made my day!"
];
let si = 0;
$("#surprise").addEventListener("click", () => { toast(surprises[si++ % surprises.length], 3500); confetti(); });

/* ============ Toolbar: lights, doodle, scatter, tidy ============ */
const root = document.documentElement;
root.style.setProperty("--mx", innerWidth / 2 + "px");
root.style.setProperty("--my", innerHeight / 2 + "px");
addEventListener("pointermove", e => {
  root.style.setProperty("--mx", e.clientX + "px");
  root.style.setProperty("--my", e.clientY + "px");
});

$("#lightBtn").addEventListener("click", e => {
  const night = document.body.classList.toggle("night");
  e.currentTarget.classList.toggle("on", night);
  e.currentTarget.textContent = night ? "🔦 Lights on" : "💡 Lights";
  if (night) toast("🌙 Lights out! Move your mouse/finger to use the flashlight.", 4000);
  earn("tool", "💡 Tool stamp earned!");
});

const dc = $("#doodle"), dctx = dc.getContext("2d");
function sizeDoodle() {
  const old = document.createElement("canvas");
  old.width = dc.width; old.height = dc.height;
  old.getContext("2d").drawImage(dc, 0, 0);
  dc.width = board.offsetWidth; dc.height = board.offsetHeight;
  dctx.drawImage(old, 0, 0);
}
new ResizeObserver(sizeDoodle).observe(board);
const inks = ["#e5484d", "#3b82f6", "#12b76a", "#7c3aed", "#f59e0b", "#111827"];
let pen = false, inkI = 0;
dc.addEventListener("pointerdown", e => {
  pen = true; dc.setPointerCapture(e.pointerId);
  const r = dc.getBoundingClientRect();
  dctx.strokeStyle = inks[inkI++ % inks.length];
  dctx.lineWidth = 5; dctx.lineCap = dctx.lineJoin = "round";
  dctx.beginPath(); dctx.moveTo(e.clientX - r.left, e.clientY - r.top);
});
dc.addEventListener("pointermove", e => {
  if (!pen) return;
  const r = dc.getBoundingClientRect();
  dctx.lineTo(e.clientX - r.left, e.clientY - r.top); dctx.stroke();
});
["pointerup", "pointercancel"].forEach(ev => dc.addEventListener(ev, () => (pen = false)));

$("#penBtn").addEventListener("click", e => {
  const on = document.body.classList.toggle("doodling");
  e.currentTarget.classList.toggle("on", on);
  e.currentTarget.textContent = on ? "✋ Stop doodling" : "✏️ Doodle";
  if (on) toast("✏️ Draw anywhere on the board! Every stroke gets a new color.", 3800);
  earn("tool", "✏️ Tool stamp earned!");
});
$("#clearBtn").addEventListener("click", () => dctx.clearRect(0, 0, dc.width, dc.height));

$("#scatterBtn").addEventListener("click", () => {
  $$(".piece").forEach(p =>
    setPos(p, Math.round((Math.random() - 0.5) * 120), Math.round((Math.random() - 0.5) * 90), Math.round((Math.random() - 0.5) * 18)));
  toast("🎲 Whoa, what a mess!", 2000);
});
$("#tidyBtn").addEventListener("click", () => {
  $$(".piece").forEach(p => setPos(p, 0, 0, p.dataset.r0));
  toast("🧲 All tidy again!", 2000);
});

/* ============ 45-second clock + friendly nudges (never blocks leaving) ============ */
let secs = 0;
setInterval(() => {
  secs++;
  const shown = Math.min(secs, 45);
  $("#clockNum").textContent = secs >= 45 ? "✓" : shown;
  $("#ringFg").style.strokeDashoffset = 94.25 * (1 - shown / 45);
  if (secs === 12 && got.size === 0) toast("💡 Psst! Try dragging a note or tap the polaroid.", 4000);
  if (secs === 25 && !scDone) toast("🪙 Have you scratched the silver card yet?", 4000);
  if (secs === 45) {
    $(".clock").classList.add("done");
    toast("🎉 45 seconds! Thanks for staying. Keep exploring, there's more!", 5000);
  }
}, 1000);

/* ============ Confetti ============ */
const cv = $("#confetti"), cx = cv.getContext("2d");
let bits = [], running = false;
function confetti() {
  cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#e5484d", "#3b82f6", "#12b76a", "#ffe066", "#ff5c9d", "#7c3aed"];
  for (let i = 0; i < 140; i++)
    bits.push({
      x: innerWidth / 2, y: innerHeight * 0.65,
      vx: (Math.random() - 0.5) * 18, vy: Math.random() * -16 - 3,
      s: Math.random() * 9 + 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
      c: cols[i % cols.length], life: 150
    });
  if (!running) { running = true; requestAnimationFrame(tick); }
}
function tick() {
  cx.clearRect(0, 0, cv.width, cv.height);
  bits = bits.filter(b => b.life > 0);
  bits.forEach(b => {
    b.vy += 0.38; b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.life--;
    cx.save(); cx.translate(b.x, b.y); cx.rotate(b.rot);
    cx.globalAlpha = Math.min(1, b.life / 40); cx.fillStyle = b.c;
    cx.fillRect(-b.s / 2, -b.s / 3, b.s, b.s * 0.6);
    cx.restore();
  });
  if (bits.length) requestAnimationFrame(tick);
  else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
}

/* Welcome */
setTimeout(() => toast("👋 Welcome to my desk! Everything here can be moved."), 1600);