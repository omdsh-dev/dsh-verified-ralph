# dsh-verified-ralph

English | [中文](README.zh.md)

`dsh-verified-ralph` is a standalone DeepSeek Harness function plugin that adds `verified_ralph` alongside the official `ralph` tool. Every round starts a fresh local child over the shared workspace, projects its immutable DSH session into observable trajectory steps, and asks `ctx.verifier` for an independent completion-progress score.

The plugin does not modify DSH core and does not redefine verifier APIs. Its reproducible build dependency pins `dsh-as-a-verifier` merge commit `64de9ff1c3b0000eff7a2efd47580403e8ea7ad2`; at runtime it requires verifier protocol 1 with offline progress tracking. The underlying progress method derives from llm-as-a-verifier (<https://github.com/llm-as-a-verifier/llm-as-a-verifier>) at commit `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770`. Attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Install

Install the latest default-branch revisions of both bundles together. Both repositories intentionally remain `private: true` npm packages and support Git/profile installation:

```sh
dsh plugin --profile web add \
  github:omdsh-dev/dsh-as-a-verifier \
  github:omdsh-dev/dsh-verified-ralph
```

The Profile lockfile freezes the commits resolved at install time; restart does not silently advance them. Update explicitly, then restart the Profile:

```sh
dsh plugin --profile web update dsh-as-a-verifier dsh-verified-ralph
```

For a reproducible stable deployment, pin immutable release tags:

```sh
dsh plugin --profile web add \
  github:omdsh-dev/dsh-as-a-verifier#v0.2.1 \
  github:omdsh-dev/dsh-verified-ralph#v0.1.1
```

Use the corresponding Headless profile commands when appropriate. Because this Git package deliberately pins another Git package, pnpm 11 callers must opt into that audited dependency edge and both prepare builds:

```yaml
blockExoticSubdeps: false
allowBuilds:
  dsh-verified-ralph@https://codeload.github.com/omdsh-dev/dsh-verified-ralph/tar.gz/<verified-ralph-commit>: true
  dsh-as-a-verifier@https://codeload.github.com/omdsh-dev/dsh-as-a-verifier/tar.gz/64de9ff1c3b0000eff7a2efd47580403e8ea7ad2: true
```

Replace `<verified-ralph-commit>` with the installed commit, and always copy the exact current keys printed by pnpm when following a newer default branch. Release tags are created only from validated `main` merges and are never moved. Compatible fixes increment patch; public orchestration additions increment minor; an incompatible required verifier protocol increments major. The bundle inserts only `dsh-verified-ralph`; deployment owns the separate verifier row and credentials.

## Contract

The function plugin exports `name`, `inject`, `Config`, and `apply`, with no default export. It requires `tools`, `subagents`, `systemPrompt`, and `verifier`. Activation fails before registering guidance or tools unless `ctx.verifier.protocolVersion === 1` and `offlineProgressTracking` is available.

```ts
await tools.verified_ralph({
  objective: 'Implement the requested change and prove the relevant checks pass.',
  maxRounds: 8,
})
```

Every child receives only the immutable objective, round metadata, shared-workspace instructions, the previous bounded report, and optional fixed verifier correction. The configured provider must support structured output, must not inherit parent context, and must return `localAgent`; remote/report-only fallback is forbidden.

After a successful child result, the plugin groups assistant messages, tool calls, and tool results between each `step/start` and `step/end`, then calls `ctx.verifier.track()` on the last completed step. The full task and projected child trajectory are sent to the configured DeepSeek verifier endpoint. Child sessions retain their ordinary prompts and trajectory; the parent retains the canonical final tool result. This plugin adds no custom session events.

Successful statuses are:

- `verified-complete`: the worker reported complete and progress met the completion threshold.
- `blocked`: a worker reported a concrete blocker; `verified` remains false.
- `stagnated`: verifier correction received its full grace period without sufficient gain.
- `budget-limited`: the configured/caller round cap was reached.

Child, session, report, verifier, cancellation, or provider failures fail the whole tool call. Completion below threshold is converted into correction, never accepted or silently tied.

## Conservative policy

| Field | Default | Meaning |
| --- | --- | --- |
| `subagentProvider` | `spawn` | Fresh structured local provider |
| `maxRounds` | `256` | Default and deployment ceiling |
| `maxHandoffChars` | `16384` | Serialized worker report ceiling |
| `maxResultChars` | `16384` | Rendered parent text ceiling; canonical data is unchanged |
| `nEvaluations` | `2` | Verifier repeats per round |
| `completionThreshold` | `0.85` | Minimum independently scored completion |
| `stagnationWindow` | `3` | Recent rounds used to detect insufficient gain |
| `minProgressGain` | `0.05` | Gain required to clear stagnation/correction |
| `correctionGraceRounds` | `2` | Full rounds allowed after correction |

A rejected completion immediately issues correction. Otherwise, a full stagnation window whose last-to-first gain is below `minProgressGain` issues correction. A later score at least `minProgressGain` above the pre-correction best clears it; otherwise the run stops after the grace rounds.

The canonical result includes run/status counts, final report, every child id and score, per-round verifier calls/usage/decision, aggregate usage, threshold, final score, and `verified`.

## Development

```sh
pnpm install
pnpm run verify:self-contained
pnpm run typecheck
pnpm test
pnpm run build
pnpm run prepare
```

## Boundaries

No DSH core changes, official `ralph` replacement, remote provider fallback, multimodal verification, background/process-resumable Ralph, price/time budget, UI, or alternate verifier backend are included.

## License

[MIT](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for upstream notices.
