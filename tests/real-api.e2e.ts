import type { Context } from '@deepseek-ai/cordis'
import { DeepSeekBackend, resolveConfig as resolveVerifierConfig, ScoreCache, VerifierService } from 'dsh-as-a-verifier'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'
import { runVerifiedRalph } from '../src/runner.ts'
import { parent, sessionEvents } from './helpers.ts'

const apiKey = process.env.DEEPSEEK_API_KEY?.trim()

describe('real DeepSeek verified Ralph path', () => {
  it.skipIf(apiKey === undefined || apiKey.length === 0)('scores a local session-backed child and returns canonical completion', async () => {
    const verifierConfig = resolveVerifierConfig({ nEvaluations: 1, retryAttempts: 1, cacheEnabled: false }, {
      get: name => name === 'DEEPSEEK_BASE_URL' && process.env.DEEPSEEK_BASE_URL !== undefined
        ? { value: process.env.DEEPSEEK_BASE_URL }
        : undefined,
    })
    const backend = new DeepSeekBackend({ config: verifierConfig, resolveApiKey: async () => apiKey })
    const verifier = new VerifierService(verifierConfig, backend, new ScoreCache('unused', false))
    let disposed = 0
    const ctx = {
      verifier,
      subagents: {
        getProvider: () => ({ capabilities: { outputSchema: true }, inheritsParentContext: false }),
        async start() {
          return {
            id: 'real-e2e-local-child',
            localAgent: { session: { events: sessionEvents('Returned the exact number 1 and observed it.') } },
            result: Promise.resolve({
              output: [], stopReason: 'completed',
              structured: { status: 'complete', summary: 'Returned 1.', evidence: ['Observed exact output 1.'], nextSteps: [], blocker: '' },
            }),
            async dispose() { disposed += 1 },
          }
        },
      },
    } as unknown as Context
    try {
      const result = await runVerifiedRalph(
        ctx,
        resolveConfig({ maxRounds: 1, nEvaluations: 1, completionThreshold: 0 }),
        { objective: 'Return the number one and verify the output.' },
        parent,
        new AbortController().signal,
      )
      expect(result.status).toBe('verified-complete')
      expect(result.verification.finalScore).toBeGreaterThanOrEqual(0)
      expect(result.verification.finalScore).toBeLessThanOrEqual(1)
      expect(result.usage.calls).toBe(1)
      expect(disposed).toBe(1)
    } finally {
      await verifier.dispose()
    }
  })
})
