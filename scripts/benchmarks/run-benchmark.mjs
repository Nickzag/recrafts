#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { validateBenchmarkRun } from "./benchmark-core.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const relative = (root, file) => path.relative(root, file).split(path.sep).join("/");

export function toInteropHost(host = {}) {
  const normalized = {
    agent: host.agent,
    engine: host.engine,
    capabilities: Array.isArray(host.capabilities) ? host.capabilities : [],
  };
  if (host.extensions !== undefined) normalized.extensions = host.extensions;
  return normalized;
}

function invokeInstalled(binary, request) {
  const execution = spawnSync(binary, [], { input: JSON.stringify(request), encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  let response;
  try { response = JSON.parse(execution.stdout); } catch { throw new Error(`installed recraft-interop returned invalid JSON: ${execution.stderr || execution.stdout}`); }
  if (execution.status !== 0 || response.status === "failed") throw new Error(`installed recraft-interop failed: ${response.error?.code ?? execution.status} ${response.error?.message ?? execution.stderr}`);
  return response;
}

export function runBenchmark(config) {
  const repositoryRoot = path.resolve(config.repository_root);
  const workingRoot = path.resolve(config.working_root);
  const sourcePackRoot = path.resolve(config.source_pack_root);
  const executionRoot = path.resolve(config.execution_root);
  const runRoot = path.resolve(config.run_root);
  const installedManifest = json(path.resolve(config.installed_package_manifest));
  const recraftInterop = path.resolve(config.recraft_interop_bin);
  const interopHost = toInteropHost(config.host);
  const auditHost = {
    agent: interopHost.agent,
    engine: interopHost.engine,
    vision_capability: interopHost.capabilities.includes("vision"),
    capabilities: interopHost.capabilities,
  };
  if (installedManifest.name !== "recrafts" || installedManifest.version !== config.expected_runtime_version) throw new Error("installed Recrafts package identity mismatch");
  if (!recraftInterop.includes(`${path.sep}node_modules${path.sep}.bin${path.sep}`) || recraftInterop.startsWith(path.join(repositoryRoot, "runtime"))) throw new Error("benchmark must invoke an installed recraft-interop binary");
  if (!existsSync(recraftInterop)) throw new Error("installed recraft-interop binary is missing");
  mkdirSync(executionRoot, { recursive: true });
  mkdirSync(runRoot, { recursive: true });
  const sourcePack = json(path.join(sourcePackRoot, "source-pack.json"));
  const sources = sourcePack.files.filter((item) => item.analysis_source !== false && /\.(?:png|jpe?g|webp|gif)$/i.test(item.path)).map((item) => relative(workingRoot, path.join(sourcePackRoot, item.path)));
  if (!sources.length) throw new Error("Source Pack contains no visual sources");
  const prepared = path.join(executionRoot, "prepared");
  if (!existsSync(prepared)) {
    const prepareRequest = { protocol_version: "1.1", request_id: `${config.run_id}-prepare`, operation: "prepare-analysis", host: interopHost, working_root: workingRoot, input: { sources: [{ kind: "image-set", paths: sources }] }, output_directory: relative(workingRoot, prepared), options: {} };
    const response = invokeInstalled(recraftInterop, prepareRequest);
    if (response.status !== "needs_host_action") throw new Error("installed prepare-analysis did not request Host action");
    writeJson(path.join(runRoot, "prepare-response.json"), response);
  }
  const instruction = readFileSync(path.join(prepared, "analysis/host-instructions.md"));
  const sourcePackHash = sha(readFileSync(path.join(sourcePackRoot, "source-pack.json")));
  const baseRun = { run_id: config.run_id, corpus_id: config.corpus_id, corpus_version: config.corpus_version, rubric_version: config.rubric_version, source_pack_id: sourcePack.source_pack_id, source_pack_hash: sourcePackHash, runtime: { version: installedManifest.version, protocol_version: "1.1", schema_version: "3.0.0" }, host: auditHost, instruction_hash: sha(instruction), installed_package_manifest: config.installed_package_manifest, recraft_interop_bin: config.recraft_interop_bin, prepared_analysis_path: relative(workingRoot, prepared), package_path: null, status: "needs-host-action" };
  if (!config.host_analysis_file) {
    writeJson(path.join(runRoot, "run.json"), baseRun);
    return baseRun;
  }
  const hostAnalysis = path.resolve(config.host_analysis_file);
  const packageDirectory = path.join(executionRoot, "recrafts-package");
  if (existsSync(packageDirectory) && readdirSync(packageDirectory).length) throw new Error("benchmark package output already exists");
  const submitRequest = { protocol_version: "1.1", request_id: `${config.run_id}-submit`, operation: "submit-analysis", host: interopHost, working_root: workingRoot, input: { prepared_analysis_directory: relative(workingRoot, prepared), host_analysis_file: relative(workingRoot, hostAnalysis) }, output_directory: relative(workingRoot, packageDirectory), options: {} };
  const response = invokeInstalled(recraftInterop, submitRequest);
  const committedPackage = path.join(runRoot, "recrafts-package");
  if (existsSync(committedPackage)) throw new Error("committed benchmark package already exists");
  cpSync(packageDirectory, committedPackage, { recursive: true });
  const run = { ...baseRun, package_path: committedPackage, host_analysis_sha256: sha(readFileSync(hostAnalysis)), status: "awaiting-human-correction-and-acceptance" };
  validateBenchmarkRun(run);
  writeJson(path.join(runRoot, "submit-response.json"), response);
  writeJson(path.join(runRoot, "run.json"), run);
  writeJson(path.join(runRoot, "source-pack-manifest.json"), sourcePack);
  return run;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const configFile = process.argv[2];
  if (!configFile) throw new Error("Usage: run-benchmark <config.json>");
  const result = runBenchmark(json(path.resolve(configFile)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
