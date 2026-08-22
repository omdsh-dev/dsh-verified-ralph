/** Deployment policy for verified fresh-agent Ralph runs. @module dsh-verified-ralph/config */

import z from '@deepseek-ai/schemastery'

export interface Config {
  readonly subagentProvider?: string
  readonly maxRounds?: number
  readonly maxHandoffChars?: number
  readonly maxResultChars?: number
  readonly nEvaluations?: number
  readonly completionThreshold?: number
  readonly stagnationWindow?: number
  readonly minProgressGain?: number
  readonly correctionGraceRounds?: number
}

export interface ResolvedConfig {
  readonly subagentProvider: string
  readonly maxRounds: number
  readonly maxHandoffChars: number
  readonly maxResultChars: number
  readonly nEvaluations: number
  readonly completionThreshold: number
  readonly stagnationWindow: number
  readonly minProgressGain: number
  readonly correctionGraceRounds: number
}

export const Config = z.object({
  subagentProvider: z.string().default('spawn'),
  maxRounds: z.number().step(1).min(1).default(256),
  maxHandoffChars: z.number().step(1).min(1).default(16_384),
  maxResultChars: z.number().step(1).min(1).default(16_384),
  nEvaluations: z.number().step(1).min(1).default(2),
  completionThreshold: z.number().min(0).max(1).default(0.85),
  stagnationWindow: z.number().step(1).min(2).default(3),
  minProgressGain: z.number().min(0).max(1).default(0.05),
  correctionGraceRounds: z.number().step(1).min(1).default(2),
}) as unknown as z<Config>

function positive(value: number, field: string, minimum = 1): number {
  if (!Number.isSafeInteger(value) || value < minimum) throw new TypeError(`${field} must be an integer >= ${minimum}`)
  return value
}

function probability(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new TypeError(`${field} must be within [0, 1]`)
  return value
}

export function resolveConfig(config: Config): ResolvedConfig {
  const subagentProvider = config.subagentProvider ?? 'spawn'
  if (subagentProvider.length === 0 || subagentProvider !== subagentProvider.trim()) {
    throw new TypeError('subagentProvider must be a non-empty normalized string')
  }
  return {
    subagentProvider,
    maxRounds: positive(config.maxRounds ?? 256, 'maxRounds'),
    maxHandoffChars: positive(config.maxHandoffChars ?? 16_384, 'maxHandoffChars'),
    maxResultChars: positive(config.maxResultChars ?? 16_384, 'maxResultChars'),
    nEvaluations: positive(config.nEvaluations ?? 2, 'nEvaluations'),
    completionThreshold: probability(config.completionThreshold ?? 0.85, 'completionThreshold'),
    stagnationWindow: positive(config.stagnationWindow ?? 3, 'stagnationWindow', 2),
    minProgressGain: probability(config.minProgressGain ?? 0.05, 'minProgressGain'),
    correctionGraceRounds: positive(config.correctionGraceRounds ?? 2, 'correctionGraceRounds'),
  }
}
