import { ILibratoAlert } from './ILibratoAlert';

export interface IFunction {
  name: string;
  'librato-alerts'?: ILibratoAlert[];
}
