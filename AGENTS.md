# dsh-verified-ralph Contributor Notes

This repository is a standalone DeepSeek Harness consumer plugin. It gates fresh-agent Ralph completion with `ctx.verifier` and never modifies DSH core.

- Preserve function-plugin named exports: `name`, `inject`, `Config`, and `apply`; never add a default export.
- Keep provider-neutral verification in `dsh-as-a-verifier`; this package owns only Ralph orchestration policy.
- Keep every child, verifier request, tool registration, and system-prompt section scoped to the plugin or calling tool lifecycle.
- Require a fresh structured local subagent. Never fall back from a missing local session to worker self-report.
- Do not add custom session events. Child sessions and the final parent tool result are the durable evidence.
- Update both READMEs, public types, tests, and `cordis.patch.yml` with behavior changes.
- Run `verify:self-contained`, `typecheck`, complete tests, `build`, and `prepare` before delivery.
