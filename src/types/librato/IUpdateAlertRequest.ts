import type { IAlertAttributes } from './IAlertAttributes';
import type { ICondition } from './ICondition';

export type UpdateCondition = Omit<ICondition, 'created_at' | 'id' | 'updated_at'> & Partial<Pick<ICondition, 'id'>>;

export interface IUpdateAlertRequest {
  id: number;
  name: string;
  description: string;
  conditions?: UpdateCondition[];
  services?: number[];
  attributes?: IAlertAttributes;
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  rearm_seconds?: number;
}
