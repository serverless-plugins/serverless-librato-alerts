export interface ICreateMetric {
  name: string;
  create?: boolean;
  type?: 'composite' | 'gauge';
  displayName?: string;
  description?: string;
  period?: number;
  attributes?: {
    color?: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    display_max?: number | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    display_min?: number | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    display_units_long?: string | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    display_units_short?: string | null;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    display_stacked?: boolean;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    summarize_function?: 'average' | 'count' | 'max' | 'min' | 'sum';
    aggregate?: boolean;
  };
  composite?: string;
  tags?: { [index: string]: string };
}
