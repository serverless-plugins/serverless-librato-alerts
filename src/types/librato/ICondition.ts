import { ITag } from './ITag';

export interface ICondition {
  id: number;
  source: string | null;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  created_at: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  updated_at: number;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  metric_name: string;
  type: 'absent' | 'above' | 'below';
  tags?: ITag[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  detect_reset?: boolean;
  threshold?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  summary_function?: 'min' | 'max' | 'average' | 'sum' | 'count' | 'derivative';
  duration?: number;
}
