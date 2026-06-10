export type PrimitivePropKind = "boolean" | "string";
export type PropKind = PrimitivePropKind | "enum";

export interface BasePropDef<Kind extends PropKind, Value> {
  kind: Kind;
  attr?: string;
  default?: Value;
  controlled?: boolean;
  description?: string;
}

export interface BooleanPropDef extends BasePropDef<"boolean", boolean> {}

export interface StringPropDef extends BasePropDef<"string", string> {}

export interface EnumPropDef<Values extends readonly string[]>
  extends BasePropDef<"enum", Values[number]> {
  values: Values;
}

export type PropDef = BooleanPropDef | StringPropDef | EnumPropDef<readonly string[]>;

export type PropValue<Def extends PropDef> = Def extends BooleanPropDef
  ? boolean
  : Def extends StringPropDef
    ? string
    : Def extends EnumPropDef<infer Values>
      ? Values[number]
      : never;

export type InferProps<Props extends Record<string, PropDef>> = {
  [Key in keyof Props]?: PropValue<Props[Key]>;
};

export function boolProp(options: Omit<BooleanPropDef, "kind"> = {}): BooleanPropDef {
  return { kind: "boolean", ...options };
}

export function stringProp(options: Omit<StringPropDef, "kind"> = {}): StringPropDef {
  return { kind: "string", ...options };
}

export function enumProp<const Values extends readonly string[]>(
  values: Values,
  options: Omit<EnumPropDef<Values>, "kind" | "values"> = {},
): EnumPropDef<Values> {
  return { kind: "enum", values, ...options };
}
