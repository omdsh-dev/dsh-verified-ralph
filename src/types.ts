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

export type VerifiedRalphStatus = 'verified-complete' | 'blocked' | 'stagnated' | 'budget-limited'

export type VerifiedRalphDecision =
  | 'continue'
  | 'correction-issued'
  | 'correction-grace'
  | 'correction-cleared'
  | 'verified-complete'
  | 'blocked'
  | 'stagnated'
  | 'budget-limited'

export interface VerifiedRalphRound {
  readonly round: number
  readonly childId: string
  readonly score: number
  readonly verifierCalls: number
  readonly usage: VerifierUsage
  readonly decision: VerifiedRalphDecision
}

export interface VerifiedRalphResult {
  readonly runId: string
  readonly status: VerifiedRalphStatus
  readonly roundsStarted: number
  readonly agentsStarted: number
  readonly report: RalphRoundReport
  readonly progress: readonly VerifiedRalphRound[]
  readonly usage: VerifierUsage
  readonly verification: {
    readonly completionThreshold: number
    readonly finalScore: number
    readonly verified: boolean
  }
}
