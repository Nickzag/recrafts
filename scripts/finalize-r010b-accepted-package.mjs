#!/usr/bin/env node
import { access } from "node:fs/promises";
import path from "node:path";
import { acceptArtifacts } from "../runtime/package_evolution.mjs";

const [runRoot, candidatePackageId, decisionFileName, outputPackageId] = process.argv.slice(2);
if (!runRoot || !candidatePackageId || !decisionFileName || !outputPackageId) {
  throw new Error("Usage: finalize-r010b-accepted-package <run-root> <candidate-package-id> <decision-file> <output-package-id>");
}

const candidatePackageDirectory = path.join(runRoot, "packages", candidatePackageId);
const decisionFile = path.join(runRoot, "review", decisionFileName);
const outputDirectory = path.join(runRoot, "packages", outputPackageId);
await access(candidatePackageDirectory);
await access(decisionFile);
try {
  await access(outputDirectory);
  throw new Error(`Refusing to overwrite existing Package directory: ${outputDirectory}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const result = await acceptArtifacts({ candidatePackageDirectory, decisionFile, outputDirectory });
if (result.package_id !== outputPackageId) throw new Error(`Output directory does not match derived Package ID: ${result.package_id}`);
process.stdout.write(`${JSON.stringify({ ...result, output_directory: outputDirectory }, null, 2)}\n`);
