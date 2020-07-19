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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  rearm_seconds?: number;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  rearm_per_signal: boolean;
}
