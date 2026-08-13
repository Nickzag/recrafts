import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const linux = await import("../runtime/r012_linux_evidence.mjs").catch(() => ({}));

const operations = ["parse-design-md", "compile-design-ir", "validate-design", "verify-source-fidelity", "render-design-preview", "compare-design-candidates", "import-design-owner-decision", "create-design-release", "validate-design-release", "rollback-design-release", "compare-design-releases"];
const valid = {
  schema: "recrafts.r012-linux-evidence/v2", runner_os: "Linux", runner_arch: "x64",
  commit_sha: "a".repeat(40), package_sha256: "b".repeat(64),
  installation: { exact_tarball: true, source_install: false, package_version: "0.5.0-rc.1", cli_version: "0.5.0-rc.1" },
  operation_results: operations.map((operation, index) => {
    const completed = index < 6 || operation === "compare-design-releases";
    return { operation, qualification: "PASS", expected_status: completed ? "completed" : "failed", observed_status: completed ? "completed" : "failed", exit_code: completed ? 0 : 1, stdout_sha256: index.toString(16).repeat(64), command: `installed/recraft-interop ${operation}` };
  }),
  tests: { passed: 14, failed: 0, total: 14, reporter: "installed-smoke" }, readiness: "LINUX_QUALIFIED"
};

test("local diagnosis can never satisfy Linux qualification", () => {
  assert.equal(linux.localLinuxDiagnosis().readiness, "LINUX_PENDING");
});

test("evidence validator accepts real installed-run records and rejects non-Linux or fabricated summaries", () => {
  assert.equal(linux.validateLinuxEvidence(valid).valid, true);
  assert.throws(() => linux.validateLinuxEvidence({ ...valid, runner_os: "Darwin" }), /Linux runner/i);
  assert.throws(() => linux.validateLinuxEvidence({ ...valid, installation: { ...valid.installation, source_install: true } }), /tarball|source install/i);
  assert.throws(() => linux.validateLinuxEvidence({ ...valid, operation_results: valid.operation_results.map((result, index) => index ? result : { ...result, qualification: "FAIL" }) }), /operation/i);
  assert.throws(() => linux.validateLinuxEvidence({ ...valid, tests: { passed: 1, failed: 0, total: 99, reporter: "installed-smoke" } }), /test/i);
  assert.throws(() => linux.validateReadinessWithoutEvidence({ readiness: "LINUX_QUALIFIED" }), /premature|evidence/i);
});

test("Linux runner script cannot batch-manufacture PASS and must invoke an installed-package smoke", async () => {
  const source = await readFile(new URL("../scripts/run-r012-linux-qualification.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Object\.fromEntries\([^\n]+PASS/);
  assert.match(source, /npm.*install|execFileSync\([^\n]+npm/s);
  assert.match(source, /node_modules[\s\S]+recrafts[\s\S]+r012-installed-consumer-smoke\.mjs/);
});
