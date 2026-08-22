import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { decidePolicy } from '../src/policy.ts'

const config = resolveConfig({})
const continued = { status: 'continue' as const, summary: 'Working.', evidence: [], nextSteps: ['Continue.'], blocker: '' }
const complete = { status: 'complete' as const, summary: 'Done.', evidence: ['tests pass'], nextSteps: [], blocker: '' }
const blocked = { status: 'blocked' as const, summary: 'Blocked.', evidence: [], nextSteps: [], blocker: 'Need credentials.' }

describe('verified Ralph policy', () => {
  it('accepts only independently verified completion and preserves blockers', () => {
    expect(decidePolicy({ round: 1, score: 0.9, scores: [0.9], report: complete, atBudget: false }, config)).toMatchObject({ terminal: 'verified-complete' })
    expect(decidePolicy({ round: 1, score: 0.1, scores: [0.1], report: blocked, atBudget: false }, config)).toMatchObject({ terminal: 'blocked' })
  })

  it('rejects low completion, grants two correction rounds, then stops', () => {
    const issued = decidePolicy({ round: 1, score: 0.2, scores: [0.2], report: complete, atBudget: false }, config)
    expect(issued).toMatchObject({ decision: 'correction-issued', issueCorrection: true })
    const grace = decidePolicy({ round: 2, score: 0.21, scores: [0.2, 0.21], report: continued, correction: issued.correction!, atBudget: false }, config)
    expect(grace.decision).toBe('correction-grace')
    const stopped = decidePolicy({ round: 3, score: 0.22, scores: [0.2, 0.21, 0.22], report: continued, correction: issued.correction!, atBudget: false }, config)
    expect(stopped.terminal).toBe('stagnated')
  })

  it('detects a stagnant three-round window and clears correction after real gain', () => {
    const issued = decidePolicy({ round: 3, score: 0.12, scores: [0.1, 0.11, 0.12], report: continued, atBudget: false }, config)
    expect(issued.decision).toBe('correction-issued')
    const improved = decidePolicy({ round: 4, score: 0.18, scores: [0.1, 0.11, 0.12, 0.18], report: continued, correction: issued.correction!, atBudget: false }, config)
    expect(improved.decision).toBe('correction-cleared')
  })

  it('returns budget-limited when no other terminal condition wins', () => {
    expect(decidePolicy({ round: 1, score: 0.4, scores: [0.4], report: continued, atBudget: true }, config).terminal).toBe('budget-limited')
  })
})
