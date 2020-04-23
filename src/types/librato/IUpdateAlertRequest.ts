import { IAlertAttributes } from './IAlertAttributes';
import { ICondition } from './ICondition';

export type UpdateCondition = Omit<ICondition, 'id' | 'source' | 'created_at' | 'updated_at'> & Partial<Pick<ICondition, 'id'>>;

export interface IUpdateAlertRequest {
  id: number;
  name: string;
  description: string;
  conditions: UpdateCondition[];
  services: number[];
  attributes?: IAlertAttributes;
  active?: boolean;
  rearm_seconds?: number;
}
