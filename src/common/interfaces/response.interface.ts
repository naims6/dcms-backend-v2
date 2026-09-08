export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: ApiResponseMeta;
}
