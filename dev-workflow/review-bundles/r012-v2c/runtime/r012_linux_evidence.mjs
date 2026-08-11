const OPERATIONS = ["parse-design-md", "compile-design-ir", "validate-design", "render-design-preview", "compare-design-candidates", "import-design-owner-decision", "create-design-release", "validate-design-release", "rollback-design-release", "compare-design-releases"];

export function localLinuxDiagnosis() {
  return { schema: "recrafts.r012-local-linux-diagnosis/v1", host_os: process.platform, readiness: "LINUX_PENDING", substitutes_for_linux_evidence: false };
}

export function validateLinuxEvidence(evidence) {
  if (evidence?.schema !== "recrafts.r012-linux-evidence/v2") throw new Error("Linux evidence schema is invalid");
  if (evidence.runner_os !== "Linux") throw new Error("Evidence must come from a Linux runner");
  if (!/^[a-f0-9]{40}$/.test(evidence.commit_sha ?? "") || !/^[a-f0-9]{64}$/.test(evidence.package_sha256 ?? "")) throw new Error("Linux evidence hash is missing or malformed");
  if (evidence.installation?.exact_tarball !== true || evidence.installation?.source_install !== false || !evidence.installation?.package_version || evidence.installation.package_version !== evidence.installation.cli_version) throw new Error("Linux qualification must use one exact tarball install, never a source install");
  if (!Array.isArray(evidence.operation_results) || evidence.operation_results.length !== OPERATIONS.length) throw new Error("Linux operation evidence count is invalid");
  const byOperation = new Map(evidence.operation_results.map((result) => [result.operation, result]));
  for (const operation of OPERATIONS) {
    const result = byOperation.get(operation);
    if (!result || result.qualification !== "PASS" || result.observed_status !== result.expected_status || !Number.isInteger(result.exit_code) || !/^[a-f0-9]{64}$/.test(result.stdout_sha256 ?? "") || !result.command?.includes(operation)) throw new Error(`Linux operation evidence is missing, fabricated, or failed: ${operation}`);
    if ((result.observed_status === "completed" && result.exit_code !== 0) || (result.observed_status === "failed" && result.exit_code === 0)) throw new Error(`Linux operation exit status is inconsistent: ${operation}`);
  }
  if (evidence.tests?.failed !== 0 || !(evidence.tests?.passed > 0) || evidence.tests.total !== evidence.tests.passed + evidence.tests.failed || evidence.tests.reporter !== "installed-smoke") throw new Error("Linux test evidence is not a real passing count");
  if (evidence.readiness !== "LINUX_QUALIFIED") throw new Error("Linux evidence readiness is invalid");
  return { valid: true, readiness: "LINUX_QUALIFIED", operation_count: OPERATIONS.length };
}

export function validateReadinessWithoutEvidence(readinessRecord, evidence = null) {
  if (!evidence && readinessRecord?.readiness !== "LINUX_PENDING") throw new Error("Premature Linux readiness is blocked without validated evidence");
  if (evidence) validateLinuxEvidence(evidence);
  return { valid: true, readiness: evidence ? "LINUX_QUALIFIED" : "LINUX_PENDING" };
}

export const R012_LINUX_OPERATIONS = OPERATIONS;
