#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateApplicationGrammar } from "../runtime/product_ui_contract.mjs";
const root = process.argv[2] ?? "examples/golden-candidates/craft-product-ui-r011/candidate";
const read = async (file) => JSON.parse(await readFile(`${root}/${file}`, "utf8"));
const evidence = await read("analysis/evidence-bundle.json");
const errors = validateApplicationGrammar(await read("application-grammar.json"), new Set(evidence.evidence.map((item) => item.evidence_id)));
console.log(JSON.stringify({ status: errors.length ? "fail" : "pass", errors }, null, 2));
if (errors.length) process.exitCode = 1;
