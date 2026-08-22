/** Host-side verified Ralph orchestration over public subagent and verifier seams. @module dsh-verified-ralph/runner */

import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { VerifierUsage } from 'dsh-as-a-verifier'
import type { ResolvedConfig } from './config.ts'
import { decidePolicy, type CorrectionState } from './policy.ts'
import { buildRoundPrompt, correctionMessage } from './prompt.ts'
import { projectSessionSteps } from './projection.ts'
import { readReport, REPORT_SCHEMA } from './report.ts'
import type { RalphRoundReport, VerifiedRalphResult, VerifiedRalphRound, VerifiedRalphStatus } from './types.ts'

export interface VerifiedRalphArgs {
  readonly objective: string
  readonly maxRounds?: number
}

function resolveMaxRounds(value: number | undefined, ceiling: number): number {
  const resolved = value ?? ceiling
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new TypeError('verified Ralph maxRounds must be a positive safe integer')
  if (resolved > ceiling) throw new TypeError(`verified Ralph maxRounds ${resolved} exceeds deployment ceiling ${ceiling}`)
  return resolved
}

function usageTotal(rows: readonly VerifiedRalphRound[]): VerifierUsage {
  const values = rows.reduce((total, row) => ({
    calls: total.calls + row.usage.calls,
    inputTokens: total.inputTokens + row.usage.inputTokens,
    cachedInputTokens: total.cachedInputTokens + row.usage.cachedInputTokens,
    outputTokens: total.outputTokens + row.usage.outputTokens,
    reasoningTokens: total.reasoningTokens + row.usage.reasoningTokens,
  }), { calls: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0 })
  return {
    ...values,
    uncachedInputTokens: values.inputTokens - values.cachedInputTokens,
    cacheHitRate: values.inputTokens === 0 ? 0 : values.cachedInputTokens / values.inputTokens,
  }
}

function terminalResult(
  runId: string,
  status: VerifiedRalphStatus,
  report: RalphRoundReport,
  progress: readonly VerifiedRalphRound[],
  config: ResolvedConfig,
): VerifiedRalphResult {
  const finalScore = progress.at(-1)?.score
  if (finalScore === undefined) throw new Error('verified Ralph terminated without a progress score')
  return {
    runId,
    status,
    roundsStarted: progress.length,
    agentsStarted: progress.length,
    report,
    progress,
    usage: usageTotal(progress),
    verification: {
      completionThreshold: config.completionThreshold,
      finalScore,
      verified: status === 'verified-complete',
    },
  }
}

/** Run one foreground sequence of fresh local children and gate every terminal decision. */
export async function runVerifiedRalph(
  ctx: Context,
  config: ResolvedConfig,
  args: VerifiedRalphArgs,
  parent: Agent,
  signal: AbortSignal,
): Promise<VerifiedRalphResult> {
  const objective = args.objective.trim()
  if (objective.length === 0) throw new TypeError('verified Ralph objective must be non-empty')
  const maxRounds = resolveMaxRounds(args.maxRounds, config.maxRounds)
  const provider = ctx.subagents.getProvider(config.subagentProvider)
  if (provider === undefined) throw new Error(`subagent provider "${config.subagentProvider}" is not registered`)
  if (!provider.capabilities.outputSchema) throw new Error(`subagent provider "${config.subagentProvider}" does not support structured output`)
  if (provider.inheritsParentContext) throw new Error(`subagent provider "${config.subagentProvider}" inherits parent context; verified Ralph requires fresh children`)

  const runId = randomUUID()
  const progress: VerifiedRalphRound[] = []
  const scores: number[] = []
  let previous: RalphRoundReport | undefined
  let correction: CorrectionState | undefined
  let correctionText: string | undefined

  for (let round = 1; round <= maxRounds; round += 1) {
    signal.throwIfAborted()
    const run = await ctx.subagents.start(config.subagentProvider, {
      label: `Verified Ralph round ${round}`,
      prompt: [{ type: 'text', text: buildRoundPrompt(objective, round, maxRounds, previous, correctionText) }],
      parent,
      signal,
      outputSchema: REPORT_SCHEMA,
    })
    try {
      if (run.localAgent === undefined) {
        throw new Error(`subagent provider "${config.subagentProvider}" returned no localAgent; remote/report-only verification is forbidden`)
      }
      const childResult = await run.result
      if (childResult.stopReason !== 'completed') {
        const detail = childResult.diagnostic === undefined ? '' : `: ${childResult.diagnostic}`
        throw new Error(`verified Ralph round ${round} child ended with ${childResult.stopReason}${detail}`)
      }
      const report = readReport(childResult.structured, config.maxHandoffChars)
      const steps = projectSessionSteps(run.localAgent.session.events)
      const tracked = await ctx.verifier.track({
        problem: objective,
        steps,
        checkpointSteps: [steps.length],
        nEvaluations: config.nEvaluations,
        signal,
      })
      scores.push(tracked.final)
      const policy = decidePolicy({
        round,
        score: tracked.final,
        scores,
        report,
        ...(correction === undefined ? {} : { correction }),
        atBudget: round === maxRounds,
      }, config)
      correction = policy.correction
      correctionText = policy.issueCorrection ? correctionMessage(tracked.final, config.completionThreshold) : undefined
      const row: VerifiedRalphRound = {
        round,
        childId: String(run.id),
        score: tracked.final,
        verifierCalls: tracked.verifierCalls,
        usage: tracked.usage,
        decision: policy.decision,
      }
      progress.push(row)
      previous = report
      if (policy.terminal !== undefined) return terminalResult(runId, policy.terminal, report, progress, config)
    } finally {
      await run.dispose()
    }
  }
  throw new Error('verified Ralph exhausted its loop without a terminal policy decision')
}
