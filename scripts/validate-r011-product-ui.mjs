#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  validateApplicationGrammar,
  validateComponentRecurrence,
  validateProductPreviewCoverage,
  validateProductUISourceDistance,
  validateProductUISourceScope,
  validateProductUIPackage,
  validateStateMatrix
} from "../runtime/product_ui_contract.mjs";

const packageDirectory = process.argv[2] ?? "examples/golden-candidates/craft-product-ui-r011/candidate";
const read = async (file) => JSON.parse(await readFile(path.join(packageDirectory, file), "utf8"));
const errors = [];
const add = (name, found) => errors.push(...found.map((error) => ({ validator: name, ...error })));
const evidence = await read("analysis/evidence-bundle.json");
const refs = new Set((evidence.evidence ?? []).map((item) => item.evidence_id));
add("validate-product-ui-source-scope", validateProductUISourceScope(await read("source-scope-map.json"), refs));
add("validate-application-grammar", validateApplicationGrammar(await read("application-grammar.json"), refs));
add("validate-state-matrix", validateStateMatrix(await read("state-matrix.json"), refs));
const components = await read("components.json");
add("validate-component-recurrence", validateComponentRecurrence(components.contracts, components.recurrence, refs));
add("validate-product-ui-source-distance", validateProductUISourceDistance(await read("source-distance-report.json")));
const requiredSurfaces = (await read("preview-coverage.json")).required_surfaces ?? [];
add("validate-product-preview-coverage", validateProductPreviewCoverage(await read("preview-coverage.json"), { requiredSurfaces }));
const packageResult = await validateProductUIPackage(packageDirectory, { requiredSurfaces });
add("validate-product-ui-package", packageResult.errors);

let files = [];
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full); else if (/\.(json|md|html|css|js|mjs|txt)$/i.test(entry.name)) files.push(full);
  }
};
await walk(packageDirectory);
const forbidden = /Quiet Workbench|Task[- ]?025(?:R)?|R-025|dev-workflow\/review-packets/i;
for (const file of files) {
  const content = await readFile(file, "utf8");
  if (forbidden.test(content)) errors.push({ validator: "validate-no-oracle-product-ui", code: "FORBIDDEN_ORACLE_REFERENCE", message: `Candidate contains forbidden downstream/oracle reference: ${path.relative(packageDirectory, file)}` });
}
const packageManifest = await read("recrafts-package.json");
if (packageManifest.status !== "awaiting-owner-review" || packageManifest.decision_status !== "pending") errors.push({ validator: "validate-no-owner-pass", code: "OWNER_GATE_PREMATURE", message: "R-011 candidate must remain awaiting-owner-review with a pending decision" });
const result = { status: errors.length ? "fail" : "pass", package_directory: packageDirectory, package_id: packageManifest.package_id, validators: [...new Set(errors.map((error) => error.validator))], errors };
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
