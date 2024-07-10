import type { IAlertAttributes } from './IAlertAttributes.js';
import type { ICondition } from './ICondition.js';

export type UpdateCondition = Omit<ICondition, 'created_at' | 'id' | 'updated_at'> & Partial<Pick<ICondition, 'id'>>;

export interface IUpdateAlertRequest {
  id: number;
  name: string;
  description: string;
  conditions?: UpdateCondition[];
  services?: number[];
  attributes?: IAlertAttributes;
  active?: boolean;

  rearm_seconds?: number;
}
