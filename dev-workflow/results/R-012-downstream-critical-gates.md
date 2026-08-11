# R-012 Downstream-Critical Gates

## Stage-Exit Matrix

| Gate | Status | Evidence |
|------|--------|----------|
| Benchmark Identity | **PASS** | 6/6 adversarial tests: manifest SHA, missing/dup run, target lock, evidence, output SHA |
| Canonical Browser | **PASS** | 3 valid PNGs + computed-styles.json, Gate B 6/6 PASS |
| Frozen Runtime | **PASS** | Tarball 097b7634..., 223 files, 0 unresolved imports, clean install 3/3 CLI |
| Layoutcrafts Consumer | **PASS** | Parse→Compile→10 tokens→1 component, compatibility-result.json |

## Adversarial Verification

| Attack | Result |
|--------|--------|
| Wrong manifest SHA | FAIL (INPUT_MANIFEST_SHA_MISMATCH) |
| Missing Candidate Run | FAIL (CANDIDATE_RUN_MISMATCH) |
| Duplicate Candidate Run | FAIL (DUPLICATE_CANDIDATE_RUN) |
| Wrong target lock | FAIL (TARGET_LOCK_MISMATCH) |
| Wrong evidence revision | FAIL (EVIDENCE_REVISION_MISMATCH) |
| Wrong output SHA | FAIL (CANDIDATE_OUTPUT_MISMATCH) |

## Deferred Governance States

| State | Status | Reason |
|-------|--------|--------|
| Real Source Fidelity | NOT_RUN | Requires real source run |
| Owner PASS | MISSING | Requires human review |
| Accepted Release | NONE | Not yet created |
| Blind Agent | PENDING | Requires independent model runs |
| agent_usable | false | Not yet authorized |
| Linux | LINUX_PENDING | Separate authorization gate |

## Verdict

**4 PASS / 0 FAIL — Downstream-Critical Gates satisfied.**
