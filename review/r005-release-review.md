# R-005 Release Candidate Review

## Review Target

- RC: `recrafts-0.3.0-rc.1-build4`
- Package version: `0.3.0-rc.1`
- Protocol: `1.0`
- R-004 decision set: `owner-decision-r004-pass`
- Artifact source commit: `99fa18b2c6f9e565936507794c9336404ff3936c`
- Build 4 evidence commit: `PENDING_POST_GENERATION_COMMIT`
- Tarball SHA-256: `933045af5383838db6317b669b3b2a6af5a4dbd71a53a9f833facd9f27e84599`

## Mechanical Evidence

- npm inventory allowlist: PASS
- Tarball checksum: PASS
- Clean install outside source repository: PASS
- Installed package-local test: PASS, 1 protocol check
- CLI help/version: PASS
- capabilities: PASS
- prepare-analysis → needs_host_action: PASS
- submit-analysis with labeled deterministic fixture: PASS
- validate-package / generate-realization / verify-fidelity: PASS
- malformed request / unsafe path / output collision: PASS
- operation/response Schema mutation tests: PASS
- traversal / symlink escape / collision tests: PASS
- Embedded vision provider: false
- External Host certification claim: false
- Declared platforms: darwin, linux, win32
- Verified platform in this RC run: darwin
- Distribution: UNLICENSED, internal evaluation only
- Historical build3 preserved unchanged: PASS

## Project-owner Release Verdict

`PENDING`

Allowed verdicts: `PASS`, `PASS WITH CHANGES`, `REWORK`.
