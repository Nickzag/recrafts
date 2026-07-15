#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [runFile, automaticFile, humanFile, outputFile] = process.argv.slice(2);
if (!runFile || !automaticFile || !humanFile || !outputFile) throw new Error("Usage: generate-benchmark-report <run.json> <automatic.json> <human.json> <review-summary.md>");
const run = JSON.parse(readFileSync(path.resolve(runFile), "utf8"));
const automatic = JSON.parse(readFileSync(path.resolve(automaticFile), "utf8"));
const human = JSON.parse(readFileSync(path.resolve(humanFile), "utf8"));
const report = `# Benchmark Review Summary\n\n- Run: \`${run.run_id}\`\n- Corpus: \`${run.corpus_id}\`\n- Runtime: \`${run.runtime?.version ?? "unavailable"}\`\n- Source Pack: \`${run.source_pack_id}\`\n- Automatic status: \`${automatic.status}\`\n- Automatic score: \`${automatic.score}/${automatic.maximum_score}\`\n- Hard gates: \`${automatic.hard_gates?.status}\`\n- Human review: \`${human.status}\`\n- Corpus promotion: \`candidate pending project-owner review\`\n\nAutomatic mechanisms and their Evidence are recorded in \`automatic-score.json\`; this summary does not replace the human scorecard.\n`;
writeFileSync(path.resolve(outputFile), report);
process.stdout.write(report);
