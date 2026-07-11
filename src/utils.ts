import { isDeepStrictEqual } from 'node:util';

// Splits camelCase, PascalCase, UPPER_SNAKE, kebab-case, and acronym boundaries the same way lodash's word
// splitter does for the character set allowed in template modifier values ([A-Za-z_-])
const wordPattern = /[A-Z]{2,}(?![a-z])|[A-Z][a-z]*|[a-z]+|\d+/g;

function words(value: string): string[] {
  return value.match(wordPattern) ?? [];
}

export function kebabCase(value: string): string {
  return words(value)
    .map((word) => word.toLowerCase())
    .join('-');
}

export function snakeCase(value: string): string {
  return words(value)
    .map((word) => word.toLowerCase())
    .join('_');
}

export function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function upperFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Compares two values as they would serialize over the wire: keys with undefined values are ignored
export function isJsonEqual(first: unknown, second: unknown): boolean {
  return isDeepStrictEqual(JSON.parse(JSON.stringify(first ?? null)), JSON.parse(JSON.stringify(second ?? null)));
}
