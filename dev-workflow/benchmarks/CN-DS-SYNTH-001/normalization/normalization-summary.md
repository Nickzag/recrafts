# Common Normalization Summary

Exact runtime: `recrafts-0.5.0-rc.1.tgz`

SHA-256: `da0ba9ee4012028d55e7e975140fabf7705b59a624b6b085d339dac77636efcf`

| Candidate | Frozen source mutated | Parse | Compile | Contribution retained |
|---|---:|---|---|---|
| Sol | no | FAIL | NOT_COMPILED | system architecture, component semantics, Agent rules |
| Kimi | no | FAIL | NOT_COMPILED | screenshot-grounded visual and control detail |
| Grok | no | PASS | PASS | schema, provenance, measurement and unknown discipline |

The two formal failures are caused by missing frozen `recrafts.design/v1` Front Matter. They are not repaired in place and are not treated as evidence that the semantic contents are worthless. Original cross-run score ranking remains invalid; this table only reports identical-toolchain behavior.
