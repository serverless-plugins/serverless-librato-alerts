export interface ICreateMetricRequest {
  type: 'gauge' | 'counter' | 'composite';
  name: string;
  display_name?: string;
  description?: string;
  period?: number;
  attributes?: {
    color?: string;
    display_max?: number | null;
    display_min?: number | null;
    display_units_long?: string | null;
    display_units_short?: string | null;
    display_stacked?: boolean;
    summarize_function?: 'average' | 'sum' | 'count' | 'min' | 'max';
    aggregate?: boolean;
  };
  composite?: string;
  tags?: { [index: string]: string };
}
