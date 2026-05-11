<script setup lang="ts">
/* global Event, HTMLInputElement */
import { computed, ref, useAttrs, useSlots } from "vue";
import { inputRecipe } from "./recipe";
import type { InputFieldBaseProps } from "./types";
import "./input.css";

defineOptions({ name: "BambiInputField", inheritAttrs: false });

let _idCounter = 0;

const props = withDefaults(
  defineProps<
    InputFieldBaseProps & {
      class?: string;
      id?: string;
      value?: string | number | string[];
      modelValue?: string | number | string[];
      placeholder?: string;
      type?: string;
      name?: string;
      autocomplete?: string;
      inputmode?: string;
      pattern?: string;
      min?: string | number;
      max?: string | number;
      step?: string | number;
      minlength?: string | number;
      maxlength?: string | number;
    }
  >(),
  {
    variant: inputRecipe.defaults.variant,
    size: inputRecipe.defaults.size,
    tone: inputRecipe.defaults.tone,
    labelMode: inputRecipe.defaults.labelMode,
    fullWidth: inputRecipe.defaults.fullWidth,
    class: undefined,
    id: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  input: [event: Event];
}>();

const attrs = useAttrs();
const slots = useSlots();

const fieldKey = _idCounter++;
const inputId = computed(() => props.id ?? `bambi-input-${fieldKey}`);
const descriptionId = `bambi-input-${fieldKey}-desc`;
const errorId = `bambi-input-${fieldKey}-err`;

const isCompound = computed(() => Boolean(slots.default));

const isFilled = ref(Boolean(props.modelValue ?? props.value));

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  isFilled.value = Boolean(target.value);
  emit("update:modelValue", target.value);
  emit("input", e);
}

const resolvedTone = computed(() => (props.error ? "danger" : props.tone));
const isInvalid = computed(() => Boolean(props.invalid || props.error));
const hasStart = computed(() => Boolean(slots.start));
const hasEnd = computed(() => Boolean(slots.end));

const describedBy = computed(() => {
  const ids = [
    props.description && descriptionId,
    (props.error || isInvalid.value) && errorId,
  ].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
});

const cls = computed(() =>
  [inputRecipe.fieldClassName, props.class].filter(Boolean).join(" "),
);

const inputValue = computed(() => props.modelValue ?? props.value);
</script>

<template>
  <div
    :class="cls"
    :data-variant="props.variant"
    :data-size="props.size"
    :data-tone="resolvedTone"
    :data-label-mode="props.labelMode"
    :data-invalid="isInvalid || undefined"
    :data-disabled="props.disabled || undefined"
    :data-readonly="props.readOnly || undefined"
    :data-required="props.required || undefined"
    :data-full-width="props.fullWidth || undefined"
    :data-filled="isFilled || undefined"
  >
    <!-- Compound mode: render slot content directly -->
    <slot v-if="isCompound" />

    <!-- Props-driven mode -->
    <template v-else>
      <!-- Normal label (above control) -->
      <label
        v-if="props.label && props.labelMode === 'normal'"
        :class="inputRecipe.labelClassName"
        :for="inputId"
      >
        {{ props.label
        }}<span
          v-if="props.required"
          aria-hidden="true"
          style="color: var(--bambi-danger)"
        >
          *</span
        >
      </label>

      <!-- Control wrapper -->
      <div
        :class="inputRecipe.controlClassName"
        :data-has-start="hasStart || undefined"
        :data-has-end="hasEnd || undefined"
      >
        <!-- Floating label (inside control) -->
        <label
          v-if="props.label && props.labelMode === 'floating'"
          :class="inputRecipe.labelClassName"
          :for="inputId"
        >
          {{ props.label
          }}<span
            v-if="props.required"
            aria-hidden="true"
            style="color: var(--bambi-danger)"
          >
            *</span
          >
        </label>

        <!-- Start slot -->
        <div v-if="hasStart" :class="inputRecipe.startClassName">
          <slot name="start" />
        </div>

        <!-- Input element -->
        <input
          v-bind="attrs"
          :id="inputId"
          :value="inputValue"
          :type="props.type"
          :name="props.name"
          :placeholder="props.placeholder"
          :disabled="props.disabled"
          :readonly="props.readOnly"
          :required="props.required"
          :aria-invalid="isInvalid || undefined"
          :aria-describedby="describedBy"
          :class="inputRecipe.elementClassName"
          @input="handleInput"
        />

        <!-- End slot -->
        <div v-if="hasEnd" :class="inputRecipe.endClassName">
          <slot name="end" />
        </div>
      </div>

      <!-- Description -->
      <p
        v-if="props.description"
        :class="inputRecipe.descriptionClassName"
        :id="descriptionId"
      >
        {{ props.description }}
      </p>

      <!-- Error -->
      <p
        v-if="props.error"
        :class="inputRecipe.errorClassName"
        :id="errorId"
        role="alert"
      >
        {{ props.error }}
      </p>
    </template>
  </div>
</template>
