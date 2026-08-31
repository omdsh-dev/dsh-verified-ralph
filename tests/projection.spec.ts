import { describe, expect, it } from 'vitest'
import { projectChildUsage, projectSessionSteps } from '../src/projection.ts'
import { sessionEvents } from './helpers.ts'

describe('session projection', () => {
  it('preserves assistant, tool call, and tool result order inside completed steps', () => {
    const [step] = projectSessionSteps(sessionEvents())
    expect(step).toContain('Assistant output')
    expect(step).toContain('verified output')
    expect(step).toContain('Tool call test')
    expect(step).toContain('Tool result')
    expect(step?.indexOf('Assistant output')).toBeLessThan(step?.indexOf('Tool call') ?? 0)
  })

  it('aggregates authoritative child token usage', () => {
    expect(projectChildUsage(sessionEvents())).toEqual({
      inputTokens: 20, cacheReadTokens: 4, cacheWriteTokens: 0,
      outputTokens: 5, reasoningTokens: 2, totalTokens: 29,
    })
  })

  it('rejects absent and unbalanced completed steps', () => {
    expect(() => projectSessionSteps([])).toThrow('no completed')
    expect(() => projectSessionSteps(sessionEvents().slice(0, 2))).toThrow('open step')
  })
})
