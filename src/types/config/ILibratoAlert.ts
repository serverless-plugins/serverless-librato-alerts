import type { PartiallyRequired } from '../PartiallyRequired.js';

import type { LibratoCondition } from './LibratoCondition.js';

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
