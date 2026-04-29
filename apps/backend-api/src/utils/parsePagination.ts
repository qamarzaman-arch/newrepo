const MIN_PAGE = 1;
const MIN_LIMIT = 1;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export function parsePagination(query: Record<string, any>): { page: number; limit: number } {
  let page = parseInt(String(query.page ?? MIN_PAGE), 10);
  let limit = parseInt(String(query.limit ?? DEFAULT_LIMIT), 10);

  if (!Number.isFinite(page) || page < MIN_PAGE) page = MIN_PAGE;
  if (!Number.isFinite(limit) || limit < MIN_LIMIT) limit = MIN_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit };
}
