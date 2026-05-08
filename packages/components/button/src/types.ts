export const buttonIntents = ["primary", "secondary", "danger", "success", "warning"] as const;

export const buttonAppearances = ["solid", "outline", "ghost", "link"] as const;

export const buttonSizes = ["sm", "md", "lg", "icon"] as const;

export type ButtonIntent = (typeof buttonIntents)[number];

export type ButtonAppearance = (typeof buttonAppearances)[number];

export type ButtonSize = (typeof buttonSizes)[number];

export interface ButtonBaseProps {
  intent?: ButtonIntent;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  loading?: boolean;
}

export type ButtonDefaults = Required<Pick<ButtonBaseProps, "intent" | "appearance" | "size" | "loading">>;
