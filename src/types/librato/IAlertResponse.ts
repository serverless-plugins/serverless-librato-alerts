import type { IAlertAttributes } from './IAlertAttributes.js';
import type { ICondition } from './ICondition.js';
import type { IService } from './IService.js';

export interface IAlertResponse {
  id: number;
  name: string;
  description: string;
  conditions: ICondition[];
  services: IService[];
  attributes?: IAlertAttributes;
  active?: boolean;

  rearm_seconds?: number;

  rearm_per_signal: boolean;
}
