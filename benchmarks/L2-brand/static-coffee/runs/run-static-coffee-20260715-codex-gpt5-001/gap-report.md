# Benchmark Gap Report

The installed Build 2 run successfully produced auditable Evidence, Claims, Tokens, Components, Grid Rules and Conflict output. Its submitted Package leaves `layout-rules.json` and `visual-grammar.json` empty and does not emit `artifact-set.json` at the `submit-analysis` stage.

R-009 records this as a benchmark result rather than silently changing the frozen runtime. The automatic Domain coverage score therefore receives 10/15, and Presentation Grammar and Possible Design Intent remain benchmark-only candidates outside the stable Recrafts contract.

Any runtime support for brand Layout Rules, Visual Grammar, Presentation Grammar or submit-stage Artifact Sets requires a separate development task and contract review.
