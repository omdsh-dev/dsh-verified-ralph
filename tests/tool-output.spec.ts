import { describe, expect, it } from 'vitest'
import { renderVerifiedRalphResult } from '../src/tools.ts'
import type { VerifiedRalphResult } from '../src/types.ts'

const result: VerifiedRalphResult = {
  runId: 'run-keyless-snapshot',
  status: 'verified-complete',
  roundsStarted: 1,
  agentsStarted: 1,
  report: { status: 'complete', summary: 'Done.', evidence: ['tests pass'], nextSteps: [], blocker: '' },
  progress: [{
    round: 1,
    childId: 'child-1',
    score: 0.9,
    verifierCalls: 1,
    usage: { calls: 1, inputTokens: 10, cachedInputTokens: 2, uncachedInputTokens: 8, outputTokens: 3, reasoningTokens: 1, cacheHitRate: 0.2 },
    childUsage: { inputTokens: 20, cacheReadTokens: 4, cacheWriteTokens: 0, outputTokens: 5, reasoningTokens: 2, totalTokens: 29 },
    decision: 'verified-complete',
  }],
  usage: { calls: 1, inputTokens: 10, cachedInputTokens: 2, uncachedInputTokens: 8, outputTokens: 3, reasoningTokens: 1, cacheHitRate: 0.2 },
  verification: { completionThreshold: 0.85, finalScore: 0.9, verified: true },
  budget: {
    limits: { rounds: 3, verifierCalls: 6, verifierTokens: 10_000, wallTimeMs: 60_000, childTokensPerRequest: 32_768 },
    consumed: { rounds: 1, verifierCalls: 1, verifierTokens: 13, wallTimeMs: 100, childTokens: 29 },
    exhausted: null,
  },
}

describe('canonical keyless tool output', () => {
  it('keeps the generic text render stable', () => {
    expect(renderVerifiedRalphResult(result, 16_384)).toMatchInlineSnapshot(`
      [
        {
          "text": "Verified Ralph ended after 1 rounds with independently verified completion.
      {
        "runId": "run-keyless-snapshot",
        "status": "verified-complete",
        "roundsStarted": 1,
        "agentsStarted": 1,
        "report": {
          "status": "complete",
          "summary": "Done.",
          "evidence": [
            "tests pass"
          ],
          "nextSteps": [],
          "blocker": ""
        },
        "progress": [
          {
            "round": 1,
            "childId": "child-1",
            "score": 0.9,
            "verifierCalls": 1,
            "usage": {
              "calls": 1,
              "inputTokens": 10,
              "cachedInputTokens": 2,
              "uncachedInputTokens": 8,
              "outputTokens": 3,
              "reasoningTokens": 1,
              "cacheHitRate": 0.2
            },
            "childUsage": {
              "inputTokens": 20,
              "cacheReadTokens": 4,
              "cacheWriteTokens": 0,
              "outputTokens": 5,
              "reasoningTokens": 2,
              "totalTokens": 29
            },
            "decision": "verified-complete"
          }
        ],
        "usage": {
          "calls": 1,
          "inputTokens": 10,
          "cachedInputTokens": 2,
          "uncachedInputTokens": 8,
          "outputTokens": 3,
          "reasoningTokens": 1,
          "cacheHitRate": 0.2
        },
        "verification": {
          "completionThreshold": 0.85,
          "finalScore": 0.9,
          "verified": true
        },
        "budget": {
          "limits": {
            "rounds": 3,
            "verifierCalls": 6,
            "verifierTokens": 10000,
            "wallTimeMs": 60000,
            "childTokensPerRequest": 32768
          },
          "consumed": {
            "rounds": 1,
            "verifierCalls": 1,
            "verifierTokens": 13,
            "wallTimeMs": 100,
            "childTokens": 29
          },
          "exhausted": null
        }
      }",
          "type": "text",
        },
      ]
    `)
  })
})
