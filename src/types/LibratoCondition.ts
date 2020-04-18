export interface ILibratoConditionBase {
  metric: string;
  threshold?: number;
  tags?: { [tag: string]: string | boolean };
  detectReset?: boolean;
}

export interface ILibratoAbsentCondition extends ILibratoConditionBase {
  type: 'absent';
}

export interface ILibratoAboveBelowCondition extends ILibratoConditionBase {
  type: 'above' | 'below';
  summaryFunction: 'min' | 'max' | 'average' | 'sum' | 'count' | 'derivative';
  duration?: number;
}

export type LibratoCondition = ILibratoAbsentCondition | ILibratoAboveBelowCondition;
