import { ITag } from '../librato';
import { ICreateMetric } from './ICreateMetric';

export interface ILibratoConditionBase {
  metric: string | ICreateMetric;
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
  summaryFunction: 'min' | 'max' | 'average' | 'sum' | 'count' | 'derivative' | 'absolute_value';
}

export type LibratoCondition = ILibratoAbsentCondition | ILibratoAboveBelowCondition;
