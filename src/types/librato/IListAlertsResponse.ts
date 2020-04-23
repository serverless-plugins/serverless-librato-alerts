import { IPagedResponse } from './IPagedResponse';
import { IAlertResponse } from './IAlertResponse';

export interface IListAlertsResponse extends IPagedResponse {
  alerts: IAlertResponse[];
}
