import { PartialAlert } from './ILibratoAlert';

export interface IGlobalLibratoAlertSettings {
  stages?: string[];
  nameTemplate?: string;
  nameSearchForUpdatesAndDeletes?: string;
  definitions?: PartialAlert[];
  global?: string[];
}
