import { expect } from '@playwright/test';

/**
 * Runs teardown tasks in the given order, always attempting every task even when an earlier one
 * fails, then reports all failures together.
 *
 * API step helpers assert their status code, so a failing delete throws out of the teardown hook and
 * skips every remaining task — leaking the rest of the test data into the shared environment, where
 * it pollutes later runs (leaked authors, for instance, keep accumulating in the "Edit Book" author
 * list). Ordering still matters and is preserved: tasks run sequentially, not concurrently.
 */
export async function runCleanups(...tasks: ReadonlyArray<() => Promise<void>>): Promise<void> {
  const failures: string[] = [];

  for (const task of tasks) {
    try {
      await task();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  expect(failures, 'cleanup failed - test data leaked into the shared environment').toEqual([]);
}
