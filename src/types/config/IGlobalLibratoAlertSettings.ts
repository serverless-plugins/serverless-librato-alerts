import type { PartialAlert } from './ILibratoAlert.js';

export interface IGlobalLibratoAlertSettings {
  stages?: string[];
  nameTemplate?: string;
  nameSearchForUpdatesAndDeletes?: string;
  definitions?: PartialAlert[];
  global?: string[];
}
