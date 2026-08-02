#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const root = process.argv[2] ?? "examples/golden-candidates/craft-product-ui-r011/candidate";
const forbidden = /Quiet Workbench|Task[- ]?025(?:R)?|R-025|dev-workflow\/review-packets/i;
const files = [];
const walk = async (directory) => { for (const entry of await readdir(directory, { withFileTypes: true })) { const full = path.join(directory, entry.name); if (entry.isDirectory()) await walk(full); else if (/\.(json|md|html|css|js|mjs|txt)$/i.test(entry.name)) files.push(full); } };
await walk(root);
const errors = [];
for (const file of files) if (forbidden.test(await readFile(file, "utf8"))) errors.push({ code: "FORBIDDEN_ORACLE_REFERENCE", path: path.relative(root, file) });
console.log(JSON.stringify({ status: errors.length ? "fail" : "pass", errors }, null, 2));
if (errors.length) process.exitCode = 1;
