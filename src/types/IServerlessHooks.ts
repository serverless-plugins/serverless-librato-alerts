export interface IServerlessHooks {
  [index: string]: () => Promise<void>;
}
