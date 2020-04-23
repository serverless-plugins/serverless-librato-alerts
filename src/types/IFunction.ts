import { PartialAlert } from './config/ILibratoAlert';

export interface IFunction {
  name: string;
  libratoAlerts?: (string | PartialAlert)[];
}
