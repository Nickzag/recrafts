import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadExtractionPackage } from "../realization/package_loader.mjs";
import { evaluateRealizationPreflight } from "../realization/preflight.mjs";

const [packageDirectory, metricsFile, reviewFile, outputFile] = process.argv.slice(2);
if (!packageDirectory || !metricsFile || !reviewFile || !outputFile) throw new Error("Usage: node scripts/run-r003-preflight.mjs <package-dir> <metrics.json> <review.md> <output.json>");
const packageData = await loadExtractionPackage(packageDirectory);
const metrics = JSON.parse(await readFile(metricsFile, "utf8"));
const review = await readFile(reviewFile, "utf8");
const verdict = review.match(/^Verdict:\s*(PASS WITH CHANGES|PASS|REWORK)/m)?.[1] ?? "PENDING";
const result = evaluateRealizationPreflight({ packageData, metrics, ownerReview: { verdict } });
await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify({ ...result, package_id: packageData.manifest.package_id, owner_review_verdict: verdict }, null, 2)}\n`);
console.log(JSON.stringify(result));
if (result.status === "blocked") process.exitCode = 2;
