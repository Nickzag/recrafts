import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.resolve(process.argv[2] ?? "release-candidates/recrafts-0.3.0-rc.1-build3");
try { if ((await readdir(output)).length) throw new Error("RC output must be empty and is never overwritten"); } catch (error) { if (error.code !== "ENOENT") throw error; }
await Promise.all(["artifacts", "bundle/contracts", "bundle/examples", "bundle/fixtures", "bundle/evidence", "validation"].map((relative) => mkdir(path.join(output, relative), { recursive: true })));
const packResult = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", path.join(output, "artifacts")], { cwd: root, encoding: "utf8" }))[0];
const tarball = path.join(output, "artifacts", packResult.filename);
const tarballHash = createHash("sha256").update(await readFile(tarball)).digest("hex");
const forbidden = packResult.files.filter(({ path: file }) => /(?:^|\/)(?:review|analysis|examples|release-candidates|dev-workflow|tests|\.DS_Store|\.playwright-cli)(?:\/|$)/.test(file) || /(?:oracle|expected-)/i.test(file));
if (forbidden.length) throw new Error(`Forbidden npm inventory: ${forbidden.map(({ path: file }) => file).join(", ")}`);
await cp(path.join(root, "contracts"), path.join(output, "bundle/contracts"), { recursive: true });
await cp(path.join(root, "fixtures/interop"), path.join(output, "bundle/fixtures"), { recursive: true });
await cp(path.join(root, "examples/golden-candidates/crafts-ui-multi-image/fidelity/r004-v2"), path.join(output, "bundle/evidence/fidelity"), { recursive: true, filter: (source) => !source.endsWith(".DS_Store") });
const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const manifest = { rc_id: path.basename(output), package_name: "recrafts", package_version: "0.3.0-rc.1", protocol_version: "1.0", skill_version: "0.3.0-rc.1", runtime_version: "r005-interop-v1", schema_version: "2.1.0", source_commit: commit, r004_independent_review: "ACCEPT", r004_owner_verdict: "PASS", r004_decision_set_id: "owner-decision-r004-pass", node_engine: ">=20", supported_platforms: ["darwin", "linux", "win32"], created_at: new Date().toISOString(), tarball: `artifacts/${packResult.filename}`, tarball_sha256: tarballHash, public_registry_published: false, embedded_vision_provider: false };
await writeFile(path.join(output, "bundle/release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(output, "bundle/checksums.sha256"), `${tarballHash}  artifacts/${packResult.filename}\n`);
await writeFile(path.join(output, "bundle/README.md"), "# Recrafts MVP RC\n\nInstall the tarball locally, then invoke `recraft-interop` with one JSON Envelope on stdin. Visual analysis is two-phase: `prepare-analysis` returns `needs_host_action`; a vision-capable Host performs semantic analysis; `submit-analysis` validates that Host payload. Recrafts does not embed a vision provider. Host examples demonstrate protocol shape only and are not external-product certification.\n");
const examples = [
  ["generic-shell.json", { agent: "generic-shell", engine: "unavailable", capabilities: [] }],
  ["codex-protocol-example.json", { agent: "codex-protocol-example", engine: "unavailable", capabilities: ["files","structured-output"], extensions: { certification: false } }],
  ["claude-code-protocol-example.json", { agent: "claude-code-protocol-example", engine: "unavailable", capabilities: ["files","structured-output"], extensions: { certification: false } }]
];
for (const [name, host] of examples) await writeFile(path.join(output, "bundle/examples", name), `${JSON.stringify({ protocol_version: "1.0", request_id: name, operation: "capabilities", host, working_root: ".", input: {} }, null, 2)}\n`);
await writeFile(path.join(output, "validation/package-contents.json"), `${JSON.stringify({ status: "passed", file_count: packResult.files.length, unpacked_size: packResult.unpackedSize, files: packResult.files, forbidden }, null, 2)}\n`);
execFileSync(process.execPath, [path.join(root, "scripts/run-r005-clean-install.mjs"), output], { cwd: root, stdio: "inherit" });
const cleanInstall = JSON.parse(await readFile(path.join(output, "validation/clean-install-report.json"), "utf8"));
await writeFile(path.join(output, "validation/interop-validation.json"), `${JSON.stringify({ status: cleanInstall.status, protocol_version: "1.0", operations: ["capabilities","prepare-analysis","submit-analysis","validate-package","generate-realization","verify-fidelity"], embedded_vision_provider: false, host_examples_are_certification: false }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ rc_id: manifest.rc_id, tarball: manifest.tarball, tarball_sha256: tarballHash }, null, 2)}\n`);
