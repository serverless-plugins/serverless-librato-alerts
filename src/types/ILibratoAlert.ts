import { LibratoCondition } from './LibratoCondition';

export interface ILibratoAlert {
  id: string;
  nameTemplate?: string;
  description: string;
  conditions: LibratoCondition[];
  notify: number | number[];
  rearmSeconds?: number;
}
