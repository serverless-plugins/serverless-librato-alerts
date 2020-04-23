import { IAlertAttributes } from './IAlertAttributes';
import { ICondition } from './ICondition';
import { IService } from './IService';

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
