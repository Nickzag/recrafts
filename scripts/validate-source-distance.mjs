#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { assessSourceDistance } from "../runtime/source_distance.mjs";

const [input, output] = process.argv.slice(2);
if (!input) throw new Error("Usage: validate-source-distance <input.json> [output.json]");
const result = assessSourceDistance(JSON.parse(await readFile(input, "utf8")));
if (output) await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.gate_status !== "pass") process.exitCode = 1;
