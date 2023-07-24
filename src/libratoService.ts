import { URL } from 'url';

import type { AxiosError } from 'axios';
import axios from 'axios';

import type {
  IAlertResponse, //
  ICreateAlertRequest,
  ICreateMetricRequest,
  IListAlertsResponse,
  IRetrieveMetricResponse,
  IUpdateAlertRequest,
} from './types/librato';
import type { IPagedRequest } from './types/librato/IPagedRequest';

declare const process: {
  env: {
    LIBRATO_EMAIL?: string;
    LIBRATO_TOKEN?: string;
  };
};

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
    const url = `https://metrics-api.librato.com/v1/metrics/${request.name}`;

    try {
      const response = await axios.put<IAlertResponse>(url, request, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (ex) {
      const axiosError = ex as AxiosError;
      if (!axiosError.isAxiosError) {
        throw ex;
      }

      throw new Error(`Error creating metric:
Request: PUT ${url}
${JSON.stringify(request, null, 1)}

Response (${axiosError.response?.status ?? ''}): ${JSON.stringify(axiosError.response?.data, null, 1)}`);
    }
  }

  public async retrieveMetric(name: string): Promise<IRetrieveMetricResponse | null> {
    const url = `https://metrics-api.librato.com/v1/metrics/${name}`;

    try {
      const response = await axios.get<IRetrieveMetricResponse>(url, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (ex) {
      const axiosError = ex as AxiosError;
      if (!axiosError.isAxiosError) {
        throw ex;
      }

      if (axiosError.response?.status === 404) {
        return null;
      }

      throw new Error(`Error getting metric:
Request: GET ${url}

Response (${axiosError.response?.status ?? ''}): ${JSON.stringify(axiosError.response?.data, null, 1)}`);
    }
  }

  public async createAlert(request: ICreateAlertRequest): Promise<IAlertResponse> {
    const url = 'https://metrics-api.librato.com/v1/alerts';

    try {
      const response = await axios.post<IAlertResponse>(url, request, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (ex) {
      const axiosError = ex as AxiosError;
      if (!axiosError.isAxiosError) {
        throw ex;
      }

      throw new Error(`Error creating alert:
Request: POST ${url}
${JSON.stringify(request, null, 1)}

Response (${axiosError.response?.status ?? ''}): ${JSON.stringify(axiosError.response?.data, null, 1)}`);
    }
  }

  public async updateAlert(request: IUpdateAlertRequest): Promise<void> {
    const url = `https://metrics-api.librato.com/v1/alerts/${request.id}`;

    try {
      await axios.put(url, request, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
        },
      });
    } catch (ex) {
      const axiosError = ex as AxiosError;
      if (!axiosError.isAxiosError) {
        throw ex;
      }

      throw new Error(`Error updating alert:
Request: PUT ${url}
${JSON.stringify(request, null, 1)}

Response (${axiosError.response?.status ?? ''}): ${JSON.stringify(axiosError.response?.data, null, 1)}`);
    }
  }

  public async deleteAlert(id: number): Promise<void> {
    const url = `https://metrics-api.librato.com/v1/alerts/${id}`;

    try {
      await axios.delete(url, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
        },
      });
    } catch (ex) {
      const axiosError = ex as AxiosError;
      if (!axiosError.isAxiosError) {
        throw ex;
      }

      throw new Error(`Error deleting alert:
Request: DELETE ${url}

Response (${axiosError.response?.status ?? ''}): ${JSON.stringify(axiosError.response?.data, null, 1)}`);
    }
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

    try {
      const response = await axios.get<IListAlertsResponse>(url.href, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (ex) {
      const axiosError = ex as AxiosError;
      if (!axiosError.isAxiosError) {
        throw ex;
      }

      throw new Error(`Error listing alerts:
Request: GET ${url.toString()}

Response (${axiosError.response?.status ?? ''}): ${JSON.stringify(axiosError.response?.data, null, 1)}`);
    }
  }
}
