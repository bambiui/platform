import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";
import { inputRecipe } from "./recipe";
import type { InputFieldBaseProps } from "./types";
import "./input.css";

export type {
  InputBaseProps,
  InputFieldBaseProps,
  InputDefaults,
  InputFieldDefaults,
  InputVariant,
  InputSize,
  InputTone,
  InputLabelMode,
} from "./types";

export {
  inputVariants,
  inputSizes,
  inputTones,
  inputLabelModes,
} from "./types";

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

// ─── Field context ────────────────────────────────────────────────────────────
// Shared between InputField (provider) and compound primitives (consumers).
// Enables automatic id/htmlFor/aria-describedby wiring in compound usage.

interface InputFieldContextValue {
  inputId: string;
  descriptionId: string;
  errorId: string;
}

const InputFieldContext = createContext<InputFieldContextValue | null>(null);

function useInputFieldContext() {
  return useContext(InputFieldContext);
}

// ─── Input ────────────────────────────────────────────────────────────────────
// Standalone native input. When rendered inside <InputField> the context
// automatically supplies id and aria-describedby so the user does not need
// to manage IDs manually in compound usage.
//
// InputBaseProps variant/size/tone/fullWidth are intentionally omitted here —
// those are field-level concerns applied via data-* on the InputField wrapper.

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Marks the input as invalid; sets aria-invalid="true". */
  invalid?: boolean;
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    invalid,
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref,
) {
  const ctx = useInputFieldContext();

  const resolvedId = id ?? ctx?.inputId;
  const resolvedDescribedBy =
    ariaDescribedBy ??
    (ctx ? `${ctx.descriptionId} ${ctx.errorId}` : undefined);
  const resolvedInvalid =
    ariaInvalid !== undefined
      ? ariaInvalid
      : invalid
        ? ("true" as const)
        : undefined;

  return (
    <input
      {...props}
      ref={ref}
      id={resolvedId}
      aria-describedby={resolvedDescribedBy}
      aria-invalid={resolvedInvalid}
      className={cn(inputRecipe.elementClassName, className)}
    />
  );
});

// ─── InputLabel ───────────────────────────────────────────────────────────────

export type InputLabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const InputLabel = forwardRef<HTMLLabelElement, InputLabelProps>(
  function InputLabel({ children, className, htmlFor, ...props }, ref) {
    const ctx = useInputFieldContext();
    return (
      <label
        {...props}
        ref={ref}
        htmlFor={htmlFor ?? ctx?.inputId}
        className={cn(inputRecipe.labelClassName, className)}
      >
        {children}
      </label>
    );
  },
);

// ─── InputDescription ─────────────────────────────────────────────────────────

export type InputDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const InputDescription = forwardRef<
  HTMLParagraphElement,
  InputDescriptionProps
>(function InputDescription({ children, className, id, ...props }, ref) {
  const ctx = useInputFieldContext();
  return (
    <p
      {...props}
      ref={ref}
      id={id ?? ctx?.descriptionId}
      className={cn(inputRecipe.descriptionClassName, className)}
    >
      {children}
    </p>
  );
});

// ─── InputError ───────────────────────────────────────────────────────────────

export type InputErrorProps = HTMLAttributes<HTMLParagraphElement>;

export const InputError = forwardRef<HTMLParagraphElement, InputErrorProps>(
  function InputError({ children, className, id, role = "alert", ...props }, ref) {
    const ctx = useInputFieldContext();
    return (
      <p
        {...props}
        ref={ref}
        id={id ?? ctx?.errorId}
        role={role}
        className={cn(inputRecipe.errorClassName, className)}
      >
        {children}
      </p>
    );
  },
);

// ─── InputStart ───────────────────────────────────────────────────────────────

export type InputStartProps = HTMLAttributes<HTMLDivElement>;

export const InputStart = forwardRef<HTMLDivElement, InputStartProps>(
  function InputStart({ children, className, ...props }, ref) {
    return (
      <div
        {...props}
        ref={ref}
        className={cn(inputRecipe.startClassName, className)}
      >
        {children}
      </div>
    );
  },
);

// ─── InputEnd ─────────────────────────────────────────────────────────────────

export type InputEndProps = HTMLAttributes<HTMLDivElement>;

export const InputEnd = forwardRef<HTMLDivElement, InputEndProps>(
  function InputEnd({ children, className, ...props }, ref) {
    return (
      <div
        {...props}
        ref={ref}
        className={cn(inputRecipe.endClassName, className)}
      >
        {children}
      </div>
    );
  },
);

// ─── InputControl ─────────────────────────────────────────────────────────────

export interface InputControlProps extends HTMLAttributes<HTMLDivElement> {
  hasStart?: boolean;
  hasEnd?: boolean;
}

export const InputControl = forwardRef<HTMLDivElement, InputControlProps>(
  function InputControl(
    { children, className, hasStart, hasEnd, ...props },
    ref,
  ) {
    return (
      <div
        {...props}
        ref={ref}
        data-has-start={hasStart || undefined}
        data-has-end={hasEnd || undefined}
        className={cn(inputRecipe.controlClassName, className)}
      >
        {children}
      </div>
    );
  },
);

// ─── InputField ───────────────────────────────────────────────────────────────
// Props-driven convenience wrapper AND context provider for compound usage.
//
// Props-driven (no children): renders Label + Control + Input + Description + Error.
// Compound (children provided): wraps children and provides field context.
//
// The "size" HTML attribute (number) is excluded to avoid conflict with our
// variant size prop. Use minLength/maxLength for character limits.

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "size"      // our InputSize variant, not the HTML size attribute
  | "children"
>;

export interface InputFieldProps extends NativeInputProps, InputFieldBaseProps {
  /** Start adornment (icon, text, etc.) — props-driven mode only. */
  start?: ReactNode;
  /** End adornment (icon, text, etc.) — props-driven mode only. */
  end?: ReactNode;
  /** Compound children. When provided, InputField acts as a styled wrapper. */
  children?: ReactNode;
  /** Wrapper className. */
  className?: string;
}

export const InputField = forwardRef<HTMLDivElement, InputFieldProps>(
  function InputField(
    {
      // Field / wrapper props
      className,
      variant = inputRecipe.defaults.variant,
      size = inputRecipe.defaults.size,
      tone = inputRecipe.defaults.tone,
      invalid,
      fullWidth = inputRecipe.defaults.fullWidth,
      label,
      labelMode = inputRecipe.defaults.labelMode,
      description,
      error,
      required,
      disabled,
      readOnly,
      start,
      end,
      children,
      // Input element props
      id: userInputId,
      value,
      defaultValue,
      onChange,
      ...restInputProps
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = userInputId ?? `${generatedId}input`;
    const descriptionId = `${generatedId}desc`;
    const errorId = `${generatedId}err`;

    const isCompound = children !== undefined;
    const isControlled = value !== undefined;

    // For uncontrolled inputs, track filled state via onChange.
    // For controlled inputs, derive directly from the value prop — no state needed.
    const [uncontrolledFilled, setUncontrolledFilled] = useState(() =>
      Boolean(defaultValue),
    );
    const isFilled = isControlled ? Boolean(value) : uncontrolledFilled;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setUncontrolledFilled(Boolean(e.target.value));
      }
      onChange?.(e);
    };

    const resolvedTone = error ? "danger" : tone;
    const isInvalid = Boolean(invalid || error);

    const ctx: InputFieldContextValue = { inputId, descriptionId, errorId };

    const fieldDataAttrs = {
      "data-variant": variant,
      "data-size": size,
      "data-tone": resolvedTone,
      "data-label-mode": labelMode,
      "data-invalid": isInvalid || undefined,
      "data-disabled": disabled || undefined,
      "data-readonly": readOnly || undefined,
      "data-required": required || undefined,
      "data-full-width": fullWidth || undefined,
      "data-filled": isFilled || undefined,
    };

    if (isCompound) {
      return (
        <InputFieldContext.Provider value={ctx}>
          <div
            ref={ref}
            className={cn(inputRecipe.fieldClassName, className)}
            {...fieldDataAttrs}
          >
            {children}
          </div>
        </InputFieldContext.Provider>
      );
    }

    // ── Props-driven rendering ──────────────────────────────────────────────
    const hasStart = start !== undefined;
    const hasEnd = end !== undefined;

    const describedBy = [
      description && descriptionId,
      (error || isInvalid) && errorId,
    ]
      .filter(Boolean)
      .join(" ");

    const labelEl = label ? (
      <label className={inputRecipe.labelClassName} htmlFor={inputId}>
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: "var(--bambi-danger)" }}>
            {" "}
            *
          </span>
        )}
      </label>
    ) : null;

    const controlEl = (
      <div
        className={inputRecipe.controlClassName}
        data-has-start={hasStart || undefined}
        data-has-end={hasEnd || undefined}
      >
        {labelMode === "floating" && labelEl}
        {hasStart && (
          <div className={inputRecipe.startClassName}>{start}</div>
        )}
        <input
          {...restInputProps}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy || undefined}
          className={inputRecipe.elementClassName}
        />
        {hasEnd && <div className={inputRecipe.endClassName}>{end}</div>}
      </div>
    );

    return (
      <InputFieldContext.Provider value={ctx}>
        <div
          ref={ref}
          className={cn(inputRecipe.fieldClassName, className)}
          {...fieldDataAttrs}
        >
          {labelMode === "normal" && labelEl}
          {controlEl}
          {description && (
            <p className={inputRecipe.descriptionClassName} id={descriptionId}>
              {description}
            </p>
          )}
          {error && (
            <p
              className={inputRecipe.errorClassName}
              id={errorId}
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </InputFieldContext.Provider>
    );
  },
);
