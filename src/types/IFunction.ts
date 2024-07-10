import type { PartialAlert } from './config/ILibratoAlert.js';

export interface IFunction {
  name: string;
  environment?: Record<string, string>;
  libratoAlerts?: (PartialAlert | string)[];
}
