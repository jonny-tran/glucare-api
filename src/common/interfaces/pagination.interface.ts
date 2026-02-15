export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
}
