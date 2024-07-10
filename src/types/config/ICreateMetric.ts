export interface ICreateMetric {
  name: string;
  create?: boolean;
  type?: 'composite' | 'gauge';
  displayName?: string;
  description?: string;
  period?: number;
  attributes?: {
    color?: string;

    display_max?: number | null;

    display_min?: number | null;

    display_units_long?: string | null;

    display_units_short?: string | null;

    display_stacked?: boolean;

    summarize_function?: 'average' | 'count' | 'max' | 'min' | 'sum';
    aggregate?: boolean;
  };
  composite?: string;
  tags?: Record<string, string>;
}
