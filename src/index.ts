import type { IServerlessHooks, IServerlessInstance, IServerlessOptions } from './types';

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

  private getConfig() {
    return this.serverless.service.custom['librato-alerts'];
  }

  private compile(): void {
    const config = this.getConfig();
    if (!config) {
      this.serverless.cli.log('Warning: Unable to find config');
      return;
    }

    if (config.stages && !config.stages.includes(this.options.stage)) {
      this.serverless.cli.log(`Warning: Not deploying alerts on stage ${this.options.stage}`);
    }
  }
}
