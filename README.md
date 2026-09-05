# dsh-verified-ralph

English | [中文](README.zh.md)

`dsh-verified-ralph` is a standalone DeepSeek Harness function plugin that adds `verified_ralph` alongside the official `ralph` tool. Every round starts a fresh local child over the shared workspace, projects its immutable DSH session into observable trajectory steps, and asks `ctx.verifier` for an independent completion-progress score.

The plugin does not modify DSH core and does not redefine verifier APIs. Its reproducible build dependency pins `dsh-as-a-verifier` merge commit `359c41e6f3882c720c1d41f79d4f3ed6cb7d05f5` (release `v0.2.6`); at runtime it requires verifier protocol 1 with offline progress tracking. The underlying progress method derives from llm-as-a-verifier (<https://github.com/llm-as-a-verifier/llm-as-a-verifier>) at commit `8db8a114355a9d7fdf9a8d1d5c87f6aeebd18770`. Attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

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
  github:omdsh-dev/dsh-as-a-verifier#v0.2.6 \
  github:omdsh-dev/dsh-verified-ralph#v0.2.1
```

Use the corresponding Headless profile commands when appropriate. Because this Git package deliberately pins another Git package, pnpm 11 callers must opt into that audited dependency edge and both prepare builds:

```yaml
blockExoticSubdeps: false
allowBuilds:
  dsh-verified-ralph@https://codeload.github.com/omdsh-dev/dsh-verified-ralph/tar.gz/<verified-ralph-commit>: true
  dsh-as-a-verifier@https://codeload.github.com/omdsh-dev/dsh-as-a-verifier/tar.gz/359c41e6f3882c720c1d41f79d4f3ed6cb7d05f5: true
```

Replace `<verified-ralph-commit>` with the installed commit, and always copy the exact current keys printed by pnpm when following a newer default branch. Release tags are created only from validated `main` merges and are never moved. Compatible fixes increment patch; public orchestration additions increment minor; an incompatible required verifier protocol increments major. The bundle inserts only `dsh-verified-ralph`; deployment owns the separate verifier row and credentials.

## Contract

The function plugin exports `name`, `inject`, `Config`, and `apply`, with no default export. It requires `tools`, `subagents`, `systemPrompt`, and `verifier`. Activation fails before registering guidance or tools unless `ctx.verifier.protocolVersion === 1` and `offlineProgressTracking` is available.

```ts
await tools.verified_ralph({
  objective: 'Implement the requested change and prove the relevant checks pass.',
  maxRounds: 8,
  maxVerifierCalls: 16,
  maxWallTimeMs: 900_000,
})
```

Every child receives only the immutable objective, round metadata, shared-workspace instructions, the previous bounded report, and optional fixed verifier correction. The configured provider must support structured output and per-child `agentOptions`, must not inherit parent context, and must return `localAgent`; remote/report-only fallback is forbidden.

After a successful child result, the plugin groups assistant messages, tool calls, and tool results between each `step/start` and `step/end`, then calls `ctx.verifier.track()` on the last completed step. The full task and projected child trajectory are sent to the configured DeepSeek verifier endpoint. Child sessions retain their ordinary prompts and trajectory; the parent retains the canonical final tool result. This plugin adds no custom session events.

Successful statuses are:

- `verified-complete`: the worker reported complete and progress met the completion threshold.
- `blocked`: a worker reported a concrete blocker; `verified` remains false.
- `stagnated`: verifier correction received its full grace period without sufficient gain.
- `budget-limited`: the configured/caller round cap was reached.
- `verifier-call-budget-limited`: the next round cannot fit within the verifier-call ceiling.
- `verifier-token-budget-limited`: metered verifier input plus completion tokens reached the ceiling.
- `time-budget-limited`: the wall-clock deadline cancelled the in-flight child or verifier work and all resources settled.
- `child-token-budget-limited`: a fresh child reached its per-request output-token ceiling.

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
| `maxVerifierCalls` | `512` | Deployment/call ceiling; each round reserves `nEvaluations` before starting |
| `maxVerifierTokens` | `8388608` | Metered verifier input + completion tokens; checked before every later round |
| `maxWallTimeMs` | `3600000` | Foreground wall-clock deadline, including cleanup |
| `maxChildTokens` | `32768` | Output-token ceiling applied to every fresh child model request |

A rejected completion immediately issues correction. Otherwise, a full stagnation window whose last-to-first gain is below `minProgressGain` issues correction. A later score at least `minProgressGain` above the pre-correction best clears it; otherwise the run stops after the grace rounds.

The canonical result includes run/status counts, final report, every child id and score, per-round child/verifier usage and policy decision, aggregate usage, threshold, final score, `verified`, and a complete budget limits/consumption/exhaustion envelope. A budget may stop before any score exists, in which case `report` and `finalScore` are `null`. Verifier tokens come from the remote API's authoritative post-request usage; because the API exposes no exact preflight tokenizer, this limit prevents subsequent work but may be crossed by the final accepted evaluation. Calls, child output, rounds, and wall time have preflight or cancellation enforcement.

## Development

```sh
pnpm install
pnpm run verify:self-contained
pnpm run typecheck
pnpm test
pnpm run build
pnpm run prepare
```

Pull requests and `main` pushes run the complete Ubuntu/Windows matrix on Node 24 and the exact minimum Node 22.19.0, plus exact-commit Git-install and real Web/Headless profile-install smokes on Node 24. The profile smoke installs both plugins into the latest npm-published DSH CLI (`0.1.2-rc.1`), checks peers, verifies the official `ralph` and `verified_ralph` rows coexist, and boots each surface through a clean help exit. A separate source-contract gate pins audited DSH `dsh-v0.1.3-alpha.1` (`d347e703908d0406b7a7ef80e3a0e594d86b2215`) and verifies the one-shot subagent, child token-limit, usage, and Session v2 seams. These targets are deliberately separate because the audited alpha release is not yet available from npm. CI remains keyless.

The credentialed release gate is `pnpm run test:e2e:full -- --ref <exact-consumer-sha> --evidence <output.json>`. It installs exact Git commits into a temporary Headless profile and exercises the complete parent → `verified_ralph` → real `spawn` child → shared workspace → durable SessionEvent → DeepSeek verifier → policy path. The evidence file uses `dsh-verified-ralph-release-evidence/v1` and contains only exact component identities, endpoint kind, model, usage counters, terminal status, score, budget reason, runtime, and elapsed time. It never includes the API key, objective, prompts, reports, trajectories, tool arguments/results, run id, or child ids.

Releases remain manual. A maintainer first dispatches `release-check` for the exact current `main` SHA and version, waits for all keyless gates and Git installation to pass, then creates an annotated tag. The tag triggers the same read-only check again; after it is green, publish a non-draft, non-prerelease GitHub Release for the immutable tag. Tags are never created or moved by Actions, and npm is not used as a release channel. Local real-API E2E is required only when backend, prompt, or decoder behavior changes.

## Boundaries

No DSH core changes, official `ralph` replacement, remote provider fallback, multimodal verification, background/process-resumable Ralph, currency pricing, UI, or alternate verifier backend are included.

## License

[MIT](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for upstream notices.
