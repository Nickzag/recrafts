# Migration notes

- Previous package: `0.5.0-rc.1`; candidate package: `0.6.0-rc.1`.
- Reason: additive pre-stable minor capability expansion with Canonical Schema and report changes.
- Protocol remains 1.2 and the 11-operation inventory is unchanged.
- Existing R-012 calls remain valid. R-013 production qualification opts into `qualification_profile: r013-evidence-grounded` and supplies `design_intelligence_file`.
- Candidate comparison responses add required `decision_ledger_candidate`; consumers validating the full response Schema must update.
- No Accepted Release is created by migration and no public package is published.
