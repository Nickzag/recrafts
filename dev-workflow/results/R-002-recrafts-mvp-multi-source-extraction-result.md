# R-002 Result

## Conclusion

R-002 已把旧 standalone mock 升级为 Host-Agent MVP Extraction Runtime，真实消费单图、13 图 input 或受限公开网站，输出 source classification、evidence map、Scoped Token candidates、Layout Grammar、Component candidates 和 draft `design.md`。状态为 `ready-for-human-review`；尚未取得项目所有者 extraction verdict，因此 R-003 未授权。

## R-001 Remediation Evidence

- Initial baseline: `6e32c10b17944199e5397e8834484d6f9685cd1d`, tag `recrafts-r001-baseline`.
- Remediated baseline: `83880e0991c9d38c44cd9e641350d9253eb0346f`, tag `recrafts-r001-remediated`.
- Clean-checkout evidence: `dev-workflow/evidence/r-001/`; logs record command, checkout, output and exit code.
- Oracle is isolated under `oracle/`; runtime rejects `oracle` and `expected-*` paths, and the production package allowlist excludes all examples/oracles.
- Fixture capability explicitly limits blurred evidence to macro layout, surface hierarchy, broad color family and partial state detection. Typography, micro spacing, icon geometry and pixel fidelity remain unsupported.
- Sanitization evidence records raw/sanitized hashes, transformation command/version, metadata result, pre/post scan refs, reviewer state and irreversibility.

## Runtime Architecture

`runtime/recraft-cli.mjs` exposes `analyze-image`, `analyze-images` and `analyze-website`. `runtime/extraction_runtime.mjs` owns bounded intake, capture, normalize, classify, extract, compose, validate and export-draft stages; each stage is persisted under `.stages/`, and non-empty output directories are never overwritten. `local_adapter.mjs` now delegates to this runtime; the previous hardcoded mock artifact generator no longer exists as a parallel implementation.

Host Agent remains responsible for visual interpretation. Scripts enforce file format, count, hashes, dimensions, duplicate detection, region bounds/classes, provenance, Scope, capability limits and deterministic Artifact composition; no cloud Provider or credential is introduced.

## Input Adapters And Runtime Runs

- Multi-image: 13/13 sanitized Craft UI inputs generated seven required extraction artifacts plus manifest/run/stage evidence under `crafts-ui-multi-image/generated/`.
- Single-image: sanitized empty-state input generated limited/partial output under `single-image/generated/`.
- Website A: `https://captured.framer.website/`, homepage, `1440×900`, Playwright screenshot plus runtime DOM/CSS/assets summary and draft extraction.
- Website B: supplemental `https://www.craft.do/`, homepage, `1440×900`, Playwright screenshot plus runtime DOM/CSS/assets summary and draft extraction. Login/download/checkout links were not opened or executed.

Website capture rejects non-HTTP(S), localhost/private networks, more than three routes, requested browser actions, credential forms, captcha/paywall, redirects and inaccessible responses. It does not crawl or submit forms.

## Generated Artifacts And Provenance

Each run emits `source-manifest.json`, `source-classification.json`, `evidence-map.json`, `tokens.json`, `layout.json`, `components.json`, `design.md`, `open-questions.md` and `run-log.json`. Observed candidates reference valid source/region evidence; excluded sensitive regions do not feed inference. Marketing candidates remain marketing-scoped and user content remains document-content scoped.

Exact typography, micro spacing, icon geometry and pixel fidelity are `not-testable` for blurred inputs. Website-level marketing classification is a bounded first pass; Host Agent/human review must refine subregions before candidate promotion.

## Determinism, Validators And Tests

- Two independent primary-fixture runs produced the same deterministic run ID and passed normalized comparison across eight artifacts.
- `npm run validate:r001`: pass after remediation.
- `npm run test:r001`: 13/13 pass.
- `npm run validate:r002`: pass across four runtime fixtures and six R-001 evidence files.
- `npm run test:r002`: 9/9 pass; grouped cases cover Oracle/expected injection, duplicate image, unsupported/secret-like input, changed-input sensitivity, repeatability and website safety limits.
- `npm test` and clean-checkout evidence are recorded in final verification evidence.

## Boundary Confirmation

- No CraftsOS or Layoutcrafts business code changed.
- No CraftsOS private import or hard dependency was added.
- No raw sensitive source was committed.
- No Provider credential, login bypass, form submission, destructive browser action or unbounded crawl occurred.
- No file was permanently deleted; historical generated website runs were retained as `generated-v1` when regenerated.
- No Preview App, production component package, fidelity verification, full website reconstruction or VIS was implemented or claimed.

## Human Review Status

`review/extraction-review.md` is `awaiting-project-owner-review`. Source classification, Scope, content isolation, visual direction, component omissions and confirmed/rejected promotions still require an external verdict. Passing validators cannot replace that review.

## Known Limitations

- Image pixels are not decoded into exact color/typography measurements; extraction uses validated region evidence and conservative capability labels.
- Public website DOM parsing is intentionally shallow and homepage-only; dynamic computed styles, cross-route behavior and interaction states are incomplete.
- Website screenshots/HTML are runtime evidence, not proof of visual fidelity or permission for full reconstruction.
- Region overlap is reported as warning where appropriate rather than treated as automatic failure.
- Independent code review Subagents were not used because project rules prohibit Subagents without explicit approval; local standards/spec review cannot replace ChatGPT independent review.

## R-003 Recommendation

Only after ChatGPT/project-owner review returns `PASS` or accepted `PASS WITH CHANGES` should R-003 Visual Realization Runtime begin.

> R-002 proves the Recrafts MVP extraction runtime for declared image and public-website inputs. It does not prove visual realization quality, production component implementation, fidelity verification, complete website reconstruction, full VIS generation, CraftsOS integration or production readiness.
