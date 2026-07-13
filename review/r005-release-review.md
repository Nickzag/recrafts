# R-005 Release Candidate Review

## Review Target

- RC: `recrafts-0.3.0-rc.1-build3`
- Package version: `0.3.0-rc.1`
- Protocol: `1.0`
- R-004 decision set: `owner-decision-r004-pass`
- Tarball SHA-256: `ddce4dde31863aa8cf6801b221f35703c97f0ec0bfc9ab498bad072ab2952b47`

## Mechanical Evidence

- npm inventory allowlist: PASS
- Tarball checksum: PASS
- Clean install outside source repository: PASS
- CLI help/version: PASS
- capabilities: PASS
- prepare-analysis → needs_host_action: PASS
- submit-analysis with labeled deterministic fixture: PASS
- validate-package / generate-realization / verify-fidelity: PASS
- malformed request / unsafe path / output collision: PASS
- Embedded vision provider: false
- External Host certification claim: false

## Project-owner Release Verdict

`PENDING`

Allowed verdicts: `PASS`, `PASS WITH CHANGES`, `REWORK`.
