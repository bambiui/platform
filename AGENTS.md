# bambiui — Agent Quick Context

bambiui is a pnpm + Turborepo monorepo for a multi-framework UI component CLI. The CLI copies source components for React, Svelte, Vue, and Astro into user projects. Docs and builder consume the same package source through workspace dependencies.

Keep this file short to reduce Codex context usage. Load `docs/agent-context.md` only when deeper architecture, deployment, or component details are needed.

## Structure

```txt
apps/docs       # Starlight docs site
apps/builder    # static Astro token builder served at /builder
packages/cli    # bambiui init + add commands
packages/core   # shared contracts and framework-agnostic types
packages/tokens # global CSS design tokens
packages/components/button
```

## Core Rules

- Components are source files under `packages/components`; do not add per-component packages or build steps unless explicitly requested.
- `packages/cli` must not depend on `@bambiui/components` or `@bambiui/tokens` at runtime.
- Installed component source must stay self-contained for user projects.
- Shared component-agnostic contracts live in `packages/core/src/contracts.ts`; component-specific contracts derive from them.
- Global primitive, semantic, intent, and state tokens live in `packages/tokens/src/tokens.css`. Component-specific token defaults live beside each component in component CSS, for example `packages/components/button/src/button.css`.
- Button CSS is shared by all frameworks and uses `data-intent`, `data-appearance`, `data-size`, and loading/disabled attributes.
- Do not put component-specific tokens such as `--bambi-button-*` in global `tokens.css`; keep them component-local and public for scoped user overrides.
- Docs and builder share the `starlight-theme` localStorage key. Dark mode uses both `data-theme="dark"` on `<html>` and the `.dark` class.
- Builder must keep `base: '/builder'` so production assets work under `/builder`.

## Do Not

- Do not add `package.json` files, build steps, or publishable packages under individual components.
- Do not add runtime imports from installed component files to `@bambiui/*` packages.
- Do not put component tokens such as `--bambi-button-*` in `packages/tokens/src/tokens.css`.
- Do not change builder `base: '/builder'` unless the deployment model changes too.
- Do not create shared recipes or helpers unless at least two components need the same behavior and the installed output stays self-contained.
- Do not update generated template fixture files without checking the source file they mirror.

## Common Commands

```sh
pnpm install
pnpm check
pnpm build
pnpm check-types
pnpm --filter docs dev
pnpm --filter builder dev
pnpm deploy-static
```

## Verification Guide

- Component source, CSS, contracts, CLI, registry, or token changes: run `pnpm check`.
- Docs-only changes: run `pnpm --filter docs check-types`.
- Builder-only changes: run `pnpm --filter builder check-types`.
- Token-only changes: run `pnpm check-tokens` and prefer `pnpm check` before finishing.
- Registry-only changes: run `pnpm check-registry` and prefer `pnpm check` before finishing.
- Template fixture changes: run `pnpm smoke:templates`; use `pnpm smoke:templates -- --install` only when fixture dependencies are missing.

## Add A Component

1. Add or reuse shared contracts in `packages/core/src/contracts.ts`.
2. Add source and CSS under `packages/components/<name>/src/`.
3. Register it in `registry.json`.
4. Add docs at `apps/docs/src/content/docs/components/<name>.mdx`.
5. If copying button as a starting point, replace all names, CSS classes, public tokens, data attributes, file names, docs examples, and registry entries; then run `pnpm check`.

## Component Standards

- Use semantic HTML first; add ARIA only when native semantics are not enough.
- Preserve keyboard access, focus states, disabled states, loading states, and accessible names across React, Svelte, Vue, and Astro.
- Prefer each framework's native hooks, bindings, directives, and accessibility tooling over custom cross-framework abstractions.
- Keep behavior equivalent across frameworks, but write idiomatic source for each framework.
- Installed component files must remain self-contained and understandable after the CLI copies them into user projects.

## Styling & Tokens

- Put global primitive, semantic, intent, and state tokens in `packages/tokens/src/tokens.css`.
- Put component-specific token defaults beside the component, for example `packages/components/button/src/button.css`.
- Keep component CSS shared across frameworks when the visual system is the same.
- Use `data-*` attributes for component variants and states instead of framework-specific styling branches.
- Public component tokens must stay namespaced, for example `--bambi-button-*`.
- Builder token edits should write global tokens to `document.documentElement` and component overrides to scoped selectors such as `.bambi-button`.

## Registry Entry Pattern

- `exportName`: public component export, for example `"Button"`.
- `api.typeExports`: public generated or source type names the CLI should expose.
- `api.types`: generated consts, aliases, interfaces, and required defaults when the installed component needs a self-contained `types.ts`.
- `style.from`: package source CSS path; `style.fileName`: installed CSS file name.
- `shared`: self-contained files copied for every framework, such as `recipe.ts`, or generated files like `{ "kind": "types", "to": "types.ts", "generate": "types" }`.
- `files.react|svelte|vue|astro`: framework source files copied into the user project.

```json
"example": {
  "exportName": "Example",
  "api": { "typeExports": ["ExampleBaseProps"] },
  "style": {
    "from": "packages/components/example/src/example.css",
    "fileName": "example.css"
  },
  "shared": [],
  "files": {
    "react": [{ "kind": "react", "from": "packages/components/example/src/react.tsx", "to": "example.tsx" }],
    "svelte": [{ "kind": "svelte", "from": "packages/components/example/src/svelte.svelte", "to": "Example.svelte" }],
    "vue": [{ "kind": "vue", "from": "packages/components/example/src/vue.vue", "to": "Example.vue" }],
    "astro": [{ "kind": "astro", "from": "packages/components/example/src/astro.astro", "to": "Example.astro" }]
  }
}
```

## PR Checklist

- Source, CSS, docs, and registry entry are updated together.
- Installed files are self-contained and do not import bambiui runtime packages.
- Component-local CSS owns component token defaults.
- Docs include install and usage examples for supported frameworks.
- The relevant verification command from the guide has passed.

## Multi-Agent Coordination

- Keep each agent's write scope narrow and explicit.
- Do not revert or overwrite changes you did not make; adapt to them or ask if they conflict with your task.
- Run the narrowest relevant verification command for your scope before handing work back.

### Agent Roles

- Component Agent: owns `packages/components/<name>/src/**`.
- Docs Agent: owns `apps/docs/src/content/docs/**` and docs-only examples.
- Registry/CLI Agent: owns `registry.json`, `registry.schema.json`, `packages/cli/**`, and registry scripts.
- Token/Builder Agent: owns `packages/tokens/src/tokens.css` and `apps/builder/**`.
- QA Agent: stays read-mostly, runs checks, and reports regressions or missing coverage.

### Shared Files

Only one agent should edit these at a time:

- `registry.json`
- `packages/core/src/contracts.ts`
- `packages/tokens/src/tokens.css`
- `AGENTS.md`
- `docs/agent-context.md`

### Suggested Splits

- New component: Component Agent handles source and CSS, Docs Agent handles docs and examples, Registry/CLI Agent handles registry and CLI checks, QA Agent runs final verification.
- Token or builder work: Token/Builder Agent handles token model and builder UI, Docs Agent handles token docs, QA Agent runs token checks and builder checks.
- CLI behavior work: Registry/CLI Agent handles implementation and smoke tests, Docs Agent updates usage docs, QA Agent runs focused verification.

## Commit Rules

- Use commitlint-style messages with a short subject only.
- Use a type prefix such as `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, or `test:`.
- Do not add long descriptions, body text, bullet lists, or explanations to commit messages.
- Prefer concise messages like `docs: update agent rules` or `chore: refresh registry`.

## Agent Notes

- Keep this file as the short source of truth for agent startup context; put deeper or rarely needed details in `docs/agent-context.md`.
- Keep `CLAUDE.md` as a pointer to this file to avoid duplicated agent instructions drifting over time.
- Before changing generated template fixture files, check whether they are meant to mirror package source.

## Need More Detail?

Read `docs/agent-context.md` for:

- full CSS/token conventions
- full button API conventions
- docs and builder notes
- Cloudflare Pages deployment settings
- dependency graph and gotchas
