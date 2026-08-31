/** Public verified Ralph result vocabulary. @module dsh-verified-ralph/types */

import type { VerifierUsage } from 'dsh-as-a-verifier'

export type RalphRoundStatus = 'continue' | 'complete' | 'blocked'

export interface RalphRoundReport {
  readonly status: RalphRoundStatus
  readonly summary: string
  readonly evidence: readonly string[]
  readonly nextSteps: readonly string[]
  readonly blocker: string
}

export type VerifiedRalphBudgetKind = 'rounds' | 'verifier-calls' | 'verifier-tokens' | 'wall-time' | 'child-tokens'

export type VerifiedRalphStatus =
  | 'verified-complete'
  | 'blocked'
  | 'stagnated'
  | 'budget-limited'
  | 'verifier-call-budget-limited'
  | 'verifier-token-budget-limited'
  | 'time-budget-limited'
  | 'child-token-budget-limited'

export type VerifiedRalphDecision =
  | 'continue'
  | 'correction-issued'
  | 'correction-grace'
  | 'correction-cleared'
  | 'verified-complete'
  | 'blocked'
  | 'stagnated'
  | 'budget-limited'

export interface VerifiedRalphChildUsage {
  readonly inputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
  readonly outputTokens: number
  readonly reasoningTokens: number
  readonly totalTokens: number
}

export interface VerifiedRalphBudget {
  readonly limits: {
    readonly rounds: number
    readonly verifierCalls: number
    /** Metered aggregate input + completion tokens reported by the verifier backend. */
    readonly verifierTokens: number
    readonly wallTimeMs: number
    /** Maximum output tokens for every fresh child model request. */
    readonly childTokensPerRequest: number
  }
  readonly consumed: {
    readonly rounds: number
    readonly verifierCalls: number
    readonly verifierTokens: number
    readonly wallTimeMs: number
    readonly childTokens: number
  }
  readonly exhausted: VerifiedRalphBudgetKind | null
}

export interface VerifiedRalphRound {
  readonly round: number
  readonly childId: string
  readonly score: number
  readonly verifierCalls: number
  readonly usage: VerifierUsage
  readonly childUsage: VerifiedRalphChildUsage
  readonly decision: VerifiedRalphDecision
}

export interface VerifiedRalphResult {
  readonly runId: string
  readonly status: VerifiedRalphStatus
  readonly roundsStarted: number
  readonly agentsStarted: number
  readonly report: RalphRoundReport | null
  readonly progress: readonly VerifiedRalphRound[]
  readonly usage: VerifierUsage
  readonly verification: {
    readonly completionThreshold: number
    readonly finalScore: number | null
    readonly verified: boolean
  }
  readonly budget: VerifiedRalphBudget
}
