#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { buildNoOracleReport } from "../runtime/analysis_input_audit.mjs";

const [configFile, output] = process.argv.slice(2);
if (!configFile || !output) throw new Error("Usage: build-r010-no-oracle-report <config.json> <output.json>");
const result = await buildNoOracleReport(JSON.parse(await readFile(configFile, "utf8")));
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
