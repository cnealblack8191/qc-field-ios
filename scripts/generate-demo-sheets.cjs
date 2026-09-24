/*
 * Draws the demo drawing sheets in assets/demo/ from src/demo/sheets.json, so
 * the device symbols on the sheet sit exactly under the demo pins.
 *
 * sharp is not an app dependency. Run with a throwaway copy:
 *   npm i --prefix /tmp/sharp sharp
 *   NODE_PATH=/tmp/sharp/node_modules node scripts/generate-demo-sheets.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const spec = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/demo/sheets.json"), "utf8"));
const W = spec.width;
const H = spec.height;
const X = (value) => (value * W).toFixed(1);
const Y = (value) => (value * H).toFixed(1);

function wallsFor(rooms) {
  // Each room outline is drawn as a thick CMU wall; shared walls overdraw.
  return rooms
    .map((room) => `<rect x="${X(room.x0)}" y="${Y(room.y0)}" width="${X(room.x1 - room.x0)}" height="${Y(room.y1 - room.y0)}" />`)
    .join("");
}

function labelsFor(rooms) {
  return rooms
    .map((room) => {
      const cx = X((room.x0 + room.x1) / 2);
      const cy = Y((room.y0 + room.y1) / 2);
      return `<text x="${cx}" y="${cy}" text-anchor="middle" class="room">${room.name}</text>`;
    })
    .join("");
}

function doorsFor(rooms) {
  // A door swing on each room's corridor wall, offset from the centre.
  return rooms
    .filter((room) => !room.name.startsWith("CORRIDOR"))
    .map((room) => {
      const onTop = room.y0 >= 0.5;
      const wallY = onTop ? room.y0 : room.y1;
      const x = room.x0 + (room.x1 - room.x0) * 0.72;
      const r = 0.035 * W;
      const px = Number(X(x));
      const py = Number(Y(wallY));
      const dir = onTop ? 1 : -1;
      return `<rect x="${px - 2}" y="${py - 8}" width="${r + 4}" height="16" fill="#fff" stroke="none"/>
        <line x1="${px}" y1="${py}" x2="${px}" y2="${py + dir * r}" class="door"/>
        <path d="M ${px} ${py + dir * r} A ${r} ${r} 0 0 ${onTop ? 0 : 1} ${px + r} ${py}" class="swing"/>`;
    })
    .join("");
}

function devicesFor(pins) {
  return pins
    .map((pin) => {
      const x = X(pin.x);
      const y = Y(pin.y);
      const glyph = pin.device.startsWith("Receptacle")
        ? `<circle cx="${x}" cy="${y}" r="11" class="dev"/><line x1="${Number(x) - 6}" y1="${Number(y) - 4}" x2="${Number(x) + 6}" y2="${Number(y) - 4}" class="dev"/><line x1="${Number(x) - 6}" y1="${Number(y) + 4}" x2="${Number(x) + 6}" y2="${Number(y) + 4}" class="dev"/>`
        : pin.device.startsWith("Switch")
          ? `<text x="${x}" y="${Number(y) + 7}" text-anchor="middle" class="sym">S</text>`
          : pin.device.startsWith("Data")
            ? `<polygon points="${x},${Number(y) - 12} ${Number(x) + 12},${Number(y) + 9} ${Number(x) - 12},${Number(y) + 9}" class="dev"/>`
            : `<rect x="${Number(x) - 10}" y="${Number(y) - 10}" width="20" height="20" class="dev"/>`;
      return `<g>${glyph}</g>`;
    })
    .join("");
}

function gridFor() {
  const cols = ["1", "2", "3", "4", "5"];
  const rows = ["A", "B", "C", "D"];
  const colX = [0.05, 0.25, 0.45, 0.58, 0.78];
  const rowY = [0.08, 0.44, 0.54, 0.90];
  const lines = [];
  colX.forEach((x, index) => {
    lines.push(`<line x1="${X(x)}" y1="${Y(0.035)}" x2="${X(x)}" y2="${Y(0.94)}" class="grid"/>`);
    lines.push(`<circle cx="${X(x)}" cy="${Y(0.03)}" r="18" class="bubble"/><text x="${X(x)}" y="${Number(Y(0.03)) + 7}" text-anchor="middle" class="bubbleText">${cols[index]}</text>`);
  });
  rowY.forEach((y, index) => {
    lines.push(`<line x1="${X(0.015)}" y1="${Y(y)}" x2="${X(0.8)}" y2="${Y(y)}" class="grid"/>`);
    lines.push(`<circle cx="${X(0.015)}" cy="${Y(y)}" r="18" class="bubble"/><text x="${X(0.015)}" y="${Number(Y(y)) + 7}" text-anchor="middle" class="bubbleText">${rows[index]}</text>`);
  });
  return lines.join("");
}

function titleBlock(sheet) {
  const x = 0.82 * W;
  return `
    <rect x="${x}" y="20" width="${W - x - 20}" height="${H - 40}" fill="#fff" stroke="#111" stroke-width="3"/>
    <text x="${x + 24}" y="80" class="tbBrand">ECI</text>
    <text x="${x + 24}" y="112" class="tbSmall">ELECTRICAL CONTRACTORS</text>
    <line x1="${x}" y1="140" x2="${W - 20}" y2="140" stroke="#111" stroke-width="2"/>
    <text x="${x + 24}" y="180" class="tbSmall">PROJECT</text>
    <text x="${x + 24}" y="212" class="tbText">OAK RIDGE ELEMENTARY</text>
    <text x="${x + 24}" y="240" class="tbSmall">ORE-26033 · KNOXVILLE, TN</text>
    <line x1="${x}" y1="270" x2="${W - 20}" y2="270" stroke="#111" stroke-width="2"/>
    <text x="${x + 24}" y="310" class="tbSmall">SHEET TITLE</text>
    <text x="${x + 24}" y="344" class="tbText">${sheet.title.toUpperCase()}</text>
    <text x="${x + 24}" y="372" class="tbSmall">MASONRY ROUGH-IN · 1/8" = 1'-0"</text>
    <line x1="${x}" y1="${H - 260}" x2="${W - 20}" y2="${H - 260}" stroke="#111" stroke-width="2"/>
    <text x="${x + 24}" y="${H - 220}" class="tbSmall">REVISION</text>
    <text x="${x + 24}" y="${H - 186}" class="tbText">REV ${sheet.revision}</text>
    <text x="${x + 24}" y="${H - 110}" class="tbSmall">SHEET</text>
    <text x="${x + 24}" y="${H - 44}" class="tbSheet">${sheet.sheetNumber}</text>`;
}

function svgFor(sheet) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="cmu" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="14" stroke="#555" stroke-width="2"/>
    </pattern>
    <style>
      .room { font: 600 22px Helvetica, Arial, sans-serif; fill: #333; letter-spacing: 1px; }
      .grid { stroke: #9aa4af; stroke-width: 1.5; stroke-dasharray: 18 6 4 6; }
      .bubble { fill: #fff; stroke: #333; stroke-width: 2; }
      .bubbleText { font: 700 20px Helvetica, Arial, sans-serif; fill: #333; }
      .door { stroke: #333; stroke-width: 3; }
      .swing { fill: none; stroke: #666; stroke-width: 1.5; stroke-dasharray: 6 4; }
      .dev { fill: #fff; stroke: #0d47a1; stroke-width: 3; }
      .sym { font: 800 24px Helvetica, Arial, sans-serif; fill: #0d47a1; }
      .tbBrand { font: 800 44px Helvetica, Arial, sans-serif; fill: #c2261c; }
      .tbSmall { font: 600 15px Helvetica, Arial, sans-serif; fill: #555; letter-spacing: 1px; }
      .tbText { font: 700 19px Helvetica, Arial, sans-serif; fill: #111; }
      .tbSheet { font: 800 64px Helvetica, Arial, sans-serif; fill: #111; }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="#fbfbf8"/>
  ${gridFor()}
  <g fill="none" stroke="url(#cmu)" stroke-width="16">${wallsFor(sheet.rooms)}</g>
  <g fill="none" stroke="#222" stroke-width="2">${wallsFor(sheet.rooms)}</g>
  ${doorsFor(sheet.rooms)}
  ${labelsFor(sheet.rooms)}
  ${devicesFor(sheet.pins)}
  ${titleBlock(sheet)}
</svg>`;
}

(async () => {
  const outDir = path.join(__dirname, "../assets/demo");
  fs.mkdirSync(outDir, { recursive: true });
  for (const sheet of spec.sheets) {
    await sharp(Buffer.from(svgFor(sheet))).png({ compressionLevel: 9, palette: true }).toFile(path.join(outDir, sheet.image));
    console.log("wrote", sheet.image);
  }
})();
