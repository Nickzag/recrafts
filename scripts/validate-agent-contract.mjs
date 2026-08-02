#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { validateAgentContract } from "../runtime/agent_contract.mjs";

const [input, output] = process.argv.slice(2);
if (!input) throw new Error("Usage: validate-agent-contract <input.json> [output.json]");
const result = validateAgentContract(JSON.parse(await readFile(input, "utf8")));
if (output) await writeFile(output, `${JSON.stringify(result, null, 2)}\n`); else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
