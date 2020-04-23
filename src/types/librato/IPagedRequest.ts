export interface IPagedRequest {
  offset?: number;
  length: number;
  orderby?: string;
  sort?: 'asc' | 'desc';
}
