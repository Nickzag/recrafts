#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { validatePreviewCoverage } from "../runtime/preview_accessibility.mjs";

const [input, output] = process.argv.slice(2);
if (!input) throw new Error("Usage: validate-preview-coverage <input.json> [output.json]");
const result = validatePreviewCoverage(JSON.parse(await readFile(input, "utf8")));
if (output) await writeFile(output, `${JSON.stringify(result, null, 2)}\n`); else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
