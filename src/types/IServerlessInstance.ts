import { IFunction } from './IFunction';
import { ILibratoAlert } from './ILibratoAlert';

export interface IServerlessInstance {
  service: {
    service: string;
    provider: {
      stage: string;
      stackName: string;
    };
    custom: {
      'librato-alerts': {
        stages?: string[];
        definitions?: ILibratoAlert[];
        global?: string[];
      };
    };
    getAllFunctions(): string[];
    getFunction(name: string): IFunction[];
  };
  providers: {
    librato: {
      getCredentials(): void;
    };
  };
  cli: {
    log(str: string, entity?: string): void;
  };
}
