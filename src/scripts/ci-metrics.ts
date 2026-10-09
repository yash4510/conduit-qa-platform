// Reads CI numbers from public sources so every figure in the README can be reproduced.
//
//   node src/scripts/ci-metrics.ts runs <workflow-file> [--branch=main] [--event=pull_request]
//                                   [--since=<iso>] [--until=<iso>]
//                                   [--until-job=<job name prefix>] [--skip-oldest=<n>]
//   node src/scripts/ci-metrics.ts flaky [--last=20]
//
// `runs` lists completed runs of a workflow with their wall-clock time (start to finish) and
// summarises the successful ones. `flaky` reads history.json from the published report site.
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { historySchema } from './history-schema.ts';

// Defaults point at this project's repository; override for a fork.
const repository = process.env['GITHUB_REPOSITORY'] ?? 'yash4510/conduit-qa-platform';
const [owner, repo] = repository.split('/');
const reportUrl = process.env['REPORT_URL'] ?? `https://${owner}.github.io/${repo}`;

const runsSchema = z.object({
  workflow_runs: z.array(
    z.object({
      id: z.number(),
      event: z.string(),
      head_branch: z.string().nullable(),
      head_sha: z.string(),
      conclusion: z.string().nullable(),
      created_at: z.string(),
      run_started_at: z.string(),
      updated_at: z.string(),
    }),
  ),
});

const jobsSchema = z.object({
  jobs: z.array(z.object({ name: z.string(), completed_at: z.string().nullable() })),
});

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    branch: { type: 'string' },
    event: { type: 'string' },
    since: { type: 'string' },
    until: { type: 'string' },
    last: { type: 'string', default: '20' },
    'until-job': { type: 'string' },
    'skip-oldest': { type: 'string', default: '0' },
  },
});

const median = (numbers: number[]): number => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

async function secondsUntilJob(runId: number, prefix: string, startedAt: string): Promise<number | null> {
  const res = await fetch(
    `https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
  );
  if (!res.ok) throw new Error(`GitHub API answered ${res.status}: ${await res.text()}`);
  const { jobs } = jobsSchema.parse(await res.json());
  const finished = jobs
    .filter((j) => j.name.toLowerCase().startsWith(prefix.toLowerCase()) && j.completed_at)
    .map((j) => Date.parse(j.completed_at!));
  return finished.length ? Math.round((Math.max(...finished) - Date.parse(startedAt)) / 1000) : null;
}

const summary = (label: string, numbers: number[]): void => {
  if (numbers.length === 0) return console.log(`${label}: no successful runs in this selection.`);
  console.log(
    `${label}: ${numbers.length} runs | median ${median(numbers)} s | min ${Math.min(...numbers)} s | max ${Math.max(...numbers)} s`,
  );
};

async function showRuns(workflowFile: string): Promise<void> {
  const params = new URLSearchParams({ status: 'completed', per_page: '100' });
  if (values.branch) params.set('branch', values.branch);
  if (values.event) params.set('event', values.event);
  const res = await fetch(
    `https://api.github.com/repos/${repository}/actions/workflows/${workflowFile}/runs?${params}`,
  );
  if (!res.ok) throw new Error(`GitHub API answered ${res.status}: ${await res.text()}`);
  const { workflow_runs } = runsSchema.parse(await res.json());

  // Oldest first, so --skip-oldest can drop the cold-cache first run.
  const selected = workflow_runs
    .filter(
      (r) =>
        (!values.since || r.created_at >= values.since) && (!values.until || r.created_at <= values.until),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const rows = [];
  for (const r of selected) {
    rows.push({
      run: r.id,
      branch: r.head_branch,
      sha: r.head_sha.slice(0, 7),
      conclusion: r.conclusion,
      // Whole workflow: start to the last job finishing (includes report merging).
      workflowSeconds: Math.round((Date.parse(r.updated_at) - Date.parse(r.run_started_at)) / 1000),
      // Time until a named job finishes, e.g. "PR gate": when a developer sees the check go green.
      untilJobSeconds: values['until-job']
        ? await secondsUntilJob(r.id, values['until-job'], r.run_started_at)
        : undefined,
    });
  }
  console.table(rows);

  const counted = rows.filter((r) => r.conclusion === 'success').slice(Number(values['skip-oldest']));
  const skipped = rows.filter((r) => r.conclusion === 'success').length - counted.length;
  console.log(skipped ? `(first ${skipped} successful run(s) left out of the summary)` : '');
  summary(
    'workflow time',
    counted.map((r) => r.workflowSeconds),
  );
  if (values['until-job']) {
    summary(
      `time until "${values['until-job']}" finishes`,
      counted.flatMap((r) => (r.untilJobSeconds == null ? [] : [r.untilJobSeconds])),
    );
  }
}

async function showFlaky(): Promise<void> {
  const res = await fetch(`${reportUrl}/history.json`);
  if (!res.ok)
    throw new Error(
      `No history at ${reportUrl}/history.json (status ${res.status}). Has the nightly run published yet?`,
    );
  const history = historySchema.parse(await res.json()).slice(-Number(values.last));
  console.table(
    history.map((h) => ({
      date: h.date.slice(0, 10),
      run: h.runId,
      total: h.total,
      unexpected: h.unexpected,
      flaky: h.flaky,
    })),
  );

  const total = history.reduce((sum, h) => sum + h.total, 0);
  const flaky = history.reduce((sum, h) => sum + h.flaky, 0);
  // Flaky = failed first, passed on retry. Rate = flaky / tests executed, over the selected runs.
  console.log(
    `runs: ${history.length} | flaky ${flaky} of ${total} executed = ${((flaky / total) * 100).toFixed(2)} %`,
  );
}

const [command, workflowFile] = positionals;
try {
  if (command === 'runs' && workflowFile) await showRuns(workflowFile);
  else if (command === 'flaky') await showFlaky();
  else throw new Error('Usage: ci-metrics.ts runs <workflow-file> | flaky');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
