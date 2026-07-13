# Recrafts MVP RC

Install the tarball locally, then invoke `recraft-interop` with one JSON Envelope on stdin. Visual analysis is two-phase: `prepare-analysis` returns `needs_host_action`; a vision-capable Host performs semantic analysis; `submit-analysis` validates that Host payload. Recrafts does not embed a vision provider. Host examples demonstrate protocol shape only and are not external-product certification.
