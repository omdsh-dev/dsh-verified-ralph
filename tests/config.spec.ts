import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config.ts'

describe('configuration', () => {
  it('resolves the conservative defaults', () => {
    expect(resolveConfig({})).toEqual({
      subagentProvider: 'spawn', maxRounds: 256, maxHandoffChars: 16_384, maxResultChars: 16_384,
      nEvaluations: 2, completionThreshold: 0.85, stagnationWindow: 3,
      minProgressGain: 0.05, correctionGraceRounds: 2,
    })
  })

  it('rejects invalid self-contained policy', () => {
    expect(() => resolveConfig({ subagentProvider: ' ' })).toThrow('normalized')
    expect(() => resolveConfig({ maxRounds: 0 })).toThrow('integer')
    expect(() => resolveConfig({ stagnationWindow: 1 })).toThrow('>= 2')
    expect(() => resolveConfig({ completionThreshold: 2 })).toThrow('[0, 1]')
  })
})
