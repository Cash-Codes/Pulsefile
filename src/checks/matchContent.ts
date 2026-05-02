import type { ContentMatchResult } from '../shared/pulseReport.js';

export interface MatchContentInput {
  body: string;
  expect: string | null;
}

export function matchContent(input: MatchContentInput): ContentMatchResult {
  if (input.expect === null || input.expect === '') {
    return { status: 'na', expected: null, matched: false, snippet: null };
  }
  const idx = input.body.indexOf(input.expect);
  if (idx === -1) {
    return { status: 'fail', expected: input.expect, matched: false, snippet: null };
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(input.body.length, idx + input.expect.length + 30);
  return {
    status: 'ok',
    expected: input.expect,
    matched: true,
    snippet: input.body.slice(start, end),
  };
}
