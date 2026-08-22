/** Defensive structured-report validation adapted from DSH tool-ralph (MIT). @module dsh-verified-ralph/report */

import type { RalphRoundReport, RalphRoundStatus } from './types.ts'
import type { ObjectJsonSchema } from '@deepseek-ai/dsh-tools'

export const REPORT_SCHEMA: ObjectJsonSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['continue', 'complete', 'blocked'] },
    summary: { type: 'string' },
    evidence: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
    blocker: { type: 'string' },
  },
  required: ['status', 'summary', 'evidence', 'nextSteps', 'blocker'],
  additionalProperties: false,
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalized(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function list(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(normalized)
}

export function readReport(value: unknown, maxChars: number): RalphRoundReport {
  if (!record(value)
    || Object.keys(value).sort().join(',') !== 'blocker,evidence,nextSteps,status,summary'
    || !['continue', 'complete', 'blocked'].includes(String(value.status))
    || !normalized(value.summary)
    || !list(value.evidence)
    || !list(value.nextSteps)
    || typeof value.blocker !== 'string'
    || value.blocker !== value.blocker.trim()) {
    throw new Error('verified Ralph child returned a malformed round report')
  }
  const report: RalphRoundReport = {
    status: value.status as RalphRoundStatus,
    summary: value.summary,
    evidence: value.evidence,
    nextSteps: value.nextSteps,
    blocker: value.blocker,
  }
  if (report.status === 'continue' && (report.nextSteps.length === 0 || report.blocker !== '')) {
    throw new Error('a continuing Ralph report needs nextSteps and an empty blocker')
  }
  if (report.status === 'complete' && (report.evidence.length === 0 || report.nextSteps.length !== 0 || report.blocker !== '')) {
    throw new Error('a complete Ralph report needs evidence, no nextSteps, and an empty blocker')
  }
  if (report.status === 'blocked' && !normalized(report.blocker)) {
    throw new Error('a blocked Ralph report needs a concrete blocker')
  }
  const chars = JSON.stringify(report).length
  if (chars > maxChars) throw new Error(`Ralph round report exceeds maxHandoffChars (${chars} > ${maxChars})`)
  return report
}
