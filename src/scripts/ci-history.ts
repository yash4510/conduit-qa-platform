// Appends this run's totals to history.json, published next to the HTML report.
// The previous file is read from the live report site, so no database or commit is needed.
// Usage (in the nightly workflow): node src/scripts/ci-history.ts results.json playwright-report/history.json
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { historySchema } from './history-schema.ts';

const resultsSchema = z.object({
  stats: z.object({
    duration: z.number(),
    expected: z.number(),
    unexpected: z.number(),
    flaky: z.number(),
    skipped: z.number(),
  }),
});

const MAX_ENTRIES = 90;

async function loadPrevious(reportUrl: string): Promise<z.infer<typeof historySchema>> {
  try {
    const res = await fetch(`${reportUrl}/history.json`);
    if (!res.ok) return [];
    return historySchema.parse(await res.json());
  } catch (error) {
    // A missing or unreadable history must not fail the nightly run; start a new one.
    console.warn(`No usable previous history (${String(error)}); starting a new one.`);
    return [];
  }
}

const [resultsPath, outputPath] = process.argv.slice(2);
if (!resultsPath || !outputPath) throw new Error('Usage: ci-history.ts <results.json> <history.json>');

const { stats } = resultsSchema.parse(JSON.parse(readFileSync(resultsPath, 'utf-8')));
const reportUrl = process.env['REPORT_URL'];
const previous = reportUrl ? await loadPrevious(reportUrl) : [];

const entry = {
  date: new Date().toISOString(),
  runId: process.env['GITHUB_RUN_ID'] ?? 'local',
  sha: (process.env['GITHUB_SHA'] ?? 'local').slice(0, 7),
  event: process.env['GITHUB_EVENT_NAME'] ?? 'local',
  durationMs: Math.round(stats.duration),
  total: stats.expected + stats.unexpected + stats.flaky + stats.skipped,
  unexpected: stats.unexpected,
  flaky: stats.flaky,
  skipped: stats.skipped,
};

const history = [...previous, entry].slice(-MAX_ENTRIES);
writeFileSync(outputPath, JSON.stringify(history, null, 2));
console.log(`history.json now has ${history.length} entries; latest: ${JSON.stringify(entry)}`);
