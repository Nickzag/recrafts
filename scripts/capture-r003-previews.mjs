import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cli = path.join(process.env.HOME, ".codex/skills/playwright/scripts/playwright_cli.sh");
const run = (session, ...args) => execFileSync(cli, [`-s=${session}`, ...args], { stdio: "pipe", encoding: "utf8" });
const sha256 = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");

const directory = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!directory) throw new Error("Usage: node scripts/capture-r003-previews.mjs <realization-dir>");
const session = `r003b-${process.pid}`;
const output = path.join(directory, "preview/screenshots");
const port = 41000 + (process.pid % 1000);
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", directory], { stdio: "ignore" });
const captures = [
  ["system-board.html", 1440, 900, "system-board-1440x900.png"],
  ["component-gallery.html", 1440, 900, "component-gallery-1440x900.png"],
  ["surface-preview.html", 2048, 1280, "surface-preview-2048x1280.png"],
  ["surface-preview.html", 1440, 900, "surface-preview-1440x900.png"],
  ["surface-preview.html", 1280, 800, "surface-preview-1280x800.png"],
];

try {
  await new Promise((resolve) => setTimeout(resolve, 500));
  run(session, "open", `http://127.0.0.1:${port}/preview/index.html`);
  for (const [page, width, height, filename] of captures) {
    run(session, "resize", String(width), String(height));
    run(session, "goto", `http://127.0.0.1:${port}/preview/${page}`);
    run(session, "screenshot", `--filename=${path.join(output, filename)}`);
  }
} finally {
  try { run(session, "close"); } catch {}
  server.kill("SIGTERM");
}

const screenshots = await Promise.all(captures.map(async ([page, width, height, filename]) => ({ page, viewport: `${width}x${height}`, file: `preview/screenshots/${filename}`, sha256: await sha256(path.join(output, filename)) })));
const manifestFile = path.join(directory, "realization.json");
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
manifest.status = "generated-awaiting-owner-visual-review";
manifest.screenshots = screenshots;
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(screenshots, null, 2)}\n`);
