import type { ITag } from '../librato';

import type { ICreateMetric } from './ICreateMetric';

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
