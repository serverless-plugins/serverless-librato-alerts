import * as _ from 'lodash';
import { LibratoService } from './libratoService';
import type {
  IServerlessHooks, //
  IServerlessInstance,
  IServerlessOptions,
} from './types';
import type {
  IGlobalLibratoAlertSettings, //
  ILibratoAboveBelowCondition,
  ILibratoAbsentCondition,
  PartialAlert,
} from './types/config';
import type {
  CreateAlertCondition, //
  IAlertAttributes,
  IAlertResponse,
  ICreateAlertRequest,
  ICreateMetricRequest,
  ITag,
  IUpdateAlertRequest,
  UpdateCondition,
} from './types/librato';
import { ICreateMetric } from './types/config/ICreateMetric';

interface IReplaceTemplatesOptions {
  input: string;
  functionName: string;
  functionId: string;
  alertName: string;
}

class LibratoAlertIndex {
  public readonly hooks: IServerlessHooks;

  protected readonly serverless: IServerlessInstance;

  protected readonly options: IServerlessOptions;

  protected readonly stage: string;

  protected readonly stackName: string;

  protected readonly defaultNameTemplate = '$[serviceName]_$[stage].$[functionName].$[alertName]';

  protected readonly defaultNameSearchForUpdatesAndDeletes = '$[serviceName]_$[stage].';

  public constructor(serverless: IServerlessInstance, options: IServerlessOptions) {
    this.serverless = serverless;
    this.options = options;
    this.stage = this.options.stage || this.serverless.config?.stage || this.serverless.service.provider.stage || 'dev';
    this.stackName = this.getStackName();

    this.hooks = {
      'deploy:deploy': this.deploy.bind(this),
    };
  }

  private getGlobalSettings(): IGlobalLibratoAlertSettings | undefined {
    return this.serverless.service.custom.libratoAlerts;
  }

  private getStackName(): string {
    if (this.serverless.service.provider.stackName && typeof this.serverless.service.provider.stackName === 'string') {
      return this.serverless.service.provider.stackName;
    }

    return `${this.serverless.service.service}-${this.stage}`;
  }

  private replaceTemplates({ input, functionName, functionId, alertName }: IReplaceTemplatesOptions): string {
    if (!input) {
      return input;
    }

    return input
      .replace('$[alertName]', alertName)
      .replace('$[stackName]', this.stackName)
      .replace('$[serviceName]', this.serverless.service.service)
      .replace('$[stage]', this.stage)
      .replace('$[functionName]', functionName)
      .replace('$[functionId]', functionId);
  }

  private isEnabledForStage(): boolean {
    const globalSettings = this.getGlobalSettings();

    return !globalSettings || !globalSettings.stages || globalSettings.stages.includes(this.stage);
  }

  private getAlertsFromConfiguration(): PartialAlert[] {
    const globalSettings = this.getGlobalSettings();
    const definitionsByName: { [name: string]: PartialAlert } = {};

    if (globalSettings) {
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
        const nameTemplate = alert.nameTemplate || this.defaultNameTemplate;
        const fullName = this.replaceTemplates({
          input: nameTemplate,
          functionName,
          functionId: functionLogicalId,
          alertName: alert.name,
        });

        // Perform template replacement for condition metric name and tag values
        const conditions: (ILibratoAboveBelowCondition | ILibratoAbsentCondition)[] = [];
        for (const condition of alert.conditions || []) {
          let tags: ITag[] | undefined;
          if (condition.tags) {
            tags = [];
            for (const tag of condition.tags) {
              const values: string[] = [];
              for (const value of tag.values) {
                values.push(
                  this.replaceTemplates({
                    input: value,
                    functionName,
                    functionId: functionLogicalId,
                    alertName: alert.name,
                  }),
                );
              }

              tags.push({
                ...tag,
                values,
              });
            }
          }

          let configMetric: string | ICreateMetric;
          if (typeof condition.metric === 'string') {
            configMetric = this.replaceTemplates({
              input: condition.metric,
              functionName,
              functionId: functionLogicalId,
              alertName: alert.name,
            });
          } else {
            let displayName: string | undefined;
            if (condition.metric.displayName) {
              displayName = this.replaceTemplates({
                input: condition.metric.displayName,
                functionName,
                functionId: functionLogicalId,
                alertName: alert.name,
              });
            }

            configMetric = {
              ...condition.metric,
              name: this.replaceTemplates({
                input: condition.metric.name,
                functionName,
                functionId: functionLogicalId,
                alertName: alert.name,
              }),
              displayName,
            };
          }

          conditions.push({
            ...condition,
            metric: configMetric,
            tags,
          });
        }

        allAlerts.push({
          ...alert,
          name: fullName,
          conditions,
        });
      }
    }

    return allAlerts;
  }

  private async deploy(): Promise<void> {
    const isEnabled = this.isEnabledForStage();
    if (!isEnabled) {
      this.serverless.cli.log(`Warning: Not deploying alerts on stage ${this.stage}`);
      return;
    }

    const libratoService = new LibratoService();

    const globalSettings = this.getGlobalSettings();

    const alertConfigurations = this.getAlertsFromConfiguration();
    const existingAlerts = await libratoService.listAlerts(globalSettings?.nameSearchForUpdatesAndDeletes || this.defaultNameSearchForUpdatesAndDeletes);
    const existingAlertsByName = _.keyBy(existingAlerts, 'name');

    const alertsToAdd: ICreateAlertRequest[] = [];
    const alertsToUpdate: IUpdateAlertRequest[] = [];
    const metricsToAdd: ICreateMetricRequest[] = [];

    for (const alertConfiguration of alertConfigurations) {
      const existingAlert = existingAlertsByName[alertConfiguration.name];
      let added = false;
      if (existingAlert) {
        const updateAlertRequest = this.getUpdateAlertRequest(alertConfiguration, existingAlert);

        // NOTE: A null updateAlertRequest means there were no changes
        if (updateAlertRequest) {
          alertsToUpdate.push(updateAlertRequest);
          added = true;
        }
      } else {
        const createAlertRequest = this.getCreateAlertRequest(alertConfiguration);
        alertsToAdd.push(createAlertRequest);
        added = true;
      }

      if (added && alertConfiguration.conditions) {
        for (const condition of alertConfiguration.conditions) {
          if (typeof condition.metric === 'string') {
            const exists = _.some(metricsToAdd, {
              name: condition.metric,
            });

            if (!exists) {
              metricsToAdd.push({
                name: condition.metric,
                type: 'gauge',
                period: 60,
              });
            }
          } else if (condition.metric.create !== false) {
            const exists = _.some(metricsToAdd, {
              name: condition.metric.name,
            });

            if (!exists) {
              metricsToAdd.push({
                ...condition.metric,
                type: condition.metric.type || 'gauge',
                period: condition.metric.period || 60,
              });
            }
          }
        }
      }
    }

    // Remove existing alerts with similar name prefix that are not being added, updated, or ignored
    for (const existingAlert of existingAlerts) {
      if (!existingAlertsByName[existingAlert.name]) {
        this.serverless.cli.log(`Info: Deleting librato alert: ${existingAlert.id} - ${existingAlert.name}`);
        // eslint-disable-next-line no-await-in-loop
        await libratoService.deleteAlert(existingAlert.id);
      }
    }

    for (const metricRequest of metricsToAdd) {
      this.serverless.cli.log(`Info: Checking if metric exists: ${metricRequest.name}`);
      // eslint-disable-next-line no-await-in-loop
      const existingMetric = await libratoService.retrieveMetric(metricRequest.name);
      if (!existingMetric) {
        this.serverless.cli.log(`Info: Creating new metric: ${metricRequest.name}`);
        // eslint-disable-next-line no-await-in-loop
        await libratoService.createMetric(metricRequest);
      }
    }

    for (const alertRequest of alertsToAdd) {
      this.serverless.cli.log(`Info: Creating librato alert: ${alertRequest.name}`);
      // eslint-disable-next-line no-await-in-loop
      await libratoService.createAlert(alertRequest);
    }

    for (const alertRequest of alertsToUpdate) {
      this.serverless.cli.log(`Info: Updating librato alert: ${alertRequest.id} - ${alertRequest.name}`);
      // eslint-disable-next-line no-await-in-loop
      await libratoService.updateAlert(alertRequest);
    }
  }

  private getUpdateAlertRequest(alertConfiguration: PartialAlert, existingAlert: IAlertResponse): IUpdateAlertRequest | null {
    const conditions: UpdateCondition[] = [];
    const alertConfigurationConditions = alertConfiguration.conditions || [];
    for (const condition of alertConfigurationConditions) {
      const createCondition = this.getCreateAlertCondition(condition);

      const existingCondition = _.find(existingAlert.conditions, {
        // eslint-disable-next-line @typescript-eslint/camelcase
        metric_name: createCondition.metric_name,
        type: createCondition.type,
        threshold: createCondition.threshold,
        duration: createCondition.duration,
      });

      if (existingCondition && !_.find(conditions, { id: existingCondition.id })) {
        conditions.push({
          ...existingCondition,
          ...createCondition,
        });
      } else {
        conditions.push(createCondition);
      }
    }

    let attributes: IAlertAttributes | undefined;
    if (alertConfiguration.runbookUrl) {
      attributes = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        runbook_url: alertConfiguration.runbookUrl,
      };
    }

    const services: number[] = [];
    if (typeof alertConfiguration.notify === 'number') {
      services.push(alertConfiguration.notify);
    } else if (Array.isArray(alertConfiguration.notify)) {
      services.push(...alertConfiguration.notify);
    }

    const request: IUpdateAlertRequest = {
      ...existingAlert,
      name: alertConfiguration.name,
      description: alertConfiguration.description || '',
      conditions,
      attributes,
      // eslint-disable-next-line @typescript-eslint/camelcase
      rearm_seconds: alertConfiguration.rearmSeconds,
      services,
    };

    const isEqual =
      _.isEqual(request.conditions, existingAlert.conditions) &&
      _.isEqual(request.attributes, existingAlert.attributes) &&
      request.name === existingAlert.name &&
      request.description === existingAlert.description &&
      request.rearm_seconds === existingAlert.rearm_seconds &&
      _.isEqual(_.sortBy(request.services), _.sortBy(_.map(existingAlert.services, 'id')));

    if (isEqual) {
      return null;
    }

    return request;
  }

  private getCreateAlertRequest(alertConfiguration: PartialAlert): ICreateAlertRequest {
    const conditions = (alertConfiguration.conditions || []).map((condition: ILibratoAbsentCondition | ILibratoAboveBelowCondition) => this.getCreateAlertCondition(condition));

    let attributes: IAlertAttributes | undefined;
    if (alertConfiguration.runbookUrl) {
      attributes = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        runbook_url: alertConfiguration.runbookUrl,
      };
    }

    const services: number[] = [];
    if (typeof alertConfiguration.notify === 'number') {
      services.push(alertConfiguration.notify);
    } else if (Array.isArray(alertConfiguration.notify)) {
      services.push(...alertConfiguration.notify);
    }

    const request: ICreateAlertRequest = {
      name: alertConfiguration.name,
      description: alertConfiguration.description || '',
      conditions,
      attributes,
      // eslint-disable-next-line @typescript-eslint/camelcase
      rearm_seconds: alertConfiguration.rearmSeconds,
      services,
    };

    return request;
  }

  private getCreateAlertCondition(condition: ILibratoAbsentCondition | ILibratoAboveBelowCondition): CreateAlertCondition {
    let metricName: string;
    if (typeof condition.metric === 'string') {
      metricName = condition.metric;
    } else {
      metricName = condition.metric.name;
    }

    let result: CreateAlertCondition;
    if (condition.type === 'absent') {
      result = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        metric_name: metricName,
        type: condition.type,
        duration: condition.duration,
        tags: condition.tags,
        // eslint-disable-next-line @typescript-eslint/camelcase
        detect_reset: condition.detectReset,
      };
    } else {
      result = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        metric_name: metricName,
        type: condition.type,
        threshold: condition.threshold,
        tags: condition.tags,
        // eslint-disable-next-line @typescript-eslint/camelcase
        detect_reset: condition.detectReset,
        // eslint-disable-next-line @typescript-eslint/camelcase
        summary_function: condition.summaryFunction,
        duration: condition.duration,
      };
    }

    return result;
  }
}

export = LibratoAlertIndex;
