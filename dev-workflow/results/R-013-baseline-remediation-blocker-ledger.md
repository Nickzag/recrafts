# R-013 Baseline Remediation Blocker Ledger

Date: 2026-08-13

## Authority and scope

- Original R-012 authority: `5ecf5f5e8f6a4514c91a955e48144aa086cb375c`
- Task branch: `recrafts/r-013-evidence-grounded-ds-intelligence`
- Authorized scope: investigate and repair the existing R-001 secret-scan baseline failure only
- R-013 business implementation: paused

## R-001 secret-scan remediation

The original full test run reported 49 secret-like findings. A redacted diagnostic classified every finding as the same generic labelled-secret rule; no private-key, AWS access-key, GitHub token, `sk-` token, or JWT rule matched.

The 49 findings reduced to four repeated safe source patterns involving ordinary identifiers such as `gap_token`, `hasAnyToken`, and a local `token = tokenMap(...)` assignment. Classification:

- `REAL_SECRET`: 0
- `TEST_FIXTURE_FALSE_POSITIVE`: repeated generated `design.md` and Review Bundle copies
- `HASH / ID / GENERATED_EVIDENCE_FALSE_POSITIVE`: 0 high-entropy credential-shaped values
- `SCANNER_RULE_DEFECT`: generic labelled-secret rule lacked identifier boundaries and treated source-code identifiers as credential labels

The scanner remains enabled across repository text and Review Bundles. Dedicated private-key, AWS, GitHub, `sk-`, and JWT patterns are unchanged. The generic labelled-secret rule now requires a standalone credential label and excludes an identifier followed by a function call from the unquoted assignment form. A new adversarial test proves that a standalone `api_key` with a long value is still rejected.

Targeted validation:

```text
node --test tests/r001-validator.test.mjs
14 PASS / 0 FAIL
```

## Phase 2 pre-existing baseline blockers

After R-001 passed, the full baseline run completed with:

```text
npm test
305 tests
298 PASS
7 FAIL
```

The same five test files were executed from the unchanged R-012 authority worktree at `5ecf5f5`; the same 7 failures reproduced (`13 PASS / 7 FAIL`). They are therefore pre-existing baseline defects, not regressions introduced by the secret-scan remediation.

### B-01 — R-011R-A operation contract drift

- Test: `tests/r011r-a-visual-evidence.test.mjs`
- Failure: legacy `verify-source-fidelity` mutation fixture supplies `reconstruction_directory`, while the canonical request Schema requires the R-012 production artifact set.
- Impact: operation Schema regression is internally inconsistent.

### B-02 — R-012 governed Consumer fixture failure

- Test: `tests/r012-consumer-release-invariant.test.mjs`
- Failures: 2
- Failure: the governance fixture attempts to read `report_sha256` from an undefined Gate report.
- Impact: accepted-release Consumer positive and tamper-negative paths cannot execute.

### B-03 — Installed smoke and Linux evidence mismatch

- Tests: `tests/r012-linux-installed-harness.test.mjs`, `tests/r012-linux-qualification.test.mjs`
- Failures: 2
- Failure: installed smoke exits with status 2; Linux evidence expects a completed `compare-design-releases` record that is absent or failed.
- Impact: installed-package and Linux evidence baselines are not internally qualified.

### B-04 — Release rollback positive fixture failure

- Test: `tests/r012-release-store.test.mjs`
- Failure: rollback setup cannot import an Owner Decision because a required Gate report is failed.
- Impact: rollback-new-release positive path cannot be proven.

### B-05 — Release tamper rejection failure

- Test: `tests/r012-release-store.test.mjs`
- Failure: modified historical artifacts are not rejected by the tested rollback path.
- Impact: immutable historical release enforcement lacks a passing regression proof.

## Phase 2 remediation result

- B-01: migrated the historical `verify-source-fidelity` mutation fixture to the current production request Schema; production Schema was not relaxed.
- B-02: restored the actual asynchronous Gate A/B execution chain in the governed Consumer fixture; no report hash is mocked.
- B-03: installed smoke now captures real Chromium desktop/compact/mobile PNG and computed-style Evidence, consumes the canonical capture filename, freezes the Authority Manifest SHA, and binds each Candidate Run to a Runtime-recomputed canonical Candidate Artifact SHA.
- B-04: the second Release fixture now binds Candidate, `design.md`, and Evidence Revision consistently before Owner Decision import.
- B-05: the adversarial test now mutates the persisted historical `releases/R1/design.md`; `loadAndValidateRelease()` rejects the Artifact hash mismatch before rollback can create a new Release.

Targeted Phase 2 validation:

```text
node --test tests/r011r-a-visual-evidence.test.mjs tests/r012-consumer-release-invariant.test.mjs tests/r012-linux-installed-harness.test.mjs tests/r012-linux-qualification.test.mjs tests/r012-release-store.test.mjs
20 PASS / 0 FAIL

node --test tests/r012-linux-installed-harness.test.mjs
2 PASS / 0 FAIL
```

## Exit state

```text
R-001 SECRET-SCAN REMEDIATION = PASS
PHASE 2 B-01 THROUGH B-05      = PASS
FULL BASELINE npm test         = PASS (306/306)
REMEDIATION COMMIT             = READY
R-013 BUSINESS IMPLEMENTATION  = PAUSED UNTIL REMEDIATION COMMIT
```
