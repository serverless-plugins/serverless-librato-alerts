export interface IService {
  id: number;
  type: string;
  settings: { [index: string]: string };
  title: string;
}
