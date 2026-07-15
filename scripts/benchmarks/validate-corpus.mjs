#!/usr/bin/env node
import path from "node:path";
import { validateCorpus } from "./benchmark-core.mjs";

const [repository = ".", corpus = "benchmarks/L2-brand/static-coffee", sourcePack = ".local-benchmark-sources/static-coffee-v1"] = process.argv.slice(2);
const result = validateCorpus({ repositoryRoot: path.resolve(repository), corpusRoot: path.resolve(corpus), sourcePackRoot: path.resolve(sourcePack) });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
