/**
 * Query keys. Always an array, always domain-first, so a mutation can
 * invalidate a whole domain with one call: invalidateQueries({ queryKey: ['job'] }).
 */
export const qk = {
  all: (domain: string) => [domain] as const,
  list: (domain: string, params?: unknown) =>
    params === undefined ? ([domain, 'list'] as const) : ([domain, 'list', params] as const),
  detail: (domain: string, id: string | number) => [domain, id] as const,
};
