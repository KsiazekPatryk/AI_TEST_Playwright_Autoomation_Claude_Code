/**
 * Escapes every RegExp metacharacter in a value so it can be embedded in a pattern literally.
 * Test data is generated, so a stray `.` or `(` in a name must never be treated as a wildcard.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whitespace-tolerant, fully anchored pattern for an element's text content.
 *
 * Playwright's `hasText` filter matches by substring, which silently selects neighbours whose text
 * merely contains the target (e.g. "Kent Beck" also matches a row reading "Kent Beckett"). Use this
 * wherever a text filter must identify exactly one element.
 */
export function toExactTextRegExp(value: string): RegExp {
  return new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`);
}
