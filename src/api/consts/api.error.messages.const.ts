/**
 * Error messages returned by the live bookstore API. None of these are documented in the OpenAPI
 * definition - each one was captured by probing the running service, and is pinned here so a
 * wording change surfaces as a single, obvious failure instead of a silent loss of coverage.
 */

/** Generic rejection used for unparseable bodies, wrong body types and referential conflicts. */
export const OPERATION_NOT_PERFORMED_MESSAGE = 'operation could not be performed';

/** Per-field validation rejection, e.g. `firstName incorrect input data`. */
export function incorrectInputDataMessage(field: string): string {
  return `${field} incorrect input data`;
}

/** Path-variable type-conversion rejection, e.g. `For input string: "abc"`. */
export function invalidPathVariableMessage(value: string): string {
  return `For input string: "${value}"`;
}

/** Fragment shared by the 415 (unsupported media type) and 405 (method not allowed) messages. */
export const NOT_SUPPORTED_MESSAGE_FRAGMENT = 'not supported';

/** Referential-integrity rejection returned by POST/PUT /books when an authors id does not exist. */
export function authorNotFoundMessage(id: number): string {
  return `Can not find author with given id: ${id}`;
}
