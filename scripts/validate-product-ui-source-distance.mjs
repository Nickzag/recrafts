#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateProductUISourceDistance } from "../runtime/product_ui_contract.mjs";
const root = process.argv[2] ?? "examples/golden-candidates/craft-product-ui-r011/candidate";
const report = JSON.parse(await readFile(`${root}/source-distance-report.json`, "utf8"));
const errors = validateProductUISourceDistance(report);
console.log(JSON.stringify({ status: errors.length ? "fail" : "pass", errors }, null, 2));
if (errors.length) process.exitCode = 1;
