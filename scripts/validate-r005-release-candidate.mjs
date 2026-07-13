import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function validateReleaseCandidate(directory, { writeReport = true } = {}) {
  const readJson = async (relative) => JSON.parse(await readFile(path.join(directory, relative), "utf8"));
  const manifest = await readJson("bundle/release-manifest.json");
  const contents = await readJson("validation/package-contents.json");
  const clean = await readJson("validation/clean-install-report.json");
  const tarball = await readFile(path.join(directory, manifest.tarball));
  const hash = createHash("sha256").update(tarball).digest("hex");
  const inventoryText = contents.files.map(({ path: file }) => file).join("\n");
  const checks = {
    version_consistency: manifest.package_version === "0.3.0-rc.1" && /recrafts-0\.3\.0-rc\.1\.tgz$/.test(manifest.tarball),
    checksum: hash === manifest.tarball_sha256,
    r004_gate: manifest.r004_independent_review === "ACCEPT" && manifest.r004_owner_verdict === "PASS" && manifest.r004_decision_set_id === "owner-decision-r004-pass",
    no_embedded_vision: manifest.embedded_vision_provider === false,
    inventory: contents.status === "passed" && contents.forbidden.length === 0,
    required_files: ["SKILL.md","manifest.json","runtime/interop_cli.mjs","contracts/host-analysis.schema.json","fixtures/interop/host-analysis.fixture.json"].every((file) => inventoryText.includes(file)),
    no_private_inventory: !/(?:review\/|analysis\/|examples\/|release-candidates\/|dev-workflow\/|tests\/|\.DS_Store|\.playwright-cli|oracle|expected-)/i.test(inventoryText),
    clean_install: clean.status === "passed" && clean.checks.every(({ passed }) => passed),
  };
  const report = { rc_id: manifest.rc_id, status: Object.values(checks).every(Boolean) ? "passed" : "failed", checks, failures: Object.entries(checks).filter(([, value]) => !value).map(([key]) => key) };
  if (writeReport) await writeFile(path.join(directory, "validation/rc-readiness.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1]?.endsWith("validate-r005-release-candidate.mjs")) {
  const directory = path.resolve(process.argv[2] ?? "release-candidates/recrafts-0.3.0-rc.1-build2");
  const report = await validateReleaseCandidate(directory);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "passed") process.exitCode = 1;
}
