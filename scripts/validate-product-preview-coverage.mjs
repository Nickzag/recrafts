#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { validateProductPreviewCoverage } from "../runtime/product_ui_contract.mjs";
const root = process.argv[2] ?? "examples/golden-candidates/craft-product-ui-r011/candidate";
const coverage = JSON.parse(await readFile(`${root}/preview-coverage.json`, "utf8"));
const errors = validateProductPreviewCoverage(coverage, { requiredSurfaces: coverage.required_surfaces, requiredDirections: coverage.required_directions });
console.log(JSON.stringify({ status: errors.length ? "fail" : "pass", preview_count: coverage.previews?.length ?? 0, errors }, null, 2));
if (errors.length) process.exitCode = 1;
