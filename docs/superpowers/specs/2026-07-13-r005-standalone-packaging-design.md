# R-005 Standalone Packaging, Agent Interoperability and MVP Release Candidate

Status: approved with P0 contract corrections
Date: 2026-07-13
Repository: `/Users/Nick/Documents/Recrafts`
Branch: `recrafts/r-005-mvp-release-candidate`

## 1. Goal

Produce an auditable Recrafts MVP release candidate that can be installed outside the source repository, coordinate external visual reasoning through a two-phase Host-Agent protocol over CLI stdin/stdout, and be verified through a clean-install smoke flow.

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
- `prepare-analysis`: canonicalize and validate declared local sources, create an Evidence Bundle plus Host instructions and return `needs_host_action`. It performs no semantic visual interpretation.
- `submit-analysis`: accept a structured Host Analysis, validate evidence references, Scope, confidence and Host execution identity, then compose `design.md`, Tokens, Components and a versioned Package.
- `validate-package`: validate a declared extraction package without generating a realization.
- `generate-realization`: create a new realization from an authorized package and refuse non-empty output.
- `verify-fidelity`: validate a declared fidelity directory through the bounded R-004 validator.

The envelope adapter composes existing runtime and validator modules. It must not duplicate extraction or realization business logic. `analyze-image` and `analyze-images` are excluded from the MVP operation set because Recrafts does not embed a vision provider.

The two-phase flow is:

```text
prepare-analysis
→ Evidence Bundle + instructions + Host Analysis Schema
→ needs_host_action
→ Host Agent performs visual reasoning
→ submit-analysis
→ validated design.md / Tokens / Components / Package
```

Build 5 refines the flow to preserve the human gate:

```text
prepare-analysis
→ bounded Prepared Bundle with copied sources
→ needs_host_action
→ submit-analysis with full Host Analysis Schema validation
→ package awaiting-owner-review
→ explicit Owner Decision import
→ new approved package_id / decision_set_id
→ generate-realization
```

`generate-realization` remains one of the six public Operations. For an awaiting package it requires `owner_decision_file` and `approved_package_directory`, imports the bounded decision, creates a new package identity, and realizes only the derived approved package. A fixture decision is accepted only when `options.interoperability_fixture` is explicitly true and its provenance is labeled as deterministic test evidence.

## 4. Capability Handshake

Every operation declares required and recommended Host capabilities. The adapter returns provided, missing-required and missing-recommended capabilities.

- `prepare-analysis` does not require Host vision because it only prepares evidence. Its response declares that the next Host action requires vision.
- `submit-analysis` requires evidence that a vision-capable Host completed the supplied analysis; a capability string alone is not proof of execution.
- Missing required capabilities fail closed before the operation starts.
- Missing recommended capabilities return a warning only when the operation can still produce valid bounded output.
- Host identity fields may be `unavailable`; they must never be fabricated.
- Recrafts never claims embedded vision inference. Development may use Codex/OpenAI vision, and CraftsOS may later provide OpenAI API vision, but standalone behavior depends on the integrating Host.

## 5. Security and Boundary Rules

The RC adapter must reject:

- Oracle or `expected-*` input paths;
- direct CraftsOS/Layoutcrafts private imports;
- unsupported operations or protocol versions;
- malformed JSON or missing required fields;
- non-empty output directories for write operations;
- remote URLs for local-image operations;
- unsupported fidelity, production-readiness or full-clone claims.

Every local path is canonicalized with `realpath`. The adapter rejects `..` traversal, symlink escape from the declared working root, Oracle/expected paths after resolution, special devices/sockets/FIFOs, input/output containment in either direction, non-empty write targets and remote URLs for local-file operations. Response Artifact paths are relative to the output root and never expose machine-specific absolute paths.

The package must contain no raw private sources, secrets, caches, `.DS_Store`, Playwright session files, historical failed outputs or unrelated development evidence.

## 6. Clean-install Flow

The verification script creates a new temporary directory, installs the generated tarball without accessing unpublished repository modules, and runs:

1. CLI help/version check.
2. `capabilities` Envelope handshake.
3. `prepare-analysis` using a sanitized packaged image and assert `needs_host_action`.
4. `submit-analysis` using a packaged deterministic Host-analysis interoperability fixture.
5. `validate-package` on the resulting Package.
6. `generate-realization` into a new output directory.
7. `verify-fidelity` against a packaged bounded example.
8. Package-content and Artifact checks.
9. Malformed-request, unsafe-path and output-collision negative checks.

The Host-analysis fixture is labeled `deterministic interoperability fixture`, `not a live model result` and `not proof of visual quality`. The smoke flow must not depend on absolute paths inside `/Users/Nick/Documents/Recrafts` after installation.

## 7. Host Examples

The portable bundle includes examples for:

- generic shell/stdin invocation;
- Codex-style Host metadata;
- Claude Code-style Host metadata;
- unavailable Host/model identity with explicit capability fields.

These are protocol-shape examples only. They demonstrate Schema portability and do not claim verified compatibility with Codex, Claude Code or multiple external Host products. Example outputs are validated against the same response schema.

## 8. Schemas and Validation

Add JSON Schemas for the envelope request, envelope response, Host Analysis, release manifest and each operation request:

```text
contracts/envelope-request.schema.json
contracts/envelope-response.schema.json
contracts/host-analysis.schema.json
contracts/release-manifest.schema.json
contracts/operations/capabilities.request.schema.json
contracts/operations/prepare-analysis.request.schema.json
contracts/operations/submit-analysis.request.schema.json
contracts/operations/validate-package.request.schema.json
contracts/operations/generate-realization.request.schema.json
contracts/operations/verify-fidelity.request.schema.json
```

Each operation Schema declares accepted inputs, write behavior, output policy, capability requirements, status values, Artifact types and error codes. The RC validator verifies:

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
- R-004 independent `ACCEPT`, Owner `PASS` and decision-set ID `owner-decision-r004-pass` are present in the release manifest.

## 9. Error Model

Response statuses are `completed`, `completed_with_warnings`, `needs_host_action` and `failed`. `needs_host_action` is successful protocol progress, contains a `host_action` descriptor, has `error: null` and exits `0`. Failures return `status: "failed"`, a stable machine-readable `error.code`, a concise message and no false Artifact claims. Exit codes are non-zero for malformed requests, protocol mismatch, capability failure, unsafe input, output collision and operation failure.

Stable error codes include `INVALID_JSON`, `SCHEMA_VALIDATION_FAILED`, `PROTOCOL_VERSION_UNSUPPORTED`, `OPERATION_UNSUPPORTED`, `CAPABILITY_REQUIRED`, `HOST_ACTION_REQUIRED`, `UNSAFE_INPUT_PATH`, `UNSAFE_OUTPUT_PATH`, `OUTPUT_NOT_EMPTY`, `INPUT_NOT_FOUND`, `PACKAGE_INVALID`, `REALIZATION_NOT_AUTHORIZED`, `FIDELITY_SCOPE_UNSUPPORTED`, `VERSION_CONFLICT` and `INTERNAL_ERROR`.

The adapter must not emit stack traces to stdout. Unexpected internal errors may write a redacted diagnostic to stderr while returning `INTERNAL_ERROR` in the response. Major protocol mismatches fail; a higher unsupported minor version fails with `supported_versions`; unknown operation fields are rejected; extra Host metadata is allowed only under `host.extensions`; response field order has no semantic meaning.

Resource limits cover request bytes, image count, individual file bytes, total input bytes, operation timeout and generated Artifact count. Limit violations use stable errors rather than exhausting the process.

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
- `prepare-analysis` returns a complete `needs_host_action` contract without pretending visual analysis occurred;
- `submit-analysis` validates a labeled Host fixture and rejects invalid evidence references;
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
- Host capability declared without a submitted Host Analysis;
- Oracle/expected path;
- non-empty output collision;
- direct CraftsOS/Layoutcrafts dependency;
- absolute repository path leakage;
- raw source or secret included in tarball;
- stdout polluted by diagnostics;
- missing packaged runtime/schema/template;
- version or checksum mismatch;
- unsupported fidelity/full-clone/production claim.
- symlink escape, path traversal, input/output containment and special filesystem objects.

## 12. Acceptance Criteria

R-005 is mechanically ready for review when:

- npm tarball and portable bundle are generated under a new RC identity;
- clean installation succeeds in an isolated temporary directory;
- R-004 independent review is `ACCEPT`, Owner Verdict is `PASS`, and `owner-decision-r004-pass` appears in the release manifest;
- Host examples produce Schema-valid responses;
- `prepare-analysis` returns `needs_host_action`; `submit-analysis` consumes only the explicitly labeled deterministic fixture during clean-install;
- package contents and checksums validate;
- fail-closed negative tests pass;
- R-001 through R-004 regressions pass;
- Result and Review Packet record the exact commands and evidence;
- project-owner release review remains `PENDING` until separately completed.

The bounded claim is:

> Recrafts can be installed as a local MVP release candidate, coordinate visual analysis with a capability-declaring Host Agent through a versioned JSON Envelope, validate Host-supplied analysis, generate standalone visual realizations, and run bounded fidelity verification in a clean environment.

This claim excludes embedded model inference, verified compatibility with every Host Agent, public registry publication, production service reliability, unrestricted website reconstruction, full VIS generation, direct CraftsOS integration and production readiness.
