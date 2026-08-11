export function createBlindQualificationContract({ task, allowedFiles }) {
  if (!task || !Array.isArray(allowedFiles) || !allowedFiles.includes("design.md")) throw new Error("Blind qualification requires a task and design.md in the allowlist");
  return { schema: "recrafts.blind-qualification-contract/v1", task, allowed_files: [...allowedFiles], forbidden_inputs: ["source evidence", "candidate answers", "owner decisions"], required_provenance: ["runner", "input_isolated", "accessed_files"] };
}

export function qualifyBlindHarness(input) {
  if (input.blind_agent_status === "PASS" && /fixture|deterministic/i.test(input.provenance?.runner ?? "")) throw new Error("Deterministic harness cannot manufacture a real agent PASS");
  const allow = new Set(input.allowed_files ?? []);
  const forbidden = (input.accessed_files ?? []).filter((file) => !allow.has(file));
  const ready = forbidden.length === 0 && input.provenance?.input_isolated === true && input.result?.schema_valid === true && input.result?.constraints_followed === true;
  return { schema: "recrafts.blind-qualification-result/v1", blind_harness_status: ready ? "READY" : "INVALID", blind_agent_status: "PENDING", agent_usable: false, forbidden_accesses: forbidden, deterministic_fixture: true };
}

export function validateCandidateIsolation(runs) {
  if (!Array.isArray(runs) || runs.length < 1) return { schema: "recrafts.candidate-isolation/v1", status: "INVALID", compare_authorized: false, failures: ["runs"] };
  const failures = [];
  const candidateIds = new Set(runs.map(({ candidate_id }) => candidate_id).filter(Boolean));
  const outputs = new Set();
  const runIds = new Set();
  for (const run of runs) {
    if (!run.candidate_id || !run.run_id || !run.agent || !/^[a-f0-9]{64}$/.test(run.output_sha256 ?? "")) failures.push(`${run.candidate_id ?? "unknown"}:provenance`);
    if (runIds.has(run.run_id)) failures.push(`${run.run_id}:duplicate-run`); else runIds.add(run.run_id);
    if (outputs.has(run.output_sha256)) failures.push(`${run.candidate_id}:duplicate-output`); else outputs.add(run.output_sha256);
    const allow = new Set(run.allowed_inputs ?? []);
    for (const input of run.accessed_inputs ?? []) {
      if (!allow.has(input)) failures.push(`${run.candidate_id}:undeclared-input:${input}`);
      for (const peer of candidateIds) if (peer !== run.candidate_id && new RegExp(`(?:^|[/.-])${peer}(?:[/.-]|$)`, "i").test(input)) failures.push(`${run.candidate_id}:peer-candidate-access:${peer}`);
    }
  }
  return { schema: "recrafts.candidate-isolation/v1", status: failures.length ? "INVALID" : "PASS", compare_authorized: failures.length === 0, failures: [...new Set(failures)] };
}
