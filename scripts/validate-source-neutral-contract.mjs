#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateSourceNeutralArtifactSet } from "../runtime/source_neutral_contract.mjs";

const [packageDirectory, output] = process.argv.slice(2);
if (!packageDirectory) throw new Error("Usage: validate-source-neutral-contract <package-directory> [output.json]");
const read = async (name) => JSON.parse(await readFile(path.join(packageDirectory, name), "utf8"));
const [observed, grammar, tokens, themes, components, delivery] = await Promise.all([read("source-observations.json"),read("core-grammar.json"),read("tokens.json"),read("themes.json"),read("components.json"),read("delivery-readiness.json")]);
const result = validateSourceNeutralArtifactSet({source_observations:observed.observations,core_grammar:grammar,tokens:tokens.tokens,themes:themes.themes,components:components.components,delivery});
if (output) await writeFile(output, `${JSON.stringify(result, null, 2)}\n`); else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.errors.length) process.exitCode = 1;
