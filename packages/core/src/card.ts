export const cardVariants = ["default", "outline", "ghost", "elevated"] as const;
export const cardSizes = ["sm", "md", "lg"] as const;

export type CardVariant = (typeof cardVariants)[number];

export type CardSize = (typeof cardSizes)[number];

export interface CardBaseProps {
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean;
}

export type CardDefaults = Required<Pick<CardBaseProps, "variant" | "size" | "interactive">>;
