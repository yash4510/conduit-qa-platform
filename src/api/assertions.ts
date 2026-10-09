import { expect } from '@playwright/test';
import type { RawResponse } from './client.ts';
import { authErrorSchema, messageErrorSchema, validationErrorSchema } from './schemas.ts';

// Negative tests assert the status code AND the exact error body. These helpers also run the
// body through a Zod schema first, so a change of error shape fails with a clear message.

// Missing or invalid token. This is not the spec's `{ errors: ... }` shape, but the frontend depends on it.
export function expectUnauthorized(res: RawResponse): void {
  expect(res.status).toBe(401);
  expect(authErrorSchema.parse(res.body)).toEqual({
    status: 'error',
    message: 'missing authorization credentials',
  });
}

export function expectErrors(res: RawResponse, status: number, errors: Record<string, string[]>): void {
  expect(res.status).toBe(status);
  expect(validationErrorSchema.parse(res.body)).toEqual({ errors });
}

export function expectMessage(res: RawResponse, status: number, message: string): void {
  expect(res.status).toBe(status);
  expect(messageErrorSchema.parse(res.body)).toEqual({ message });
}

// Several endpoints answer a missing resource with a bare `{}`.
export function expectEmptyBody(res: RawResponse, status: number): void {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({});
}
