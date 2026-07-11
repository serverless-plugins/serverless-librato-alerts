import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import LibratoAlertIndex from '../src/index.js';
import type { IServerlessInstance } from '../src/types/index.js';

interface IRecordedRequest {
  url: string;
  method: string;
  body?: unknown;
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

function createServerlessInstance(): IServerlessInstance {
  return {
    service: {
      service: 'my-service',
      provider: {
        stage: 'prod',
        environment: { REGION: 'us-east-1' },
      },
      custom: {
        libratoAlerts: {
          definitions: [
            {
              name: 'highErrors',
              description: 'Too many errors',
              notify: 123,
              conditions: [
                {
                  type: 'above',
                  metric: '$(kebabCase $[functionName]).$(snakeCase $[alertName]).$[env:REGION]',
                  threshold: 5,
                  summaryFunction: 'sum',
                },
              ],
            },
          ],
          global: ['highErrors'],
        },
      },
      getAllFunctions: () => ['helloWorld'],
      getFunction: (name: string) => ({ name }),
    },
    providers: { librato: { getCredentials: () => undefined } },
    cli: { log: () => undefined },
  };
}

describe('LibratoAlertIndex deploy hook', () => {
  const originalFetch = globalThis.fetch;
  const requests: IRecordedRequest[] = [];

  beforeEach(() => {
    process.env['LIBRATO_EMAIL'] = 'foo@example.com';
    process.env['LIBRATO_TOKEN'] = 'secret';
    requests.length = 0;

    globalThis.fetch = (input, init) => {
      const url = requestUrl(input);
      requests.push({
        url,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      });

      // List alerts: no existing alerts
      if (url.includes('/v1/alerts?')) {
        return Promise.resolve(Response.json({ query: { offset: 0, length: 100, found: 0, total: 0 }, alerts: [] }));
      }

      // Retrieve metric: not found, so the plugin creates it
      if (url.includes('/v1/metrics/') && init?.method === 'GET') {
        return Promise.resolve(Response.json({ errors: ['not found'] }, { status: 404 }));
      }

      return Promise.resolve(Response.json({ id: 1, name: 'created' }));
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env['LIBRATO_EMAIL'];
    delete process.env['LIBRATO_TOKEN'];
  });

  it('creates metrics and alerts with template modifiers applied', async () => {
    const plugin = new LibratoAlertIndex(createServerlessInstance(), { stage: 'prod' });

    await plugin.hooks['deploy:deploy']?.();

    // kebabCase(helloWorld) -> hello-world, snakeCase(highErrors) -> high_errors, $[env:REGION] -> us-east-1
    const expectedMetricName = 'hello-world.high_errors.us-east-1';

    const metricCreate = requests.find((request) => request.method === 'PUT' && request.url.includes('/v1/metrics/'));
    expect(metricCreate?.url).toBe(`https://metrics-api.librato.com/v1/metrics/${expectedMetricName}`);

    const alertCreate = requests.find((request) => request.method === 'POST' && request.url.endsWith('/v1/alerts'));
    expect(alertCreate?.body).toMatchObject({
      name: 'my-service_prod.helloWorld.highErrors',
      conditions: [
        {
          metric_name: expectedMetricName,
          type: 'above',
          threshold: 5,
          summary_function: 'sum',
        },
      ],
      services: [123],
    });
  });
});
