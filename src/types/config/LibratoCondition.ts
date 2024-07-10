import type { ITag } from '../librato/index.js';

import type { ICreateMetric } from './ICreateMetric.js';

export interface ILibratoConditionBase {
  metric: ICreateMetric | string;
  source?: string | null;
  tags?: ITag[];
  duration?: number;
  detectReset?: boolean;
}

export interface ILibratoAbsentCondition extends ILibratoConditionBase {
  type: 'absent';
}

export interface ILibratoAboveBelowCondition extends ILibratoConditionBase {
  type: 'above' | 'below';
  threshold?: number;
  summaryFunction: 'absolute_value' | 'average' | 'count' | 'derivative' | 'max' | 'min' | 'sum';
}

export type LibratoCondition = ILibratoAboveBelowCondition | ILibratoAbsentCondition;
