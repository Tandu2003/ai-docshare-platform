export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  meta?: {
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationMeta {
  timestamp: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BaseMeta {
  timestamp: string;
}
