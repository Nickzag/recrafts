# CN-DS-SYNTH-001 Input Freeze Result

```text
INPUT_FREEZE = PASS
```

## Identity

- Frozen Input ZIP SHA-256: `48883397c896d7058fb99455d7af082d600638a1461ca468a7fcf4c4f55a7fc3`
- Sol bundle SHA-256: `71ce490e52581e7f9834e8da22953a557139c857ce72876960097100111416a8`
- Kimi bundle SHA-256: `792d0dfa9ccb2d9e1753661b43e60845ad21ae9e7a86aa27c68c5dac79ae97a3`
- Grok bundle SHA-256: `aa755847165d2a13570fff8ee4a1ddd59360f6e61bb865a1196fe359383cb49e`
- Cross-model review SHA-256: `07e000d899ce4ee3c58eede34b028866931f8bfee966513affef6d0209ec720b`
- Normalization runtime SHA-256: `da0ba9ee4012028d55e7e975140fabf7705b59a624b6b085d339dac77636efcf`
- Baseline commit: `5ecf5f5e8f6a4514c91a955e48144aa086cb375c`
- Task branch: `task/CN-DS-SYNTH-001-canonical-synthesis`
- Worktree: `/Users/Nick/Documents/CraftsOS/.worktrees/recrafts-cn-ds-synth-001`

The pushed R-012 runtime manifest, frozen input runtime manifest, and supplied tarball agree on `da0ba9ee...`. The 13 screenshot identities are listed in `source-pack-sha256.json`; every recovered screenshot is byte-identical across the three submitted bundles.

## Boundary

This freeze does not make historical Gate scores comparable and does not repair historical benchmark runtime or Authority Manifest asymmetry. Candidate source files remain external, read-only inputs. No model was rerun.
