# Memory — project conventions and reviewer feedback

## Never use the raw `page` fixture directly in tests

Tests (`tests/**/*.spec.ts`) must never reference the raw `page` fixture directly — not even for
things like `expect(page).toHaveURL(...)`. Every interaction and check must go through a Page
Object or Component method instead.

**Why:** confirmed as a hard project rule after `expect(page).toHaveURL(ROUTES.authors)` was left
in a refactored spec (`tests/ui/add-new-author-in-authors-tab.spec.ts`). Tests must only ever use
Page Objects or Components, never `page` itself — no exceptions, including URL checks that don't
touch a Locator.

**How to apply:**
- Do not destructure `page` into a test callback unless it turns out to be genuinely unavoidable.
  If it seems unavoidable, that's a sign a Page Object method is missing — add one instead.
- For URL verification specifically, add a method to the relevant Page Object that wraps
  `this.page.waitForURL(...)` (an action, not an `expect` assertion) and call that from the test,
  e.g. `authorsPage.waitForUrl()`. This satisfies both "no raw `page` in tests" and the existing
  CLAUDE.md rule that assertions stay in tests — `waitForURL` throws/times out on mismatch, so it
  still fails the test correctly.
- Applies to all UI test work (`ui-test-writer`, `ui-test-refactor`, `ui-test-code-reviewer`) —
  flag `expect(page)...` or any direct `page.*` call in a spec file as a violation, even when it
  looks like "just an assertion, not a locator interaction."
- Example fix applied in `src/ui/pages/authors.page.ts`:
  ```ts
  /** Confirms navigation landed on the Authors page — throws/times out otherwise. */
  async waitForUrl(): Promise<void> {
    await this.page.waitForURL(ROUTES.authors);
  }
  ```
