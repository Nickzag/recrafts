# R-005 Standalone Packaging, Agent Interoperability and MVP Release Candidate

Status: approved design awaiting written-spec review  
Date: 2026-07-13  
Repository: `/Users/Nick/Documents/Recrafts`  
Branch: `recrafts/r-005-mvp-release-candidate`

## 1. Goal

Produce an auditable Recrafts MVP release candidate that can be installed outside the source repository, invoked by different Host Agents through a stable JSON Envelope over CLI stdin/stdout, and verified through a clean-install smoke flow.

R-005 proves standalone packaging and bounded Host interoperability. It does not publish to a public registry, implement MCP, provide a hosted service, claim compatibility with every Host Agent, generate a complete VIS, integrate directly with CraftsOS/Layoutcrafts private code or establish production readiness.

## 2. Release Artifacts

R-005 produces two primary artifacts:

1. An npm tarball created through `npm pack` from the repository's declared `files` inventory.
2. A portable RC bundle containing the tarball, release manifest, SHA-256 checksums, installation instructions, interoperability contract, Host examples, example inputs/outputs, clean-install evidence and RC validation reports.

The release version is a prerelease identifier and must be internally consistent across `package.json`, release manifest, tarball filename and verification evidence. The workflow creates versioned output directories and refuses to overwrite prior RC artifacts.

## 3. Interoperability Contract

The interoperability boundary is a JSON Envelope transported over CLI stdin/stdout. stdout must contain exactly one JSON response; diagnostics belong on stderr.

Request fields:

- `protocol_version`
- `request_id`
- `operation`
- `host.agent`
- `host.engine`
- `host.capabilities`
- `input`
- `output_directory`
- `options`

Response fields:

- `protocol_version`
- `request_id`
- `operation`
- `status`
- `host_handshake`
- `artifacts`
- `validation`
- `warnings`
- `error`

Supported MVP operations:

- `capabilities`: return the protocol version, operations and required/recommended capabilities without writing artifacts.
- `analyze-image`: invoke the existing single-image runtime using an explicitly declared local input.
- `analyze-images`: invoke the existing multi-image runtime using an explicitly declared input directory.
- `validate-package`: validate a declared extraction package without generating a realization.
- `generate-realization`: create a new realization from an authorized package and refuse non-empty output.
- `verify-fidelity`: validate a declared fidelity directory through the bounded R-004 validator.

The envelope adapter composes existing runtime and validator modules. It must not duplicate extraction or realization business logic.

## 4. Capability Handshake

Every operation declares required and recommended Host capabilities. The adapter returns provided, missing-required and missing-recommended capabilities.

- Missing required capabilities fail closed before the operation starts.
- Missing recommended capabilities return a warning only when the operation can still produce valid bounded output.
- Host identity fields may be `unavailable`; they must never be fabricated.
- Vision-dependent analysis requires an explicit vision capability declaration.

## 5. Security and Boundary Rules

The RC adapter must reject:

- Oracle or `expected-*` input paths;
- direct CraftsOS/Layoutcrafts private imports;
- unsupported operations or protocol versions;
- malformed JSON or missing required fields;
- non-empty output directories for write operations;
- remote URLs for local-image operations;
- unsupported fidelity, production-readiness or full-clone claims.

The package must contain no raw private sources, secrets, caches, `.DS_Store`, Playwright session files, historical failed outputs or unrelated development evidence.

## 6. Clean-install Flow

The verification script creates a new temporary directory, installs the generated tarball without accessing unpublished repository modules, and runs:

1. CLI help/version check.
2. `capabilities` Envelope handshake.
3. One safe packaged example flow that produces deterministic structural output.
4. Package-content and artifact checks.
5. Invalid-envelope and output-collision negative checks.

The smoke flow may use an included sanitized fixture. It must not depend on absolute paths inside `/Users/Nick/Documents/Recrafts` after installation.

## 7. Host Examples

The portable bundle includes examples for:

- generic shell/stdin invocation;
- Codex-style Host metadata;
- Claude Code-style Host metadata;
- unavailable Host/model identity with explicit capability fields.

These examples demonstrate protocol portability, not certification of external products. Example outputs are validated against the same response schema.

## 8. Schemas and Validation

Add JSON Schemas for request, response and release manifest. The RC validator verifies:

- tarball exists and checksum matches;
- only declared package files are present;
- package version and release manifest agree;
- CLI entrypoint is executable after install;
- request and response examples validate;
- stdout contains one JSON value and stderr contains diagnostics only;
- clean-install smoke flow passes;
- required positive and fail-closed negative cases pass;
- no private-path, Oracle, secret, raw-source or direct-integration leakage exists;
- existing R-001 through R-004 validation remains green.

## 9. Error Model

Failures return a JSON response with `status: "failed"`, a stable machine-readable `error.code`, a concise message and no false Artifact claims. Exit codes are non-zero for malformed requests, protocol mismatch, capability failure, unsafe input, output collision and operation failure.

The adapter must not emit stack traces to stdout. Unexpected internal errors may write a redacted diagnostic to stderr while returning `INTERNAL_ERROR` in the response.

## 10. Output Structure

The canonical RC output is versioned under:

```text
release-candidates/<rc-id>/
  artifacts/
    recrafts-<version>.tgz
  bundle/
    README.md
    release-manifest.json
    checksums.sha256
    contracts/
    examples/
    evidence/
  validation/
    package-contents.json
    interop-validation.json
    clean-install-report.json
    rc-readiness.json
```

Repository workflow outputs additionally include:

- `dev-workflow/tasks/R-005-recrafts-mvp-release-candidate.md`
- `dev-workflow/results/R-005-recrafts-mvp-release-candidate-result.md`
- `dev-workflow/review-packets/R-005-recrafts-mvp-release-candidate-review-packet.md`
- `review/r005-release-review.md`

## 11. Testing

Positive coverage:

- request/response Schema validation;
- capability handshake;
- every declared operation dispatches to the correct existing module;
- deterministic response structure;
- npm tarball generation;
- portable bundle generation;
- clean install and packaged CLI invocation;
- checksum and manifest verification.

Critical negative coverage:

- malformed JSON;
- unknown protocol version;
- unsupported operation;
- missing required Host capability;
- Oracle/expected path;
- non-empty output collision;
- direct CraftsOS/Layoutcrafts dependency;
- absolute repository path leakage;
- raw source or secret included in tarball;
- stdout polluted by diagnostics;
- missing packaged runtime/schema/template;
- version or checksum mismatch;
- unsupported fidelity/full-clone/production claim.

## 12. Acceptance Criteria

R-005 is mechanically ready for review when:

- npm tarball and portable bundle are generated under a new RC identity;
- clean installation succeeds in an isolated temporary directory;
- Host examples produce Schema-valid responses;
- package contents and checksums validate;
- fail-closed negative tests pass;
- R-001 through R-004 regressions pass;
- Result and Review Packet record the exact commands and evidence;
- project-owner release review remains `PENDING` until separately completed.

The bounded claim is:

> Recrafts can be packaged as an installable MVP release candidate and invoked through a stable JSON Envelope by capability-declaring Host Agents in a clean local environment.

This claim excludes public registry publication, universal Host compatibility, production service reliability, full VIS generation, direct CraftsOS integration and production readiness.
