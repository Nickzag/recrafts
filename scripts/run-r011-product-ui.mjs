#!/usr/bin/env node
import { spawn } from "node:child_process";
import { buildProductUIContract, validateProductUIPackage } from "../runtime/product_ui_contract.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index].startsWith("--")) args.set(process.argv[index].slice(2), process.argv[index + 1]);
}
const preparedDirectory = args.get("prepared") ?? "/private/tmp/craftdo-r011-prepared";
const hostAnalysisFile = args.get("host") ?? "/private/tmp/craftdo-r011-host-analysis.json";
const outputDirectory = args.get("output") ?? "examples/golden-candidates/craft-product-ui-r011/candidate";
const built = await buildProductUIContract({ preparedDirectory, hostAnalysisFile, outputDirectory });
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["scripts/generate-r011-previews.mjs", "--output", outputDirectory], { stdio: "inherit" });
  child.on("error", reject); child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Preview generation exited with ${code}`)));
});
const coverage = JSON.parse(await (await import("node:fs/promises")).readFile(`${outputDirectory}/preview-coverage.json`, "utf8"));
const result = await validateProductUIPackage(outputDirectory, { requiredSurfaces: coverage.required_surfaces });
console.log(JSON.stringify({ built, package_validation: result }, null, 2));
if (result.status !== "pass") process.exitCode = 1;
