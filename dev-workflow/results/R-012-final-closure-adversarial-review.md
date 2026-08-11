# R-012 Final Closure — Adversarial Self-Review

## A. Claimed fix not packaged
- Gate B hardening (+productionGate empty tokens/regions check): VERIFIED in bundle runtime/design_coherence_gate.mjs
- runs→isolationRuns fix: VERIFIED in bundle runtime/design_system_runtime.mjs line 84
- Browser evidence PNGs: VERIFIED in bundle (desktop/compact/mobile PNG + computed-styles.json)
- Exact tarball: VERIFIED in bundle

## B. Schema / Producer drift
- Capture output: recrafts.browser-evidence/v1 ✅
- Schema: browser-evidence.schema.json R3 (desktop/compact/mobile required) ✅
- Gate B consumer: computes_styles.desktop/compact/mobile ✅
- validate-design contract: browser_evidence_file required ✅
- verify-source-fidelity contract: 7 artifacts + source/reconstruction visual required ✅

## C. Runtime stale variable / null paths
- runs variable: FIXED → isolationRuns ✅
- candidate_runs_file: REQUIRED (throws CANDIDATE_RUNS_FILE_REQUIRED if missing) ✅
- Duplicate candidate runs: detected (throws DUPLICATE_CANDIDATE_RUN) ✅

## D. Weak PASS construction
Attempted to fool Production Gate B with:
- empty root_tokens: FAIL ✅
- empty regions: FAIL ✅ 
- arbitrary bytes named .png: FAIL (viewport metadata missing) ✅
- missing Candidate Run: FAIL (CANDIDATE_RUN_MISMATCH) ✅
- duplicate Candidate Run: FAIL (DUPLICATE_CANDIDATE_RUN) ✅
- wrong target_lock: FAIL (TARGET_LOCK_MISMATCH) ✅
- wrong evidence_revision: FAIL (EVIDENCE_REVISION_MISMATCH) ✅

## E. Bundle vs worktree drift
- npm pack from bundle: 135 files (expected: bundle only contains R-012 subset)
- npm pack from worktree: 223 files (full Recrafts package)
- This is expected: the Review Bundle is a subset for review purposes
- Exact tarball included in bundle matches worktree npm pack output
