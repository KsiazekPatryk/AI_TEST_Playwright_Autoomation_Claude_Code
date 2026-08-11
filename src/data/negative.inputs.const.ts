/**
 * Shared probe values for negative / robustness API scenarios.
 *
 * Kept here rather than inline in spec files so the same value is used consistently across
 * endpoints and is documented in exactly one place (CLAUDE.md routes static constants to
 * `src/data/`).
 */

/** No `maxLength` is documented for name fields; 5000 characters probes far beyond any realistic name. */
export const OVERSIZED_NAME_LENGTH = 5000;
export const OVERSIZED_NAME = 'a'.repeat(OVERSIZED_NAME_LENGTH);

export const SQL_INJECTION_VALUE = "' OR '1'='1";
export const XSS_INJECTION_VALUE = '<script>alert(1)</script>';

/**
 * Raw query strings that must reach the server byte-for-byte, bypassing `URLSearchParams`
 * normalisation — see `AuthorsAPIRequest.getAuthorsByRawQuery`.
 */
export const DUPLICATED_FIRST_NAME_QUERY = '?firstName=Alice&firstName=Bob';
export const MALFORMED_ENCODED_QUERY = '?firstName=%zz';

/** Book-specific counterparts, used with `BooksAPIRequest.getBooksByRawQuery`. */
export const DUPLICATED_TITLE_QUERY = '?title=Clean&title=Refactoring';
export const MALFORMED_TITLE_QUERY = '?title=%zz';

/** An author id far beyond any id the live database will ever assign, for referential-integrity probes. */
export const NON_EXISTENT_AUTHOR_ID = 999999999;

/** Query parameter that is not documented for any operation in the OpenAPI spec. */
export const UNKNOWN_QUERY_PARAM = { sortBy: 'firstName' };

/** Syntactically well-formed but unparseable bearer credential. */
export const INVALID_BEARER_TOKEN = 'Bearer invalid.token.value';

/** Body with a syntax error (missing value) - must reach the server verbatim, so it is a string. */
export const MALFORMED_JSON_BODY = '{ "firstName": "Jane", "lastName": }';

/** Body that is never closed - the PATCH counterpart of `MALFORMED_JSON_BODY`. */
export const UNTERMINATED_JSON_BODY = '{ "firstName": "Broken" ';

/** Well-formed JSON that is an array rather than the documented object body. */
export const NON_OBJECT_ARRAY_BODY = ['firstName', 'PatchedFirst'];

/** Path-variable values that cannot be converted to the documented `integer, format: int64`. */
export const NON_NUMERIC_ID = 'abc';
export const DECIMAL_ID = '1.5';

/**
 * Substrings that must never appear in an error response body. The API already echoes framework
 * wording such as `For input string: "abc"`; these markers catch the more serious regression of a
 * stack trace, exception class or filesystem path being surfaced to clients.
 */
export const INTERNAL_DETAIL_MARKERS = [
  'Exception',
  'at java.',
  'at org.springframework',
  'Caused by',
  'SQLException',
  '/usr/',
  'jdbc',
] as const;
