/**
 * Pagination utilities for consistent API response formatting
 */

interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Validates and normalizes pagination parameters.
 * Ensures page >= 1, limit is clamped between 1 and 100, and calculates skip offset.
 */
export function validatePagination(
  page: number | string | any,
  limit: number | string | any
): PaginationParams {
  const parsedPage = Math.max(1, parseInt(String(page), 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const skip = (parsedPage - 1) * parsedLimit;

  return { page: parsedPage, limit: parsedLimit, skip };
}

/**
 * Creates a standardized pagination response object.
 */
export function createPaginationResponse(
  total: number,
  page: number,
  limit: number
): PaginationResponse {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
