# Component Migration Contract

This document is the Phase 1 contract for migrating components from `platform-legacy` into the standalone `platform` package.

## Source of truth

New components are authored in `platform/src/core/components/<component>` and exposed through `platform/src/registry/registry.ts`.

The active flow is:

```txt
src/core -> src/generator -> src/registry -> src/cli -> www public registry -> user project
```

Generated framework wrappers must not become an independent behavior layer. Component behavior belongs in the core authoring source and generated wrappers should only adapt that behavior to the target framework.

## Token contract

Users must be able to create their own design systems by overriding public `--bambi-*` CSS custom properties.

Every migrated component must satisfy the token rule:

- Use CSS custom properties for visual styling.
- Preserve token layering: primitive -> semantic -> intent/state -> component.
- Expose component-specific tokens where customization is meaningful.
- Component-specific defaults should derive from semantic or intent tokens.
- Avoid hardcoded colors, spacing, radii, typography, shadows, and state styles when a token can represent the value.
- Add Studio token metadata for new public tokens so users can discover and edit them.

## Required files per component

For a component named `<name>`:

```txt
src/core/components/<name>/index.ts
src/core/components/<name>/<name>.css
```

Then update:

```txt
src/core/components/index.ts
src/registry/registry.ts
```

If the component needs shared helpers, use files from:

```txt
src/core/shared
src/core/define-component.ts
```

Do not introduce runtime package dependencies into installed output.

## Registry requirements

A migrated component must be present in `registry.components` and install through every supported framework target:

```txt
vanilla
react
solid
svelte
vue
```

`www/scripts/refresh-registry.mjs` queries `bambi list --json` for the component and framework list. Do not hardcode new components in the `www` app.

The public registry refresh uses CLI local-source mode during publishing so a newly-added component can be generated before it exists in the previous public manifest.

## Studio requirements

When adding public tokens or component-specific tokens, update Studio so users can edit them.

At minimum, a component migration should consider:

```txt
studio/src/studio/registry/components.tsx
studio/src/studio/tokens/metadata.ts
studio/src/studio/tokens/defaults.ts
studio/src/components/ui/styles/*
```

Studio import/export must preserve global token overrides, component-specific token overrides, and per-scheme values.

## Migration checklist

For each component:

- [ ] Inspect the legacy component contract/controller/CSS.
- [ ] Author the new core component source.
- [ ] Author tokenized component CSS.
- [ ] Export it from `src/core/components/index.ts`.
- [ ] Add it to `src/registry/registry.ts` with required helpers/styles/SSR metadata.
- [ ] Run `pnpm build:cli`.
- [ ] Run `pnpm check:cli`.
- [ ] Refresh the public registry from `www` with `pnpm registry:refresh`.
- [ ] Build `www` with `pnpm build`.
- [ ] Add/update Studio preview and token metadata.
- [ ] Build Studio.

## Recommended migration order

Start with low-interaction/presentational components:

```txt
badge
kbd
code
separator
skeleton
spinner
```

Then move to form primitives, layout/surface components, and overlay/disclosure components.
