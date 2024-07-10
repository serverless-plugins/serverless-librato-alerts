import type { IAlertResponse } from './IAlertResponse.js';
import type { IPagedResponse } from './IPagedResponse.js';

export interface IListAlertsResponse extends IPagedResponse {
  alerts: IAlertResponse[];
}
