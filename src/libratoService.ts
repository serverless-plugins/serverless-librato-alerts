import fetch from 'node-fetch';
import { URL } from 'url';
import type {
  IAlertResponse, //
  ICreateAlertRequest,
  ICreateMetricRequest,
  IListAlertsResponse,
  IRetrieveMetricResponse,
  IUpdateAlertRequest,
} from './types/librato';
import { IPagedRequest } from './types/librato/IPagedRequest';

export class LibratoService {
  protected email: string;

  protected token: string;

  public constructor(email?: string, token?: string) {
    const emailParam = email || process.env.LIBRATO_EMAIL;
    const tokenParam = token || process.env.LIBRATO_TOKEN;
    if (!emailParam) {
      throw new Error('Please specify a email or set LIBRATO_EMAIL environment variable.');
    }

    if (!tokenParam) {
      throw new Error('Please specify a token or set LIBRATO_TOKEN environment variable.');
    }

    this.email = emailParam;
    this.token = tokenParam;
  }

  public async createMetric(request: ICreateMetricRequest): Promise<IAlertResponse> {
    const url = `https://metrics-api.librato.com/v1/metrics/${request.name}`;
    const response = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(request),
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await response.json();
    if (response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return body;
    }

    throw new Error(`Error creating metric: 
Request: PUT ${url}
${JSON.stringify(request, null, 1)}

Response (${response.status}): ${JSON.stringify(body, null, 1)}`);
  }

  public async retrieveMetric(name: string): Promise<IRetrieveMetricResponse | null> {
    const url = `https://metrics-api.librato.com/v1/metrics/${name}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await response.json();
    if (response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return body;
    }

    if (response.status === 404) {
      return null;
    }

    throw new Error(`Error creating metric: 
Request: GET ${url}

Response (${response.status}): ${JSON.stringify(body, null, 1)}`);
  }

  public async createAlert(request: ICreateAlertRequest): Promise<IAlertResponse> {
    const url = 'https://metrics-api.librato.com/v1/alerts';
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await response.json();
    if (response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return body;
    }

    throw new Error(`Error creating alert: 
Request: POST ${url}
${JSON.stringify(request, null, 1)}

Response (${response.status}): ${JSON.stringify(body, null, 1)}`);
  }

  public async updateAlert(request: IUpdateAlertRequest): Promise<void> {
    const response = await fetch(`https://metrics-api.librato.com/v1/alerts/${request.id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return;
    }

    let body = '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body = await response.json();
    } catch (ex) {
      console.error(ex);
    }

    throw new Error(`Error updating alert: 
Request: ${JSON.stringify(request, null, 1)}

Response (${response.status}): ${JSON.stringify(body, null, 1)}`);
  }

  public async deleteAlert(id: number): Promise<void> {
    const url = `https://metrics-api.librato.com/v1/alerts/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return;
    }

    let body = '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body = await response.json();
    } catch (ex) {
      console.error(ex);
    }

    throw new Error(`Error deleting alert:
Request: DELETE https://metrics-api.librato.com/v1/alerts/${id}

Response (${response.status}): ${JSON.stringify(body, null, 1)}`);
  }

  public async listAlerts(search: string): Promise<IAlertResponse[]> {
    const paging: IPagedRequest = {
      length: 100,
    };
    const alerts: IAlertResponse[] = [];
    let response = await this.listAlertsPaged(search, paging);
    alerts.push(...response.alerts);
    while (paging.length === response.query.length && alerts.length < response.query.found && response.query.offset + response.query.length < response.query.found) {
      paging.offset = response.query.offset + response.query.length;
      // eslint-disable-next-line no-await-in-loop
      response = await this.listAlertsPaged(search, paging);
    }

    return alerts;
  }

  private async listAlertsPaged(search: string, paging: IPagedRequest): Promise<IListAlertsResponse> {
    const url = new URL('https://metrics-api.librato.com/v1/alerts');
    url.searchParams.set('name', search);

    if (paging.offset) {
      url.searchParams.set('offset', `${paging.offset}`);
    }

    if (paging.length) {
      url.searchParams.set('length', `${paging.length}`);
    }

    if (paging.orderby) {
      url.searchParams.set('orderby', paging.orderby);
    }

    if (paging.sort) {
      url.searchParams.set('sort', paging.sort);
    }

    const response = await fetch(url.href, {
      method: 'GET',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await response.json();
    if (response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return body;
    }

    throw new Error(`Error listing alert:
Request: GET ${url.href}

Response (${response.status}): ${JSON.stringify(body, null, 1)}`);
  }
}
