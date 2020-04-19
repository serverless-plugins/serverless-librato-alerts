import type {
  IGlobalLibratoAlertSettings, //
  IServerlessHooks,
  IServerlessInstance,
  IServerlessOptions,
  PartialAlert,
} from './types';

export class LibratoAlertIndex {
  public readonly hooks: IServerlessHooks;

  protected readonly serverless: IServerlessInstance;

  protected readonly options: IServerlessOptions;

  public constructor(serverless: IServerlessInstance, options: IServerlessOptions) {
    this.serverless = serverless;
    this.options = options;

    this.hooks = {
      'package:compileEvents': this.compile.bind(this),
    };
  }

  private getGlobalSettings(): IGlobalLibratoAlertSettings | undefined {
    return this.serverless.service.custom.libratoAlerts;
  }

  private getStage(): string {
    return this.options.stage || this.serverless.config?.stage || this.serverless.service.provider.stage || 'dev';
  }

  private getStackName(): string {
    if (this.serverless.service.provider.stackName && typeof this.serverless.service.provider.stackName === 'string') {
      return this.serverless.service.provider.stackName;
    }

    return `${this.serverless.service.service}-${this.getStage()}`;
  }

  private compile(): void {
    const globalSettings = this.getGlobalSettings();
    const definitionsByName: { [name: string]: PartialAlert } = {};

    if (globalSettings) {
      if (globalSettings.stages && !globalSettings.stages.includes(this.getStage())) {
        this.serverless.cli.log(`Warning: Not deploying alerts on stage ${this.getStage()}`);
        return;
      }

      for (const definition of globalSettings.definitions || []) {
        if (definition.name) {
          definitionsByName[definition.name] = definition;
        }
      }
    }

    const globalAlertsByName: { [name: string]: PartialAlert } = {};
    for (const globalAlertName of globalSettings?.global || []) {
      const alert = definitionsByName[globalAlertName];
      if (!alert) {
        throw new Error(`Librato alert definition ${globalAlertName} (global) does not exist!`);
      }

      globalAlertsByName[globalAlertName] = {
        nameTemplate: globalSettings?.nameTemplate,
        ...alert,
      };
    }

    const allAlerts: PartialAlert[] = [];
    for (const functionName of this.serverless.service.getAllFunctions()) {
      const functionLogicalId = `${functionName.replace(/-/g, 'Dash').replace(/_/g, 'Underscore')}Function`;
      const functionObj = this.serverless.service.getFunction(functionName);
      const alertsByName: { [name: string]: PartialAlert } = {
        ...globalAlertsByName,
      };
      const functionAlerts = functionObj.libratoAlerts || [];

      for (const functionAlert of functionAlerts) {
        let alert: PartialAlert;
        if (typeof functionAlert === 'string') {
          alert = definitionsByName[functionAlert];

          if (!alert) {
            throw new Error(`Librato alert definition ${functionAlert} does not exist!`);
          }
        } else {
          alert = {
            nameTemplate: globalSettings?.nameTemplate,
            ...definitionsByName[functionAlert.name],
            ...functionAlert,
          };
        }

        alertsByName[alert.name] = alert;
      }

      for (const alert of Object.values(alertsByName)) {
        const nameTemplate = alert.nameTemplate || '$[serviceName]_$[stage].$[functionName].$[alertName]';
        const fullName = nameTemplate
          .replace('$[stackName]', this.getStackName())
          .replace('$[serviceName]', this.serverless.service.service)
          .replace('$[stage]', this.getStage())
          .replace('$[functionName]', functionName)
          .replace('$[functionId]', functionLogicalId)
          .replace('$[alertName]', alert.name);

        allAlerts.push({
          ...alert,
          name: fullName,
        });
      }

      // TODO: Create/Update/Delete? alerts using librato api
    }
  }
}
