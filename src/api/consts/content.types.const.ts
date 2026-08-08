/**
 * The OpenAPI definition declares a wildcard response media type for the bookstore endpoints, but
 * the running API consistently serves JSON. Asserting the concrete value guards against a payload
 * ever being served as HTML or plain text (see the injection robustness scenarios).
 */
export const CONTENT_TYPE_JSON = 'application/json';

/** Unsupported request media type - used to probe the 415 handling of the write endpoints. */
export const CONTENT_TYPE_TEXT_PLAIN = 'text/plain';

/** Never a valid response media type here; asserted against to catch reflected-payload XSS. */
export const CONTENT_TYPE_HTML = 'text/html';
