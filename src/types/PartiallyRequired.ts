export type PartiallyRequired<T, TK extends keyof T> = {
  [TKey in Exclude<keyof T, TK>]?: T[TKey];
} & {
  [TKey in TK]-?: T[TKey];
};
