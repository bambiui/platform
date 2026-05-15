export type BambiPrimitiveType = "boolean" | "number" | "string";

export type BambiEnumType = readonly string[];

export type BambiPropType = BambiPrimitiveType | BambiEnumType;

export interface BambiPropDefinition {
  type: BambiPropType;
  attribute?: string;
  defaultValue?: string | number | boolean;
  controlled?: boolean;
}

export type BambiPropSchema = Record<string, BambiPropType | BambiPropDefinition>;

export interface BambiEventDefinition {
  name: string;
  detail: BambiPropType;
}

export type BambiEventSchema = Record<string, BambiPropType | BambiEventDefinition>;

export interface BambiPartDefinition {
  name: string;
  selector: string;
  attribute: string;
  role?: string;
  element?: string;
}

export type BambiPartSchema = readonly (string | BambiPartDefinition)[];

export interface BambiA11yDefinition {
  roles?: Record<string, string>;
  keyboard?: readonly string[];
  relationships?: Record<string, string>;
}

export interface BambiComponentContract<
  TName extends string = string,
  TParts extends BambiPartSchema = BambiPartSchema,
  TProps extends BambiPropSchema = BambiPropSchema,
  TEvents extends BambiEventSchema = BambiEventSchema,
> {
  name: TName;
  parts: TParts;
  props?: TProps;
  events?: TEvents;
  dataAttributes?: Record<string, BambiPropType>;
  a11y?: BambiA11yDefinition;
}
