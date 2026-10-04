import { z } from 'zod';

// Shape of history.json, written by ci-history.ts and read by ci-metrics.ts.
export const historySchema = z.array(
  z.object({
    date: z.string(),
    runId: z.string(),
    sha: z.string(),
    event: z.string(),
    durationMs: z.number(),
    total: z.number(),
    unexpected: z.number(),
    flaky: z.number(),
    skipped: z.number(),
  }),
);
