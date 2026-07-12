import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createRecraftsArtifacts } from "./skill_core.mjs";

async function readOptional(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function run({ inputDir, outputDir }) {
  const artifactsDir = path.join(outputDir, "artifacts");
  await mkdir(artifactsDir, { recursive: true });

  const brand = await readOptional(path.join(inputDir, "brand.md"));
  const taste = await readOptional(path.join(inputDir, "workspace_taste.md"));
  const runId = "run_recrafts_standalone_mock";
  const artifacts = createRecraftsArtifacts({ brand, taste });

  await writeFile(path.join(artifactsDir, "design.md"), artifacts.designMd, "utf8");
  await writeJson(path.join(artifactsDir, "design_tokens.json"), artifacts.designTokens);
  await writeJson(path.join(artifactsDir, "layout_rules.json"), artifacts.layoutRules);
  await writeJson(path.join(artifactsDir, "components.json"), artifacts.components);
  await writeJson(path.join(artifactsDir, "template_patterns.json"), artifacts.templatePatterns);
  await writeFile(path.join(artifactsDir, "preview.html"), "<!doctype html><title>Recrafts Preview</title>\n", "utf8");

  const result = {
    skill_id: "recrafts",
    run_id: runId,
    status: "completed",
    artifacts: [
      "artifacts/design.md",
      "artifacts/design_tokens.json",
      "artifacts/layout_rules.json",
      "artifacts/components.json",
      "artifacts/template_patterns.json",
      "artifacts/preview.html",
    ],
  };
  const runLog = { run_id: runId, mode: "standalone_mock", inputDir, outputDir };

  await writeJson(path.join(outputDir, "result.json"), result);
  await writeJson(path.join(outputDir, "run_log.json"), runLog);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inputDir = process.argv[2] ?? "input";
  const outputDir = process.argv[3] ?? "output";
  run({ inputDir, outputDir }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
