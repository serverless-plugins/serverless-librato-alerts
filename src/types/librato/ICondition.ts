import type { ITag } from './ITag.js';

export interface ICondition {
  id: number;
  source?: string | null;

  created_at: number;

  updated_at: number;

  metric_name: string;
  type: 'above' | 'absent' | 'below';
  tags?: ITag[];

  detect_reset?: boolean;
  threshold?: number;

  summary_function?: 'absolute_value' | 'average' | 'count' | 'derivative' | 'max' | 'min' | 'sum';
  duration?: number;
}
