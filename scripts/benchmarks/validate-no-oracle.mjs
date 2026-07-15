#!/usr/bin/env node
import path from "node:path";
import { validateNoOracle } from "./benchmark-core.mjs";

const corpus = path.resolve(process.argv[2] ?? "benchmarks/L2-brand/static-coffee");
const result = validateNoOracle(corpus);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
