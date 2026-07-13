import { readFile } from "node:fs/promises";
import path from "node:path";

const CSS_FILES = ["tokens.css", "base.css", "components.css", "surfaces.css"];
const DIRECT_VALUE = /(?:#[0-9a-f]{3,8}|rgba?\(|\b\d+(?:\.\d+)?px\b)/gi;

export async function checkTokenCompliance(realizationDirectory) {
  const runtime = path.join(realizationDirectory, "preview/runtime");
  const contract = JSON.parse(await readFile(path.join(runtime, "compiled-contract.json"), "utf8"));
  const allowed = new Set([
    ...contract.token_variables.map(({ value }) => String(value)),
    ...contract.preview_fallbacks.map(({ value }) => String(value)),
  ]);
  const violations = [];
  for (const file of CSS_FILES) {
    const css = await readFile(path.join(runtime, file), "utf8");
    for (const match of css.matchAll(DIRECT_VALUE)) {
      const value = match[0];
      const line = css.slice(0, match.index).split("\n").length;
      const declaration = css.slice(css.lastIndexOf("\n", match.index) + 1, css.indexOf("\n", match.index));
      const isInventory = file === "tokens.css" && declaration.trimStart().startsWith("--");
      if (!isInventory && !allowed.has(value) && !declaration.includes("var(")) violations.push({ file, line, value, declaration: declaration.trim() });
    }
  }
  return { status: violations.length ? "failed" : "passed", allowed_preview_fallbacks: contract.preview_fallbacks.map(({ variable }) => variable), violations };
}

if (process.argv[1]?.endsWith("check-r003-token-compliance.mjs")) {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: node scripts/check-r003-token-compliance.mjs <realization-dir>");
  const result = await checkTokenCompliance(path.resolve(directory));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "passed") process.exitCode = 1;
}
