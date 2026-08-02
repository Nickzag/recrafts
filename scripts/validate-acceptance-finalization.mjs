#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { validateAcceptanceFinalization } from "../runtime/acceptance_finalization.mjs";

const [packageDirectory, metadataOutput, authorityOutput] = process.argv.slice(2);
if (!packageDirectory) throw new Error("Usage: validate-acceptance-finalization <package-directory> [metadata-output.json] [authority-output.json]");
const result = await validateAcceptanceFinalization(packageDirectory);
if (metadataOutput) await writeFile(metadataOutput, `${JSON.stringify(result.metadata_consistency, null, 2)}\n`);
if (authorityOutput) await writeFile(authorityOutput, `${JSON.stringify(result.validation_authority, null, 2)}\n`);
if (!metadataOutput && !authorityOutput) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== "pass") process.exitCode = 1;
