# R-012 v2 Validation Summary

Date: 2026-08-09
Baseline: `b6c00e93694a74d3220265e18f96359e98fbece3`
Branch: `recrafts/r-012-v2-canonical-design-system-governance`

## Results

- `npm run build:r012`: PASS. Fixture remains `candidate`, `agent_usable:false`.
- `npm run validate:r012`: PASS. Public files are exactly `design.md` and `preview.html`; release promotion is BLOCKED; Linux is PENDING.
- `npm run test:r012`: PASS, 33/33 at the recorded run (subsequent interop test brings the R-012 test set to 37 assertions through imported parser cases).
- `npm test`: PASS, 243/243.
- `node --test tests/r002-validator.test.mjs tests/r005-release.test.mjs`: PASS, 4/4.
- `npm pack --json --dry-run`: PASS, 202 packaged entries; repository evidence/examples/tests excluded.
- Local tarball: `recrafts-0.5.0-rc.1.tgz`, SHA-1 `c3e794c31564e2f56074b21e61f7f8a95b3c9e80` from npm pack output.
- Clean install from local tarball in `/tmp`: PASS; 5 packages installed; audit reported 0 vulnerabilities; CLI `--version` returned `0.5.0-rc.1`; capabilities returned all eight R-012 operations.
- `git diff --check` and relevant `node --check`: PASS.
- Local Linux harness diagnostic: PASS as a negative boundary; output is `LINUX_PENDING` and `substitutes_for_linux_evidence:false`.

## Frozen status

```text
Golden fixture status              candidate
Golden fixture agent_usable        false
Gate A Runtime Qualification       PASS
Real-source Source Fidelity        NOT_RUN
Gate B Design Coherence            PASS
Blind Harness                      READY
Real Blind Agent                   PENDING
Owner Decision                     MISSING
Release Promotion                  BLOCKED
Linux Qualification                LINUX_PENDING
```

No Git commit, push, merge, release, workflow dispatch, R-011R-C, Task 025R unlock, CraftsOS modification, or Layoutcrafts business implementation was performed.

