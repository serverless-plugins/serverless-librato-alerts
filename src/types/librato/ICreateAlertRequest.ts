import type { IAlertAttributes } from './IAlertAttributes';
import type { ICondition } from './ICondition';

export type CreateAlertCondition = Omit<ICondition, 'created_at' | 'id' | 'source' | 'updated_at'>;

export interface ICreateAlertRequest {
  name: string;
  description: string;
  conditions: CreateAlertCondition[];
  services: number[];
  attributes?: IAlertAttributes;
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  rearm_seconds?: number;
}
