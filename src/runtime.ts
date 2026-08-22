/** Cordis activation boundary for dsh-verified-ralph. @module dsh-verified-ralph/runtime */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { VERIFIER_PROTOCOL_VERSION, type VerifierServiceApi } from 'dsh-as-a-verifier'
import { resolveConfig, type Config } from './config.ts'
import { registerVerifiedRalphTool } from './tools.ts'

export function assertVerifierCompatibility(verifier: VerifierServiceApi): void {
  if (verifier.protocolVersion !== VERIFIER_PROTOCOL_VERSION) {
    throw new Error(`dsh-verified-ralph requires ctx.verifier protocol ${VERIFIER_PROTOCOL_VERSION}; received ${String(verifier.protocolVersion)}`)
  }
  if (verifier.capabilities?.offlineProgressTracking !== true) {
    throw new Error('dsh-verified-ralph requires ctx.verifier capability offlineProgressTracking')
  }
}

export function apply(ctx: Context, config: Config): void {
  const resolved = resolveConfig(config)
  assertVerifierCompatibility(ctx.verifier)
  const unregisterGuidance = ctx.systemPrompt.section({
    name: 'tool:verified-ralph',
    order: 117,
    text: 'Use verified_ralph only when the direct human explicitly asks for verified Ralph or independently gated fresh-agent iteration. Each round is a fresh local child over the shared workspace; worker completion is accepted only after independent trajectory verification. Ordinary same-session work belongs to goal tools.',
  })
  ctx.effect(() => unregisterGuidance, 'dsh-verified-ralph: guidance')
  registerVerifiedRalphTool(ctx, resolved)
}
