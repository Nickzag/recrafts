# Interoperability Fixtures

These files are deterministic interoperability fixtures. They are not live model results and are not proof of visual quality or external Host compatibility.

The SVG is synthetic and contains no private source material. `host-analysis.fixture.json` demonstrates the `submit-analysis` protocol shape; its `prepared_analysis_id` placeholder is replaced by the clean-install smoke runner with the ID returned by `prepare-analysis`.

The clean-install runner uses a separate `deterministic-interoperability-fixture` Owner Decision only with `options.interoperability_fixture: true`. That fixture proves protocol flow and never represents project-owner approval.
