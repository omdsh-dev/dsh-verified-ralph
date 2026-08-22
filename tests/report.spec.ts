import { describe, expect, it } from 'vitest'
import { readReport } from '../src/report.ts'

describe('round report validation', () => {
  it('accepts normalized status-specific reports', () => {
    expect(readReport({ status: 'complete', summary: 'Done.', evidence: ['tests'], nextSteps: [], blocker: '' }, 1000).status).toBe('complete')
  })

  it('rejects malformed, inconsistent, and oversized reports', () => {
    expect(() => readReport({ status: 'continue', summary: 'Work.', evidence: [], nextSteps: [], blocker: '' }, 1000)).toThrow('needs nextSteps')
    expect(() => readReport({ status: 'complete', summary: 'Done.', evidence: [], nextSteps: [], blocker: '' }, 1000)).toThrow('needs evidence')
    expect(() => readReport({ status: 'blocked', summary: 'No.', evidence: [], nextSteps: [], blocker: '' }, 1000)).toThrow('concrete blocker')
    expect(() => readReport({ status: 'continue', summary: 'x'.repeat(100), evidence: [], nextSteps: ['next'], blocker: '' }, 20)).toThrow('exceeds')
  })
})
