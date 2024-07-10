import type { IGlobalLibratoAlertSettings } from './config/IGlobalLibratoAlertSettings.js';
import type { IFunction } from './IFunction.js';

export interface IServerlessInstance {
  service: {
    service: string;
    provider: {
      stage?: string;
      stackName?: string;
      environment?: Record<string, string>;
    };
    custom: {
      libratoAlerts?: IGlobalLibratoAlertSettings;
    };
    getAllFunctions(): string[];
    getFunction(name: string): IFunction;
  };
  config?: {
    stage?: string;
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
