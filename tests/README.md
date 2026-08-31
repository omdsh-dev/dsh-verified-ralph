# Tests

- `config.spec.ts`: conservative defaults and self-contained validation.
- `projection.spec.ts`: ordered assistant/tool event projection, child usage, and malformed brackets.
- `report.spec.ts`: strict structured handoff validation and size ceiling.
- `policy.spec.ts`: verified completion, correction, improvement, stagnation, blocker, and budget decisions.
- `runner.spec.ts`: local child orchestration, strict failure, correction prompts, usage, disposal, and explicit budget terminals.
- `evidence.spec.ts`: sanitized release-evidence allowlist and exact identity validation.
- `plugin.spec.ts`: Loader shape, official `ralph` coexistence, generic presentation, and scoped removal.
- `composition.spec.ts`: Web/Headless Loader composition with official `ralph` coexistence.
- `real-api.e2e.ts`: optional real DeepSeek progress call through a local session-backed verified Ralph round.
- `scripts/full-profile-e2e.mjs`: credentialed release gate through a real DSH Headless parent, `spawn` child, workspace, durable session, DeepSeek verifier, and policy result.
