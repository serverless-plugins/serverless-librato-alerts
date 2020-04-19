import { PartialAlert } from './ILibratoAlert';

export interface IFunction {
  name: string;
  libratoAlerts?: (string | PartialAlert)[];
}
