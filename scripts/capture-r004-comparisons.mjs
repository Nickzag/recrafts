import { execFileSync, spawn } from "node:child_process";
import { cp, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(process.argv[2] ?? "examples/golden-candidates/crafts-ui-multi-image/fidelity/r004-v2");
const corrected = path.join(directory, "corrections/corrected-realization/r004-v1");
execFileSync(process.execPath, [path.resolve("scripts/capture-r003-previews.mjs"), corrected], { stdio: "inherit" });
await cp(path.join(corrected, "preview/screenshots/component-gallery-1440x900.png"), path.join(directory, "comparison/overlays/component-gallery-after-1440x900.png"));
await writeFile(path.join(directory, "comparison/callouts/component-gallery-density.md"), "# Component Gallery Density Callout\n\nThe corrected renderer reduces row padding from 26px to 18px, state-stage minimum height from 96px to 72px and state-stage padding from 18px to 12px. Component contracts, states and tokens are unchanged.\n");
await writeFile(path.join(directory, "comparison/overlays/component-gallery-density.html"), `<!doctype html><meta charset="utf-8"><title>R-004 Before / After</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#f2f1ef;color:#20201e;font:14px system-ui}.head{display:flex;justify-content:space-between;align-items:end;margin-bottom:18px}h1{margin:0;font-size:30px}p{margin:4px 0;color:#6f6e69}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{position:relative;overflow:hidden;border:1px solid rgba(32,32,30,.12);border-radius:14px;background:white}.label{position:absolute;z-index:2;top:12px;left:12px;padding:6px 9px;border-radius:7px;background:#20201e;color:white;font-weight:650}.panel img{display:block;width:100%}.callout{position:absolute;z-index:2;left:29%;right:4%;top:29%;height:23%;border:3px solid #3478f6;border-radius:10px}.note{margin-top:16px;padding:12px 14px;border-radius:10px;background:#e8f0ff;color:#1f56a8}</style><div class="head"><div><p>R-004 · bounded visual evidence</p><h1>Component Gallery density correction</h1></div><p>1440×900 · no pixel score</p></div><div class="grid"><div class="panel"><span class="label">Before</span><img src="../before/component-gallery-1440x900.png"><span class="callout"></span></div><div class="panel"><span class="label">After</span><img src="../../corrections/corrected-realization/r004-v1/preview/screenshots/component-gallery-1440x900.png"><span class="callout"></span></div></div><div class="note">Renderer-layer correction: 18px row padding · 72px stage minimum · 12px stage padding. Tokens, inventory and provenance preserved.</div>`);

const cli = path.join(process.env.HOME, ".codex/skills/playwright/scripts/playwright_cli.sh");
const session = `r004-${process.pid}`;
const port = 42000 + (process.pid % 1000);
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", directory], { stdio: "ignore" });
const run = (...args) => execFileSync(cli, [`-s=${session}`, ...args], { stdio: "pipe" });
try {
  await new Promise((resolve) => setTimeout(resolve, 500));
  run("open", `http://127.0.0.1:${port}/comparison/overlays/component-gallery-density.html`);
  run("resize", "1800", "1080");
  run("screenshot", `--filename=${path.join(directory, "comparison/diff-contact-sheet.png")}`);
} finally {
  try { run("close"); } catch {}
  server.kill("SIGTERM");
}
process.stdout.write("R-004 comparison evidence captured\n");
