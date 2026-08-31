/** Verifier-gated fresh-agent Ralph workflow for DeepSeek Harness. @module dsh-verified-ralph */

export const name = 'dsh-verified-ralph'
export const inject = ['tools', 'subagents', 'systemPrompt', 'verifier']

export { Config, resolveConfig } from './config.ts'
export type { Config as PluginConfig, ResolvedConfig } from './config.ts'
export { decidePolicy } from './policy.ts'
export type { CorrectionState, PolicyDecision, PolicyInput } from './policy.ts'
export { projectChildUsage, projectSessionSteps } from './projection.ts'
export { createReleaseEvidence } from './evidence.ts'
export type { ReleaseEvidenceContext, VerifiedRalphReleaseEvidence } from './evidence.ts'
export { runVerifiedRalph } from './runner.ts'
export type { VerifiedRalphArgs } from './runner.ts'
export type {
  RalphRoundReport,
  RalphRoundStatus,
  VerifiedRalphBudget,
  VerifiedRalphBudgetKind,
  VerifiedRalphChildUsage,
  VerifiedRalphDecision,
  VerifiedRalphResult,
  VerifiedRalphRound,
  VerifiedRalphStatus,
} from './types.ts'
export { apply } from './runtime.ts'
