#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { scanIdentitySafety } from "../runtime/identity_safety.mjs";

const [root, configFile, output] = process.argv.slice(2);
if (!root) throw new Error("Usage: validate-identity-safety <root> [config.json] [output.json]");
const config = configFile ? JSON.parse(await readFile(configFile, "utf8")) : {};
const result = await scanIdentitySafety(root, config);
if (output) await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
