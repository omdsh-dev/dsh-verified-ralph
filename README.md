# dsh-verified-ralph

English | [中文](README.zh.md)

`dsh-verified-ralph` is a standalone DeepSeek Harness function plugin that adds `verified_ralph` alongside the official `ralph` tool. Every round starts a fresh local child over the shared workspace, projects its immutable DSH session into observable trajectory steps, and asks `ctx.verifier` for an independent completion-progress score.

The plugin does not modify DSH core and does not redefine verifier APIs. Its reproducible build dependency pins `dsh-as-a-verifier` merge commit `d74f80deb2de5b71004c4e81ed7c094eda663de0` (release `v0.2.4`); at runtime it requires verifier protocol 1 with offline progress tracking. The underlying progress method derives from llm-as-a-verifier (<https://github.com/llm-as-a-verifier/llm-as-a-verifier>) at commit `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770`. Attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

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
  github:omdsh-dev/dsh-as-a-verifier#v0.2.4 \
  github:omdsh-dev/dsh-verified-ralph#v0.1.3
```

Use the corresponding Headless profile commands when appropriate. Because this Git package deliberately pins another Git package, pnpm 11 callers must opt into that audited dependency edge and both prepare builds:

```yaml
blockExoticSubdeps: false
allowBuilds:
  dsh-verified-ralph@https://codeload.github.com/omdsh-dev/dsh-verified-ralph/tar.gz/<verified-ralph-commit>: true
  dsh-as-a-verifier@https://codeload.github.com/omdsh-dev/dsh-as-a-verifier/tar.gz/d74f80deb2de5b71004c4e81ed7c094eda663de0: true
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

Pull requests and `main` pushes run the complete Ubuntu/Windows matrix on Node 24 and the exact minimum Node 22.19.0, plus an exact-commit Git-install smoke on Node 24. A source-contract gate pins the audited DSH `dsh-v0.1.2-alpha.1` release (`cd5ef8148158c3a752a658978873241fdf8e2bbc`) and verifies the one-shot subagent and SessionEvent seams used by the verifier-gated flow. All actions use reviewed full-SHA pins and Node 24 action runtimes; CI does not read a DeepSeek key or call the real API. The stable `required` check is the branch-protection gate.

Releases remain manual. A maintainer first dispatches `release-check` for the exact current `main` SHA and version, waits for all keyless gates and Git installation to pass, then creates an annotated tag. The tag triggers the same read-only check again; after it is green, publish a non-draft, non-prerelease GitHub Release for the immutable tag. Tags are never created or moved by Actions, and npm is not used as a release channel. Local real-API E2E is required only when backend, prompt, or decoder behavior changes.

## Boundaries

No DSH core changes, official `ralph` replacement, remote provider fallback, multimodal verification, background/process-resumable Ralph, price/time budget, UI, or alternate verifier backend are included.

## License

[MIT](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for upstream notices.
