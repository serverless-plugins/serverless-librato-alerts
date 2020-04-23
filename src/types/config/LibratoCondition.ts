import { ITag } from '../librato';

export interface ILibratoConditionBase {
  metric: string;
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
  summaryFunction: 'min' | 'max' | 'average' | 'sum' | 'count' | 'derivative';
}

export type LibratoCondition = ILibratoAbsentCondition | ILibratoAboveBelowCondition;
