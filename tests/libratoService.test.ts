import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { LibratoService } from '../src/libratoService.js';

interface IRecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function requestUrl(input: Request | URL | string): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

class FakeFetch {
  public readonly requests: IRecordedRequest[] = [];

  private readonly responses: Response[] = [];

  public queue(status: number, body?: unknown): void {
    this.responses.push(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }

  public handler: typeof fetch = (input, init) => {
    this.requests.push({
      url: requestUrl(input),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? init.body : undefined,
    });

    const response = this.responses.shift();
    if (!response) {
      throw new Error(`Unexpected fetch call: ${requestUrl(input)}`);
    }

    return Promise.resolve(response);
  };
}

describe('LibratoService', () => {
  const originalFetch = globalThis.fetch;
  let fakeFetch: FakeFetch;

  beforeEach(() => {
    fakeFetch = new FakeFetch();
    globalThis.fetch = fakeFetch.handler;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('throws when email is missing', () => {
      delete process.env['LIBRATO_EMAIL'];
      delete process.env['LIBRATO_TOKEN'];
      expect(() => new LibratoService(undefined, 'token')).toThrow(/email/);
    });

    it('throws when token is missing', () => {
      delete process.env['LIBRATO_EMAIL'];
      delete process.env['LIBRATO_TOKEN'];
      expect(() => new LibratoService('foo@example.com', undefined)).toThrow(/token/);
    });

    it('falls back to environment variables', () => {
      process.env['LIBRATO_EMAIL'] = 'foo@example.com';
      process.env['LIBRATO_TOKEN'] = 'secret';
      expect(() => new LibratoService()).not.toThrow();
      delete process.env['LIBRATO_EMAIL'];
      delete process.env['LIBRATO_TOKEN'];
    });
  });

  describe('createMetric', () => {
    it('PUTs the metric with basic auth and returns the parsed response', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      fakeFetch.queue(200, { id: 42, name: 'my.metric' });

      const result = await service.createMetric({ name: 'my.metric', type: 'gauge', period: 60 });

      expect(result).toEqual({ id: 42, name: 'my.metric' });
      expect(fakeFetch.requests).toHaveLength(1);
      const [request] = fakeFetch.requests;
      expect(request?.method).toBe('PUT');
      expect(request?.url).toBe('https://metrics-api.librato.com/v1/metrics/my.metric');
      expect(request?.headers['Authorization']).toBe(`Basic ${Buffer.from('foo@example.com:secret').toString('base64')}`);
      expect(request?.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(request?.body ?? '')).toEqual({ name: 'my.metric', type: 'gauge', period: 60 });
    });

    it('tolerates a 204 No Content response when the metric already exists', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      fakeFetch.queue(204);

      await expect(service.createMetric({ name: 'my.metric', type: 'gauge', period: 60 })).resolves.toBeUndefined();
    });

    it('throws a descriptive error containing status and response body', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      fakeFetch.queue(422, { errors: { name: ['is invalid'] } });

      await expect(service.createMetric({ name: 'bad metric', type: 'gauge', period: 60 })).rejects.toThrow(/Error creating metric:[\S\s]*Response \(422\):[\S\s]*is invalid/);
    });
  });

  describe('retrieveMetric', () => {
    it('returns null for 404 responses', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      fakeFetch.queue(404, { errors: ['not found'] });

      await expect(service.retrieveMetric('missing.metric')).resolves.toBeNull();
    });

    it('returns the metric when it exists', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      fakeFetch.queue(200, { name: 'my.metric', type: 'gauge' });

      await expect(service.retrieveMetric('my.metric')).resolves.toEqual({ name: 'my.metric', type: 'gauge' });
    });

    it('throws for non-404 errors', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      fakeFetch.queue(500, { errors: ['boom'] });

      await expect(service.retrieveMetric('my.metric')).rejects.toThrow(/Error getting metric:[\S\s]*Response \(500\)/);
    });
  });

  describe('deleteAlert', () => {
    it('DELETEs the alert', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      fakeFetch.queue(204);

      await service.deleteAlert(7);

      expect(fakeFetch.requests[0]?.method).toBe('DELETE');
      expect(fakeFetch.requests[0]?.url).toBe('https://metrics-api.librato.com/v1/alerts/7');
    });
  });

  describe('listAlerts', () => {
    it('follows pagination until all alerts are fetched', async () => {
      const service = new LibratoService('foo@example.com', 'secret');
      const makeAlert = (id: number): Record<string, unknown> => ({ id, name: `alert-${id}`, conditions: [], services: [], rearm_per_signal: false, description: '' });

      fakeFetch.queue(200, {
        query: { offset: 0, length: 100, found: 150, total: 150 },
        alerts: Array.from({ length: 100 }, (_, index) => makeAlert(index)),
      });
      fakeFetch.queue(200, {
        query: { offset: 100, length: 100, found: 150, total: 150 },
        alerts: Array.from({ length: 50 }, (_, index) => makeAlert(100 + index)),
      });

      const alerts = await service.listAlerts('myservice_prod.');

      expect(fakeFetch.requests).toHaveLength(2);
      expect(fakeFetch.requests[0]?.url).toContain('name=myservice_prod.');
      expect(fakeFetch.requests[1]?.url).toContain('offset=100');
      // Long-standing behavior: alerts from pages after the first are fetched but not accumulated
      expect(alerts).toHaveLength(100);
    });
  });
});
