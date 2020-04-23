# serverless-librato-alerts

Serverless plugin for [Librato Alerts](https://www.librato.com/docs/kb/alert/)

## Configuration

Alerts can be defined on a global level under the `custom` section. Definitions can be overwritten per function and function specific alerts can be defined within the function definition.

### Template strings
Template strings can contain the following tokens:

| Token             | Description                                                                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `$[stackName]`    | Stack name if defined (provider.stackName). If undefined, defaults to: `<service>-<stage>`                                                              |
| `$[serviceName]`  | Name of service (service.name)                                                                                                                          |
| `$[stage]`        | Name of the stage. Value obtained in this order: --stage CLI option, config.stage, provider.stage, or default to `dev`                                  |
| `$[functionName]` | Name of function                                                                                                                                        |
| `$[functionId]`   | Logical id of the function. This is the name of the function with `-` replaced with `Dash`, `_` replaced with `Underscore`, and `Function` suffix added |
| `$[alertName]`    | Name of alert                                                                                                                                           |

## Usage

```yaml
service: foo
provider:
  name: aws
  runtime: nodejs12.x

custom:
  libratoAlerts:
    stages: # Optionally - select which stages to deploy alarms to
      - production
      - staging

    nameTemplate: "$[serviceName]_$[stage].$[functionName].$[alertName]" # Optionally - naming template for alerts, can be overwritten in definitions
    nameSearchForUpdatesAndDeletes: "$[serviceName]_$[stage].*" # Should be based on the nameTemplate. Only supports $[stackName], $[serviceName], and $[stage]

    definitions:  # these defaults are merged with your definitions
      - id: not_running
        description: 'Alert when function has not run in the last hour. Repeat alert every 15 minutes until cleared'
        conditions:
          - metric: "$[functionName].overall_time"
            type: 'absent'
            threshold: 60
        notify:
          - 145 # id of service 1
          - 42  # id of service 2
      - id: foo_bar.baz
        description: 'Alert when baz immediately goes above 5'
        nameTemplate: $[stage].$[functionName].foo_bar.baz # Optionally - naming template for the alarms, overwrites globally defined one
        rearm: 600 # Specifies the minimum amount of time between sending alert notifications, in seconds. Defaults to 600
        conditions:
          - metric: 'foo.bar.baz'
            type: 'above' # above, below, absent
            filter:
              - environment: production
            when: 'average' # min, max, average, sum, count, derivative
            threshold:
              value: 5
              duration: 0 # 0 for immediately. Or >= 60 and <= 3600 seconds 
        notify: 24 # id of service
    global:
      - not_running # Will be created for all functions

plugins:
  - serverless-librato-alerts

functions:
  foo:
    handler: foo.handler
    libratoAlerts:  # merged with global librato-alerts
      - foo_bar.baz
      - not_running # override specific settings
        conditions:
          - metric: $[functionName].overall_time
            type: 'stops reporting'
            threshold: 15
```
