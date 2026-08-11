#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateLinuxEvidence } from "../runtime/r012_linux_evidence.mjs";
const file = process.argv[2];
if (!file) throw new Error("Usage: validate-r012-linux-evidence.mjs <evidence.json>");
process.stdout.write(`${JSON.stringify(validateLinuxEvidence(JSON.parse(await readFile(file, "utf8"))), null, 2)}\n`);

