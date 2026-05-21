export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  pagination?: PaginationResponse;
}

export function buildSuccessResponse<T>(
  data: T,
  pagination?: PaginationResponse,
): SuccessResponse<T> {
  if (pagination) {
    return {
      success: true,
      data,
      pagination,
    };
  }

  return {
    success: true,
    data,
  };
}
