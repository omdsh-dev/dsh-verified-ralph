import type { Context } from '@deepseek-ai/cordis'
import type { SubagentStartRequest } from '@deepseek-ai/dsh-subagent'
import { describe, expect, it, vi } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { runVerifiedRalph } from '../src/runner.ts'
import { parent, sessionEvents, usage } from './helpers.ts'

const continued = { status: 'continue', summary: 'Working.', evidence: [], nextSteps: ['Continue.'], blocker: '' }
const complete = { status: 'complete', summary: 'Done.', evidence: ['tests pass'], nextSteps: [], blocker: '' }
const blocked = { status: 'blocked', summary: 'Blocked.', evidence: [], nextSteps: [], blocker: 'Need credentials.' }

function setup(reports: unknown[], scores: number[], options: { remote?: boolean, stopReason?: string } = {}) {
  const requests: SubagentStartRequest[] = []
  let disposed = 0
  const verifier = {
    track: vi.fn(async () => {
      const score = scores.shift()
      if (score === undefined) throw new Error('missing test score')
      return { steps: [1], scores: [score], perEvaluationScores: [[score], [score]], final: score, verifierCalls: 1, usage }
    }),
  }
  const subagents = {
    getProvider: () => ({ name: 'spawn', capabilities: { outputSchema: true }, inheritsParentContext: false }),
    async start(_name: string, request: SubagentStartRequest) {
      requests.push(request)
      const report = reports.shift()
      const id = `child-${requests.length}`
      return {
        id,
        localAgent: options.remote ? undefined : { id, session: { events: sessionEvents(`round ${requests.length}`) } },
        result: Promise.resolve({ output: [], structured: report, stopReason: options.stopReason ?? 'completed' }),
        async dispose() { disposed += 1 },
      }
    },
  }
  return {
    ctx: { subagents, verifier } as unknown as Context,
    requests,
    verifier,
    disposed: () => disposed,
  }
}

describe('verified Ralph runner', () => {
  it('returns independently verified completion with canonical progress and usage', async () => {
    const test = setup([complete], [0.9])
    const result = await runVerifiedRalph(test.ctx, resolveConfig({ maxRounds: 3 }), { objective: 'Ship it.' }, parent, new AbortController().signal)
    expect(result).toMatchObject({ status: 'verified-complete', roundsStarted: 1, agentsStarted: 1 })
    expect(result.verification).toEqual({ completionThreshold: 0.85, finalScore: 0.9, verified: true })
    expect(result.progress[0]).toMatchObject({ childId: 'child-1', decision: 'verified-complete', score: 0.9 })
    expect(test.verifier.track).toHaveBeenCalledWith(expect.objectContaining({ checkpointSteps: [1], nEvaluations: 2 }))
    expect(test.disposed()).toBe(1)
  })

  it('rejects completion, sends fixed correction, and stops persistent stagnation', async () => {
    const test = setup([complete, continued, continued], [0.2, 0.21, 0.22])
    const result = await runVerifiedRalph(test.ctx, resolveConfig({ maxRounds: 5 }), { objective: 'Ship it.' }, parent, new AbortController().signal)
    expect(result.status).toBe('stagnated')
    expect(result.progress.map(row => row.decision)).toEqual(['correction-issued', 'correction-grace', 'stagnated'])
    const secondPrompt = (test.requests[1]?.prompt[0] as { text: string }).text
    expect(secondPrompt).toContain('Independent progress score 0.2000')
    expect(secondPrompt).toContain('inspect the real workspace')
    expect(test.disposed()).toBe(3)
  })

  it('preserves a worker blocker without claiming verification and enforces budget', async () => {
    const blockedTest = setup([blocked], [0.1])
    const blockedResult = await runVerifiedRalph(blockedTest.ctx, resolveConfig({ maxRounds: 2 }), { objective: 'Ship it.' }, parent, new AbortController().signal)
    expect(blockedResult.status).toBe('blocked')
    expect(blockedResult.verification.verified).toBe(false)

    const budgetTest = setup([continued], [0.4])
    const budget = await runVerifiedRalph(budgetTest.ctx, resolveConfig({ maxRounds: 1 }), { objective: 'Ship it.' }, parent, new AbortController().signal)
    expect(budget.status).toBe('budget-limited')
  })

  it('fails strictly for remote providers, child failure, verifier failure, and cancellation', async () => {
    const remote = setup([complete], [0.9], { remote: true })
    await expect(runVerifiedRalph(remote.ctx, resolveConfig({ maxRounds: 1 }), { objective: 'Ship it.' }, parent, new AbortController().signal)).rejects.toThrow('remote/report-only')
    expect(remote.disposed()).toBe(1)

    const failed = setup([complete], [0.9], { stopReason: 'error' })
    await expect(runVerifiedRalph(failed.ctx, resolveConfig({ maxRounds: 1 }), { objective: 'Ship it.' }, parent, new AbortController().signal)).rejects.toThrow('ended with error')
    expect(failed.verifier.track).not.toHaveBeenCalled()

    const verifierFailure = setup([complete], [0.9])
    verifierFailure.verifier.track.mockRejectedValueOnce(new Error('verifier unavailable'))
    await expect(runVerifiedRalph(verifierFailure.ctx, resolveConfig({ maxRounds: 1 }), { objective: 'Ship it.' }, parent, new AbortController().signal)).rejects.toThrow('verifier unavailable')
    expect(verifierFailure.disposed()).toBe(1)

    const controller = new AbortController()
    controller.abort(new Error('cancelled'))
    await expect(runVerifiedRalph(setup([], []).ctx, resolveConfig({}), { objective: 'Ship it.' }, parent, controller.signal)).rejects.toThrow('cancelled')
  })

  it('rejects bad provider capabilities and caller limits before starting work', async () => {
    const missing = { subagents: { getProvider: () => undefined } } as unknown as Context
    await expect(runVerifiedRalph(missing, resolveConfig({}), { objective: 'Ship it.' }, parent, new AbortController().signal)).rejects.toThrow('not registered')
    const inherited = { subagents: { getProvider: () => ({ capabilities: { outputSchema: true }, inheritsParentContext: true }) } } as unknown as Context
    await expect(runVerifiedRalph(inherited, resolveConfig({}), { objective: 'Ship it.' }, parent, new AbortController().signal)).rejects.toThrow('requires fresh')
    const test = setup([], [])
    await expect(runVerifiedRalph(test.ctx, resolveConfig({ maxRounds: 2 }), { objective: 'Ship it.', maxRounds: 3 }, parent, new AbortController().signal)).rejects.toThrow('exceeds deployment')
  })
})
