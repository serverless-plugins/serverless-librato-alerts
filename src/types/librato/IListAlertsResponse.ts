import type { IAlertResponse } from './IAlertResponse';
import type { IPagedResponse } from './IPagedResponse';

export interface IListAlertsResponse extends IPagedResponse {
  alerts: IAlertResponse[];
}
