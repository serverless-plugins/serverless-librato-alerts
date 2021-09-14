import type { PartiallyRequired } from '../PartiallyRequired';

import type { LibratoCondition } from './LibratoCondition';

export interface ILibratoAlert {
  name: string;
  nameTemplate?: string;
  description: string;
  conditions: LibratoCondition[];
  notify: number[] | number;
  rearmSeconds?: number;
  runbookUrl?: string;
}

export type PartialAlert = PartiallyRequired<ILibratoAlert, 'name'>;
