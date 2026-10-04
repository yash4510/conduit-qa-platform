// Collects one test's API calls so they can be attached to the report when it fails.
export class ApiLogger {
  readonly correlationId: string;
  readonly lines: string[] = [];

  constructor(correlationId: string) {
    this.correlationId = correlationId;
  }

  log(method: string, url: string, status: number, durationMs: number): void {
    this.lines.push(`${new Date().toISOString()} ${method} ${url} -> ${status} (${durationMs} ms)`);
  }

  toString(): string {
    return [`correlation-id: ${this.correlationId}`, ...this.lines].join('\n');
  }
}
