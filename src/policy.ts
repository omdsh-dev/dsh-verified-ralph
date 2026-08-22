/** Conservative verifier-gated Ralph state machine. @module dsh-verified-ralph/policy */

import type { ResolvedConfig } from './config.ts'
import type { RalphRoundReport, VerifiedRalphDecision, VerifiedRalphStatus } from './types.ts'

export interface CorrectionState {
  readonly startRound: number
  readonly baselineBest: number
}

export interface PolicyInput {
  readonly round: number
  readonly score: number
  readonly scores: readonly number[]
  readonly report: RalphRoundReport
  readonly correction?: CorrectionState
  readonly atBudget: boolean
}

export interface PolicyDecision {
  readonly decision: VerifiedRalphDecision
  readonly terminal?: VerifiedRalphStatus
  readonly correction?: CorrectionState
  readonly issueCorrection: boolean
}

export function decidePolicy(input: PolicyInput, config: ResolvedConfig): PolicyDecision {
  if (input.report.status === 'complete' && input.score >= config.completionThreshold) {
    return { decision: 'verified-complete', terminal: 'verified-complete', issueCorrection: false }
  }
  if (input.report.status === 'blocked') {
    return { decision: 'blocked', terminal: 'blocked', issueCorrection: false }
  }

  let correction = input.correction
  let cleared = false
  if (correction !== undefined && input.score >= correction.baselineBest + config.minProgressGain) {
    correction = undefined
    cleared = true
  }

  const completeRejected = input.report.status === 'complete'
  const window = input.scores.slice(-config.stagnationWindow)
  const stagnantWindow = window.length === config.stagnationWindow
    && (window.at(-1) as number) - (window[0] as number) < config.minProgressGain
    && input.score < config.completionThreshold

  if (correction === undefined && (completeRejected || stagnantWindow)) {
    correction = { startRound: input.round, baselineBest: Math.max(...input.scores) }
    if (input.atBudget) return { decision: 'budget-limited', terminal: 'budget-limited', issueCorrection: false }
    return { decision: 'correction-issued', correction, issueCorrection: true }
  }

  if (correction !== undefined) {
    if (input.round - correction.startRound >= config.correctionGraceRounds) {
      return { decision: 'stagnated', terminal: 'stagnated', correction, issueCorrection: false }
    }
    if (input.atBudget) return { decision: 'budget-limited', terminal: 'budget-limited', correction, issueCorrection: false }
    return { decision: 'correction-grace', correction, issueCorrection: true }
  }

  if (input.atBudget) return { decision: 'budget-limited', terminal: 'budget-limited', issueCorrection: false }
  return { decision: cleared ? 'correction-cleared' : 'continue', issueCorrection: false }
}
