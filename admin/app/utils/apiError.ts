/**
 * getApiErrorMessage — pull the server-provided message out of a rejected
 * request, never a hardcoded string (RULE-I: error messages come from the
 * server response). httpService already unwraps axios errors to
 * `{ message, status }`, but this also handles a raw AxiosError
 * (`response.data.message`) and a plain Error, falling back to `fallback`.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as {
      response?: { data?: { message?: unknown } };
      message?: unknown;
    };
    const serverMsg = e.response?.data?.message;
    if (typeof serverMsg === 'string' && serverMsg.trim()) return serverMsg;
    if (typeof e.message === 'string' && e.message.trim()) return e.message;
  }
  return fallback;
}
