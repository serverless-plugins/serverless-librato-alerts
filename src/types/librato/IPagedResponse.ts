export interface IPagedResponse {
  query: {
    found: number;
    length: number;
    offset: number;
    total: number;
  };
}
