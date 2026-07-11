import { describe, expect, it } from 'vite-plus/test';

import { isJsonEqual, kebabCase, lowerFirst, snakeCase, upperFirst } from '../src/utils.js';

describe('kebabCase', () => {
  it.each([
    ['fooBar', 'foo-bar'],
    ['FooBar', 'foo-bar'],
    ['foo-bar', 'foo-bar'],
    ['foo_bar', 'foo-bar'],
    ['FOO_BAR', 'foo-bar'],
    ['FOOBar', 'foo-bar'],
    ['XMLHttpRequest', 'xml-http-request'],
    ['foo', 'foo'],
    ['FOO', 'foo'],
    ['', ''],
  ])('converts %s to %s (lodash parity)', (input, expected) => {
    expect(kebabCase(input)).toBe(expected);
  });
});

describe('snakeCase', () => {
  it.each([
    ['fooBar', 'foo_bar'],
    ['FooBar', 'foo_bar'],
    ['foo-bar', 'foo_bar'],
    ['foo_bar', 'foo_bar'],
    ['FOO_BAR', 'foo_bar'],
    ['helloWorld-again', 'hello_world_again'],
  ])('converts %s to %s (lodash parity)', (input, expected) => {
    expect(snakeCase(input)).toBe(expected);
  });
});

describe('lowerFirst', () => {
  it.each([
    ['Foo', 'foo'],
    ['FOO', 'fOO'],
    ['foo', 'foo'],
    ['', ''],
  ])('converts %s to %s', (input, expected) => {
    expect(lowerFirst(input)).toBe(expected);
  });
});

describe('upperFirst', () => {
  it.each([
    ['foo', 'Foo'],
    ['FOO', 'FOO'],
    ['', ''],
  ])('converts %s to %s', (input, expected) => {
    expect(upperFirst(input)).toBe(expected);
  });
});

describe('isJsonEqual', () => {
  it('treats structurally equal objects as equal', () => {
    expect(isJsonEqual({ metric_name: 'foo', duration: 60 }, { metric_name: 'foo', duration: 60 })).toBe(true);
  });

  it('ignores keys with undefined values', () => {
    expect(isJsonEqual({ metric_name: 'foo', tags: undefined }, { metric_name: 'foo' })).toBe(true);
  });

  it('detects differing values', () => {
    expect(isJsonEqual({ metric_name: 'foo', threshold: 1 }, { metric_name: 'foo', threshold: 2 })).toBe(false);
  });

  it('detects removed nested values', () => {
    expect(isJsonEqual({ metric_name: 'foo', tags: [{ name: 'env', values: ['prod'] }] }, { metric_name: 'foo' })).toBe(false);
  });

  it('compares nested arrays deeply', () => {
    expect(isJsonEqual({ tags: [{ name: 'env', values: ['prod'] }] }, { tags: [{ name: 'env', values: ['prod'] }] })).toBe(true);
  });

  it('handles undefined inputs', () => {
    expect(isJsonEqual(undefined, undefined)).toBe(true);
    expect(isJsonEqual(undefined, { name: 'foo' })).toBe(false);
  });
});
