# CN-DS-SYNTH-001 Result

## Conclusion

```text
INPUT_FREEZE                         PASS
COMMON_NORMALIZATION                 COMPLETE
DECISION_LEDGER                      COMPLETE
CANONICAL_CANDIDATE                  COMPLETE
SOURCE_FIDELITY                      PASS
DESIGN_SYSTEM_COHERENCE              PASS
LAYOUTCRAFTS_UTILITY                 DEGRADED
OWNER_REVIEW                         READY
LAYOUTCRAFTS_IMPLEMENTATION          NOT AUTHORIZED
ACCEPTED_DESIGN_RELEASE              NOT CREATED
agent_usable                         false
```

## Frozen inputs

The exact Sol, Kimi and Grok Candidate bundles, cross-model review, 13-image Tier-A Source Pack and normalization runtime were frozen by SHA-256. The runtime identity is `recrafts-0.5.0-rc.1.tgz@da0ba9ee4012028d55e7e975140fabf7705b59a624b6b085d339dac77636efcf`; it agrees with the final R-012 runtime manifest and the supplied input manifest.

## Normalization

- Sol: semantic source retained; formal frozen-runtime parse/compile failed because the frozen `design.md` has no `recrafts.design/v1` Front Matter.
- Kimi: visual/detail source retained; formal frozen-runtime parse/compile failed for the same reason.
- Grok: formal parse and compile passed; its schema/provenance structure was used as a scaffold, not selected wholesale.

No Candidate was modified or rerun. Normalization failures do not erase useful evidence contributions.

## Synthesis

The 41-rule Decision Ledger resolves contributions rule by rule. The Candidate preserves the observed quiet shell, desktop three-region topology, All Docs projections, four distinct Inspector modes, settings composition, modal layer, focus composition, selection hierarchy, empty/loading distinction and content/chrome boundary. Unsupported phone/tablet behavior and exact breakpoints remain unknown.

Public authority remains:

```text
canonical-candidate/design.md    authoring source
canonical-candidate/preview.html deterministic visual proof
```

No parallel JSON Design System was promoted as a second source of truth.

## Qualification

The exact frozen parser/compiler accepted the Candidate. Gate B passed all production coherence checks and real Playwright screenshots at desktop, compact and mobile qualification widths. The shared Mainline Gate A checklist passed all 15 rule-fidelity checks against the exact Source Pack.

The frozen renderer remains a schematic contract specimen. Its browser-bound PASS proves deterministic coverage and DOM/style integrity; it does not constitute Owner visual-quality acceptance.

## Layoutcrafts handoff

The Integration Pack provides candidate identity, SHA binding, supported/unsupported semantics, 18-component inventory, 8-state inventory, responsive boundary, Agent rules and forbidden fallbacks. Utility is `DEGRADED` because responsive behavior and Owner-level visual direction are not fully evidenced.

## Boundaries

- No model rerun.
- No Accepted Design Release.
- No Owner PASS.
- No `agent_usable=true`.
- No Layoutcrafts migration.
- No merge or public release.

## Validation record

- `node scripts/validate-cn-ds-synth-001.mjs`: PASS; 21 tokens, 18 components, 8 states, 4 compositions, 33 Owner Bundle files.
- Focused R-012 parser/compiler/Preview/Gate/schema tests: 34 PASS, 0 FAIL.
- `git diff --check`: PASS.
- Full `npm test`: FAIL on 9 repository-level tests. One is the pre-existing repository-wide secret scanner treating `gap_token: spacing.section` as a credential pattern (49 historical hits plus the Candidate and its Bundle copy); one is sandboxed Chromium launch; the remaining seven are existing R-011/R-012 fixture/schema/Linux/Release inconsistencies outside this task scope. No Runtime or test file was changed to mask these failures.

Successful execution endpoint:

```text
CN-DS-SYNTH-001
→ CANONICAL CANDIDATE COMPLETE
→ NORMALIZED QUALIFICATION COMPLETE
→ OWNER REVIEW READY
→ LAYOUTCRAFTS HANDOFF READY
```
