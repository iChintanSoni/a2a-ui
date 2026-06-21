/** Returns the error message string for any thrown value. */
export function getErrorMessage(err: unknown, fallback = "An unexpected error occurred."): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}

/** Returns true when err is an AbortError (from AbortController). */
export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
