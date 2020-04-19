import { LibratoCondition } from './LibratoCondition';
import { PartiallyRequired } from './PartiallyRequired';

export interface ILibratoAlert {
  name: string;
  nameTemplate?: string;
  description: string;
  conditions: LibratoCondition[];
  notify: number | number[];
  rearmSeconds?: number;
}

export type PartialAlert = PartiallyRequired<ILibratoAlert, 'name'>;
