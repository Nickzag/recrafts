#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { validatePreviewAccessibility } from "../runtime/preview_accessibility.mjs";

const [input, output] = process.argv.slice(2);
if (!input) throw new Error("Usage: validate-preview-accessibility <input.json> [output.json]");
const request = JSON.parse(await readFile(input, "utf8"));
if (request.html_file) request.html = await readFile(request.html_file, "utf8");
const result = validatePreviewAccessibility(request);
if (output) await writeFile(output, `${JSON.stringify(result, null, 2)}\n`); else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
