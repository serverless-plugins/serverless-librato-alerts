import { URL } from 'node:url';

import type {
  IAlertResponse, //
  ICreateAlertRequest,
  ICreateMetricRequest,
  IListAlertsResponse,
  IRetrieveMetricResponse,
  IUpdateAlertRequest,
} from './types/librato/index.js';
import type { IPagedRequest } from './types/librato/IPagedRequest.js';

declare const process: {
  env: {
    LIBRATO_EMAIL?: string;
    LIBRATO_TOKEN?: string;
  };
};

type HttpMethod = 'DELETE' | 'GET' | 'POST' | 'PUT';

interface ILibratoRequest {
  method: HttpMethod;
  url: URL | string;
  // Used in error messages: `Error ${action}:`
  action: string;
  body?: unknown;
}

export class LibratoService {
  protected email: string;

  protected token: string;

  public constructor(email?: string, token?: string) {
    const emailParam = email ?? process.env.LIBRATO_EMAIL;
    const tokenParam = token ?? process.env.LIBRATO_TOKEN;
    if (!emailParam) {
      throw new Error('Please specify a value for email or set LIBRATO_EMAIL environment variable.');
    }

    if (!tokenParam) {
      throw new Error('Please specify a value for token or set LIBRATO_TOKEN environment variable.');
    }

    this.email = emailParam;
    this.token = tokenParam;
  }

  public async createMetric(request: ICreateMetricRequest): Promise<IAlertResponse> {
    const response = await this.send({
      method: 'PUT',
      url: `https://metrics-api.librato.com/v1/metrics/${request.name}`,
      action: 'creating metric',
      body: request,
    });

    return (await parseResponseBody(response)) as IAlertResponse;
  }

  public async retrieveMetric(name: string): Promise<IRetrieveMetricResponse | null> {
    const response = await this.send(
      {
        method: 'GET',
        url: `https://metrics-api.librato.com/v1/metrics/${name}`,
        action: 'getting metric',
      },
      [404],
    );

    if (response.status === 404) {
      return null;
    }

    return (await parseResponseBody(response)) as IRetrieveMetricResponse;
  }

  public async createAlert(request: ICreateAlertRequest): Promise<IAlertResponse> {
    const response = await this.send({
      method: 'POST',
      url: 'https://metrics-api.librato.com/v1/alerts',
      action: 'creating alert',
      body: request,
    });

    return (await parseResponseBody(response)) as IAlertResponse;
  }

  public async updateAlert(request: IUpdateAlertRequest): Promise<void> {
    await this.send({
      method: 'PUT',
      url: `https://metrics-api.librato.com/v1/alerts/${request.id}`,
      action: 'updating alert',
      body: request,
    });
  }

  public async deleteAlert(id: number): Promise<void> {
    await this.send({
      method: 'DELETE',
      url: `https://metrics-api.librato.com/v1/alerts/${id}`,
      action: 'deleting alert',
    });
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

    const response = await this.send({
      method: 'GET',
      url,
      action: 'listing alerts',
    });

    return (await parseResponseBody(response)) as IListAlertsResponse;
  }

  private async send({ method, url, action, body }: ILibratoRequest, allowedErrorStatuses: number[] = []): Promise<Response> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,

        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok && !allowedErrorStatuses.includes(response.status)) {
      const requestDetails = body === undefined ? '' : `\n${JSON.stringify(body, null, 1)}`;

      throw new Error(`Error ${action}:
Request: ${method} ${url.toString()}${requestDetails}

Response (${response.status}): ${await formatResponseBody(response)}`);
    }

    return response;
  }
}

async function formatResponseBody(response: Response): Promise<string> {
  const text = await response.text();

  try {
    return JSON.stringify(JSON.parse(text), null, 1);
  } catch {
    return text;
  }
}

// Librato responds 204 No Content for some successful requests (eg. PUT /v1/metrics/:name when the metric
// already exists), so an unconditional response.json() would throw on the empty body.
async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
