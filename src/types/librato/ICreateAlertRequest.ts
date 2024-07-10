import type { IAlertAttributes } from './IAlertAttributes.js';
import type { ICondition } from './ICondition.js';

export type CreateAlertCondition = Omit<ICondition, 'created_at' | 'id' | 'updated_at'>;

export interface ICreateAlertRequest {
  name: string;
  description: string;
  conditions: CreateAlertCondition[];
  services: number[];
  attributes?: IAlertAttributes;
  active?: boolean;

  rearm_seconds?: number;
}
