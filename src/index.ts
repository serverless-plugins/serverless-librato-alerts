import * as _ from 'lodash';

import { LibratoService } from './libratoService.js';
import type { ICreateMetric } from './types/config/ICreateMetric.js';
import type { IGlobalLibratoAlertSettings, ILibratoAboveBelowCondition, ILibratoAbsentCondition, PartialAlert } from './types/config/index.js';
import type { IServerlessHooks, IServerlessInstance, IServerlessOptions } from './types/index.js';
import type { CreateAlertCondition, IAlertAttributes, IAlertResponse, ICreateAlertRequest, ICreateMetricRequest, ITag, IUpdateAlertRequest, UpdateCondition } from './types/librato/index.js';

interface IReplaceTemplatesOptions {
  input: string;
  functionName: string;
  functionId: string;
  alertName: string;
  environment: Record<string, string>;
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
    this.stage = this.options.stage ?? this.serverless.config?.stage ?? this.serverless.service.provider.stage ?? 'dev';
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

  private replaceTemplates({ input, functionName, functionId, alertName, environment }: IReplaceTemplatesOptions): string {
    if (!input) {
      return input;
    }

    return input
      .replace(/\$\[env:([A-Z_a-z-]+)]/g, (_match: string, environmentVariable: string | undefined): string => {
        if (environmentVariable == null) {
          throw new Error('Unable to determine environment variable name from template string');
        }

        const value = environment[environmentVariable];
        if (value == null) {
          throw new Error(`Unable to find environment variable: ${environmentVariable}`);
        }

        return value;
      })
      .replace('$[alertName]', alertName)
      .replace('$[stackName]', this.stackName)
      .replace('$[serviceName]', this.serverless.service.service)
      .replace('$[stage]', this.stage)
      .replace('$[functionName]', functionName)
      .replace('$[functionId]', functionId)
      .replace(/\$\(([A-Za-z]+) ([A-Z_a-z-]+)\)/g, (_match: string, modifier: string, value: string) => {
        switch (modifier) {
          case 'kebabCase':
            return _.kebabCase(value);
          case 'snakeCase':
            return _.snakeCase(value);
          case 'lowerFirst':
            return _.lowerFirst(value);
          case 'toLower':
            return _.toLower(value);
          case 'upperFirst':
            return _.upperFirst(value);
          case 'toUpper':
            return _.toUpper(value);
          default:
            return value;
        }
      });
  }

  private isEnabledForStage(): boolean {
    const globalSettings = this.getGlobalSettings();

    return !globalSettings?.stages || globalSettings.stages.includes(this.stage);
  }

  private getAlertsFromConfiguration(): PartialAlert[] {
    const globalSettings = this.getGlobalSettings();
    const definitionsByName: Record<string, PartialAlert> = {};

    if (globalSettings) {
      for (const definition of globalSettings.definitions ?? []) {
        if (definition.name) {
          definitionsByName[definition.name] = definition;
        }
      }
    }

    const globalAlertsByName: Record<string, PartialAlert> = {};
    for (const globalAlertName of globalSettings?.global ?? []) {
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
      const alertsByName: Record<string, PartialAlert> = {
        ...globalAlertsByName,
      };
      const functionAlerts = functionObj.libratoAlerts ?? [];

      for (const functionAlert of functionAlerts) {
        let alert: PartialAlert;
        if (typeof functionAlert === 'string') {
          const alertDefinition = definitionsByName[functionAlert];
          if (!alertDefinition) {
            throw new Error(`Librato alert definition ${functionAlert} does not exist!`);
          }

          alert = alertDefinition;
        } else {
          alert = {
            nameTemplate: globalSettings?.nameTemplate,
            ...definitionsByName[functionAlert.name],
            ...functionAlert,
          };
        }

        alertsByName[alert.name] = alert;
      }

      const environment = {
        ...this.serverless.service.provider.environment,
        ...functionObj.environment,
      };

      for (const alert of Object.values(alertsByName)) {
        const nameTemplate = alert.nameTemplate ?? this.defaultNameTemplate;
        const fullName = this.replaceTemplates({
          input: nameTemplate,
          functionName,
          functionId: functionLogicalId,
          alertName: alert.name,
          environment,
        });

        // Perform template replacement for condition metric name and tag values
        const conditions: (ILibratoAboveBelowCondition | ILibratoAbsentCondition)[] = [];
        for (const condition of alert.conditions ?? []) {
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
                    environment,
                  }),
                );
              }

              tags.push({
                ...tag,
                values,
              });
            }
          }

          const source = condition.source
            ? this.replaceTemplates({
                input: condition.source,
                functionName,
                functionId: functionLogicalId,
                alertName: alert.name,
                environment,
              })
            : condition.source;

          let configMetric: ICreateMetric | string;
          if (typeof condition.metric === 'string') {
            configMetric = this.replaceTemplates({
              input: condition.metric,
              functionName,
              functionId: functionLogicalId,
              alertName: alert.name,
              environment,
            });
          } else {
            let displayName: string | undefined;
            if (condition.metric.displayName) {
              displayName = this.replaceTemplates({
                input: condition.metric.displayName,
                functionName,
                functionId: functionLogicalId,
                alertName: alert.name,
                environment,
              });
            }

            configMetric = {
              ...condition.metric,
              name: this.replaceTemplates({
                input: condition.metric.name,
                functionName,
                functionId: functionLogicalId,
                alertName: alert.name,
                environment,
              }),
              displayName,
            };
          }

          conditions.push({
            ...condition,
            metric: configMetric,
            source,
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
    const existingAlertSearchText = this.replaceTemplates({
      input: globalSettings?.nameSearchForUpdatesAndDeletes ?? this.defaultNameSearchForUpdatesAndDeletes,
      alertName: '',
      environment: this.serverless.service.provider.environment ?? {},
      functionId: '',
      functionName: '',
    });
    this.serverless.cli.log(`Info: Fetching existing librato alerts... Search text: ${existingAlertSearchText}`);
    const existingAlerts = await libratoService.listAlerts(existingAlertSearchText);
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
                type: condition.metric.type ?? 'gauge',
                period: condition.metric.period ?? 60,
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
    const alertConfigurationConditions = alertConfiguration.conditions ?? [];
    let hasNewCondition = false;
    for (const condition of alertConfigurationConditions) {
      const createCondition = this.getCreateAlertCondition(condition);

      const existingCondition = _.find(existingAlert.conditions, {
        metric_name: createCondition.metric_name,
        type: createCondition.type,
        duration: createCondition.duration,
      });

      if (existingCondition && !_.find(conditions, { id: existingCondition.id })) {
        const mergedCondition = {
          ...existingCondition,
          ...createCondition,
        };
        conditions.push(mergedCondition);

        hasNewCondition = hasNewCondition || !_.isMatch(existingCondition, mergedCondition) || !_.isMatch(mergedCondition, existingCondition);
      } else {
        conditions.push(createCondition);
        hasNewCondition = true;
      }
    }

    let attributes: IAlertAttributes | undefined;
    if (alertConfiguration.runbookUrl) {
      attributes = {
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
      description: alertConfiguration.description ?? '',
      conditions,
      attributes,

      rearm_seconds: alertConfiguration.rearmSeconds,
      services,
    };

    const isEqual =
      request.name === existingAlert.name &&
      request.description === existingAlert.description &&
      (!request.rearm_seconds || request.rearm_seconds === existingAlert.rearm_seconds) &&
      hasNewCondition &&
      ((!request.attributes && !existingAlert.attributes) || _.isEqual(request.attributes, existingAlert.attributes)) &&
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ((!request.services && !existingAlert.services) || _.isEqual(_.sortBy(request.services), _.sortBy(_.map(existingAlert.services, 'id'))));

    if (isEqual) {
      return null;
    }

    return request;
  }

  private getCreateAlertRequest(alertConfiguration: PartialAlert): ICreateAlertRequest {
    const conditions = (alertConfiguration.conditions ?? []).map((condition: ILibratoAboveBelowCondition | ILibratoAbsentCondition) => this.getCreateAlertCondition(condition));

    let attributes: IAlertAttributes | undefined;
    if (alertConfiguration.runbookUrl) {
      attributes = {
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
      description: alertConfiguration.description ?? '',
      conditions,
      attributes,

      rearm_seconds: alertConfiguration.rearmSeconds,
      services,
    };

    return request;
  }

  private getCreateAlertCondition(condition: ILibratoAboveBelowCondition | ILibratoAbsentCondition): CreateAlertCondition {
    let metricName: string;
    if (typeof condition.metric === 'string') {
      metricName = condition.metric;
    } else {
      metricName = condition.metric.name;
    }

    let result: CreateAlertCondition;
    if (condition.type === 'absent') {
      result = {
        metric_name: metricName,
        source: condition.source,
        type: condition.type,
        duration: condition.duration,
        tags: condition.tags,

        detect_reset: condition.detectReset,
      };
    } else {
      result = {
        metric_name: metricName,
        source: condition.source,
        type: condition.type,
        threshold: condition.threshold,
        tags: condition.tags,

        detect_reset: condition.detectReset,

        summary_function: condition.summaryFunction,
        duration: condition.duration,
      };
    }

    return result;
  }
}

export default LibratoAlertIndex;
