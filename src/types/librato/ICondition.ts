import type { ITag } from './ITag';

export interface ICondition {
  id: number;
  source: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  updated_at: number;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  metric_name: string;
  type: 'above' | 'absent' | 'below';
  tags?: ITag[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  detect_reset?: boolean;
  threshold?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  summary_function?: 'absolute_value' | 'average' | 'count' | 'derivative' | 'max' | 'min' | 'sum';
  duration?: number;
}
