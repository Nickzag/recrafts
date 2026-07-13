# Invalid Evidence Diagnostic

The corrected `1440x900` pixel run still contained repeated asset and font source records. Because Evidence IDs are content-addressed, those repetitions produced duplicate Evidence IDs and failed package validation. This run and its first Host submission are retained as negative diagnostics and excluded from qualification. The adapter now rejects duplicate source records and de-duplicates every captured collection before Evidence generation; the qualifying successor is `real-url-capture-v3`.
