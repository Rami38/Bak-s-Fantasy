const fs = require("fs");
const path = require("path");
const { createCanvas } = require("@napi-rs/canvas");

const NAVY = "#1B3A4B";
const GOLD = "#8C6A2F";
const INK = "#1A1A1A";
const MUTED = "#5C6B73";
const PAPER = "#F7F5F1";
const WHITE = "#FFFFFF";
const LINE = "#C5B48A";

const outDir = path.join(__dirname, "diagrams");
fs.mkdirSync(outDir, { recursive: true });

function canvas(w, h) {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, w, h);
  return { c, ctx };
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function label(ctx, text, x, y, w, opts = {}) {
  ctx.fillStyle = opts.color || INK;
  ctx.font = `${opts.bold ? "700 " : ""}${opts.size || 22}px Segoe UI`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > w - 24 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  const size = opts.size || 22;
  const start = y - ((lines.length - 1) * (size + 6)) / 2;
  lines.forEach((item, i) => ctx.fillText(item, x, start + i * (size + 6)));
}

function box(ctx, x, y, w, h, title, sub, fill) {
  roundRect(ctx, x, y, w, h, 12, fill || PAPER, NAVY);
  label(ctx, title, x + w / 2, y + (sub ? h / 2 - 16 : h / 2), w, {
    bold: true,
    size: 22,
    color: NAVY,
  });
  if (sub) {
    label(ctx, sub, x + w / 2, y + h / 2 + 18, w, { size: 16, color: MUTED });
  }
}

function arrow(ctx, x1, y1, x2, y2, text) {
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = GOLD;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = 12;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - len * Math.cos(angle - 0.4), y2 - len * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - len * Math.cos(angle + 0.4), y2 - len * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
  if (text) {
    label(ctx, text, (x1 + x2) / 2, (y1 + y2) / 2 - 16, 180, { size: 15, color: MUTED });
  }
}

function context() {
  const { c, ctx } = canvas(1400, 520);
  label(ctx, "C4 context", 700, 36, 600, { bold: true, size: 28, color: NAVY });
  box(ctx, 60, 170, 250, 150, "Manager", "Plays the season", WHITE);
  box(ctx, 520, 140, 360, 210, "Ligue 1 Fantasy", "Squads, scoring, and rivalry", "#E7EEF1");
  box(ctx, 1080, 170, 260, 150, "API-Football", "Free plan, fixtures and stats", WHITE);
  arrow(ctx, 310, 245, 520, 245, "Uses");
  arrow(ctx, 880, 245, 1080, 245, "Pulls match data");
  fs.writeFileSync(path.join(outDir, "c4-context.png"), c.toBuffer("image/png"));
}

function containers() {
  const { c, ctx } = canvas(1400, 760);
  label(ctx, "C4 containers", 700, 36, 600, { bold: true, size: 28, color: NAVY });
  box(ctx, 40, 300, 200, 130, "Manager", "", WHITE);
  box(ctx, 340, 120, 250, 130, "Web app", "Browser screens", WHITE);
  box(ctx, 700, 120, 280, 130, "API", "Modular monolith", "#E7EEF1");
  box(ctx, 700, 340, 280, 130, "Worker", "Same codebase", "#E7EEF1");
  box(ctx, 1100, 120, 250, 130, "Postgres", "One database", WHITE);
  box(ctx, 1100, 470, 250, 150, "API-Football", "Free plan", WHITE);
  arrow(ctx, 240, 365, 340, 185, "");
  arrow(ctx, 590, 185, 700, 185, "");
  arrow(ctx, 980, 185, 1100, 185, "");
  arrow(ctx, 980, 405, 1100, 220, "");
  arrow(ctx, 980, 430, 1100, 520, "");
  label(ctx, "One codebase. The worker is a second process, not a second product.", 700, 710, 1100, {
    size: 18,
    color: MUTED,
  });
  fs.writeFileSync(path.join(outDir, "c4-containers.png"), c.toBuffer("image/png"));
}

function ellipse(ctx, x, y, rx, ry, title) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2;
  ctx.stroke();
  label(ctx, title, x, y, rx * 2 - 10, { size: 16, bold: true, color: NAVY });
}

function useCases() {
  const { c, ctx } = canvas(980, 1180);
  label(ctx, "Use cases", 490, 36, 600, { bold: true, size: 28, color: NAVY });
  const managerCases = [
    "Create an account",
    "Set the squad",
    "Set the lineup",
    "Join a league",
    "Play rivalry",
    "Read the breakdown",
  ];
  const workerCases = ["Import match stats", "Resolve rivalry", "Score the gameweek", "Correct a stat"];
  box(ctx, 40, 300, 180, 110, "Manager", "", WHITE);
  managerCases.forEach((title, i) => {
    const y = 120 + i * 110;
    ellipse(ctx, 620, y, 170, 42, title);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(220, 355);
    ctx.lineTo(450, y);
    ctx.stroke();
  });
  box(ctx, 40, 900, 180, 110, "Worker", "", WHITE);
  workerCases.forEach((title, i) => {
    const y = 820 + i * 100;
    ellipse(ctx, 620, y, 170, 42, title);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(220, 955);
    ctx.lineTo(450, y);
    ctx.stroke();
  });
  fs.writeFileSync(path.join(outDir, "use-cases.png"), c.toBuffer("image/png"));
}

context();
containers();
useCases();
console.log("diagrams written");
