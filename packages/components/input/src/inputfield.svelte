<script module>
  let _idCounter = 0;
</script>

<script lang="ts">
  /* global HTMLInputElement */
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";
  import { inputRecipe } from "./recipe";
  import type { InputFieldBaseProps } from "./types";
  import "./input.css";

  interface Props
    extends Omit<HTMLInputAttributes, "size" | "children">,
      InputFieldBaseProps {
    class?: string;
    start?: Snippet;
    end?: Snippet;
    children?: Snippet;
  }

  let {
    class: className,
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
    id: userInputId,
    value,
    oninput,
    ...restInputProps
  }: Props = $props();

  // Stable ID for this field instance — module-level counter prevents collisions.
  const fieldKey = _idCounter++;
  const inputId = $derived(userInputId ?? `bambi-input-${fieldKey}`);
  const descriptionId = `bambi-input-${fieldKey}-desc`;
  const errorId = `bambi-input-${fieldKey}-err`;

  const isCompound = $derived(children !== undefined);

  // Track filled state for floating label.
  let isFilled = $state(Boolean(value));

  function handleInput(e: Parameters<NonNullable<HTMLInputAttributes["oninput"]>>[0]) {
    isFilled = Boolean((e.target as HTMLInputElement).value);
    if (oninput) (oninput as typeof handleInput)(e);
  }

  const resolvedTone = $derived(error ? "danger" : tone);
  const isInvalid = $derived(Boolean(invalid || error));
  const hasStart = $derived(start !== undefined);
  const hasEnd = $derived(end !== undefined);

  const describedBy = $derived(
    [description && descriptionId, (error || isInvalid) && errorId]
      .filter(Boolean)
      .join(" ") || undefined,
  );

  const cls = $derived(
    [inputRecipe.fieldClassName, className].filter(Boolean).join(" "),
  );
</script>

<div
  class={cls}
  data-variant={variant}
  data-size={size}
  data-tone={resolvedTone}
  data-label-mode={labelMode}
  data-invalid={isInvalid || undefined}
  data-disabled={disabled || undefined}
  data-readonly={readOnly || undefined}
  data-required={required || undefined}
  data-full-width={fullWidth || undefined}
  data-filled={isFilled || undefined}
>
  {#if isCompound}
    {@render children?.()}
  {:else}
    {#if label && labelMode === "normal"}
      <label class={inputRecipe.labelClassName} for={inputId}>
        {label}{#if required}<span aria-hidden="true" style="color:var(--bambi-danger)"> *</span>{/if}
      </label>
    {/if}

    <div
      class={inputRecipe.controlClassName}
      data-has-start={hasStart || undefined}
      data-has-end={hasEnd || undefined}
    >
      {#if label && labelMode === "floating"}
        <label class={inputRecipe.labelClassName} for={inputId}>
          {label}{#if required}<span aria-hidden="true" style="color:var(--bambi-danger)"> *</span>{/if}
        </label>
      {/if}

      {#if hasStart}
        <div class={inputRecipe.startClassName}>
          {@render start?.()}
        </div>
      {/if}

      <input
        {...restInputProps}
        id={inputId}
        {value}
        {disabled}
        readonly={readOnly}
        {required}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        class={inputRecipe.elementClassName}
        oninput={handleInput}
      />

      {#if hasEnd}
        <div class={inputRecipe.endClassName}>
          {@render end?.()}
        </div>
      {/if}
    </div>

    {#if description}
      <p class={inputRecipe.descriptionClassName} id={descriptionId}>
        {description}
      </p>
    {/if}

    {#if error}
      <p class={inputRecipe.errorClassName} id={errorId} role="alert">
        {error}
      </p>
    {/if}
  {/if}
</div>
