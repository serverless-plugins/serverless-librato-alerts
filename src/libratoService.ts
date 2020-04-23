import fetch from 'node-fetch';
import { URL } from 'url';
import type {
  IAlertResponse, //
  ICreateAlertRequest,
  IListAlertsResponse,
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

  public async createAlert(request: ICreateAlertRequest): Promise<IAlertResponse> {
    const response = await fetch('https://metrics-api.librato.com/v1/alerts', {
      method: 'POST',
      body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error(response.statusText);
  }

  public async updateAlert(request: IUpdateAlertRequest): Promise<IAlertResponse> {
    const response = await fetch(`https://metrics-api.librato.com/v1/alerts/${request.id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error(response.statusText);
  }

  public async deleteAlert(id: number): Promise<void> {
    const response = await fetch(`https://metrics-api.librato.com/v1/alerts/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error(response.statusText);
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
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error(response.statusText);
  }
}
