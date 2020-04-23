import { ITag } from './ITag';

export interface ICondition {
  id: number;
  source: string;
  created_at: number;
  updated_at: number;

  metric_name: string;
  type: 'absent' | 'above' | 'below';
  tags?: ITag[];
  detect_reset?: boolean;
  threshold?: number;
  summary_function?: 'min' | 'max' | 'average' | 'sum' | 'count' | 'derivative';
  duration?: number;
}
