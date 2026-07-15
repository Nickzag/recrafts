#!/usr/bin/env node
import path from "node:path";
import { validateSourcePackStability } from "./r009a-core.mjs";

const [corpus = "benchmarks/L2-brand/static-coffee-static", sourcePack = ".local-benchmark-sources/static-coffee-static-v1", originalCorpus = "benchmarks/L2-brand/static-coffee"] = process.argv.slice(2);
const result = validateSourcePackStability({
  repositoryRoot: process.cwd(),
  corpusRoot: path.resolve(corpus),
  sourcePackRoot: path.resolve(sourcePack),
  originalCorpusRoot: path.resolve(originalCorpus),
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
