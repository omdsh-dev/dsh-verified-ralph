/** Sanitized, machine-readable evidence for one full verified Ralph run. @module dsh-verified-ralph/evidence */

import type { VerifiedRalphResult } from './types.ts'

export interface ReleaseEvidenceContext {
  readonly generatedAt?: string
  readonly deepseekHarness: { readonly version: string; readonly commit: string }
  readonly provider: { readonly version: string; readonly commit: string }
  readonly consumer: { readonly version: string; readonly commit: string }
  readonly endpoint: 'official' | 'custom'
  readonly model: string
  readonly elapsedMs: number
  readonly runtime: { readonly node: string; readonly platform: string; readonly arch: string }
}

export interface VerifiedRalphReleaseEvidence {
  readonly schema: 'dsh-verified-ralph-release-evidence/v1'
  readonly generatedAt: string
  readonly deepseekHarness: ReleaseEvidenceContext['deepseekHarness']
  readonly plugins: {
    readonly provider: ReleaseEvidenceContext['provider']
    readonly consumer: ReleaseEvidenceContext['consumer']
  }
  readonly verifier: {
    readonly endpoint: ReleaseEvidenceContext['endpoint']
    readonly model: string
    readonly calls: number
    readonly inputTokens: number
    readonly cachedInputTokens: number
    readonly outputTokens: number
    readonly reasoningTokens: number
  }
  readonly run: {
    readonly status: VerifiedRalphResult['status']
    readonly roundsStarted: number
    readonly agentsStarted: number
    readonly finalScore: number | null
    readonly verified: boolean
    readonly elapsedMs: number
    readonly exhaustedBudget: VerifiedRalphResult['budget']['exhausted']
  }
  readonly runtime: ReleaseEvidenceContext['runtime']
}

function normalized(value: string, field: string): string {
  if (value.length === 0 || value !== value.trim()) throw new TypeError(`${field} must be a non-empty normalized string`)
  return value
}

function commit(value: string, field: string): string {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new TypeError(`${field} must be an exact 40-character commit SHA`)
  return value
}

/** Project a full result onto an allowlisted envelope that excludes prompts, reports, trajectories, child ids, and credentials. */
export function createReleaseEvidence(
  result: VerifiedRalphResult,
  context: ReleaseEvidenceContext,
): VerifiedRalphReleaseEvidence {
  if (!Number.isSafeInteger(context.elapsedMs) || context.elapsedMs < 0) throw new TypeError('elapsedMs must be a non-negative safe integer')
  const generatedAt = context.generatedAt ?? new Date().toISOString()
  if (!Number.isFinite(Date.parse(generatedAt))) throw new TypeError('generatedAt must be an ISO timestamp')
  return {
    schema: 'dsh-verified-ralph-release-evidence/v1',
    generatedAt,
    deepseekHarness: {
      version: normalized(context.deepseekHarness.version, 'deepseekHarness.version'),
      commit: commit(context.deepseekHarness.commit, 'deepseekHarness.commit'),
    },
    plugins: {
      provider: {
        version: normalized(context.provider.version, 'provider.version'),
        commit: commit(context.provider.commit, 'provider.commit'),
      },
      consumer: {
        version: normalized(context.consumer.version, 'consumer.version'),
        commit: commit(context.consumer.commit, 'consumer.commit'),
      },
    },
    verifier: {
      endpoint: context.endpoint,
      model: normalized(context.model, 'model'),
      calls: result.usage.calls,
      inputTokens: result.usage.inputTokens,
      cachedInputTokens: result.usage.cachedInputTokens,
      outputTokens: result.usage.outputTokens,
      reasoningTokens: result.usage.reasoningTokens,
    },
    run: {
      status: result.status,
      roundsStarted: result.roundsStarted,
      agentsStarted: result.agentsStarted,
      finalScore: result.verification.finalScore,
      verified: result.verification.verified,
      elapsedMs: context.elapsedMs,
      exhaustedBudget: result.budget.exhausted,
    },
    runtime: {
      node: normalized(context.runtime.node, 'runtime.node'),
      platform: normalized(context.runtime.platform, 'runtime.platform'),
      arch: normalized(context.runtime.arch, 'runtime.arch'),
    },
  }
}
