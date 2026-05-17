# bambiui CLI

`bambiui` installs source-distributed UI components for React, Solid, Svelte 5, and Vue 3.

```sh
npx bambiui init
npx bambiui add tabs --framework react
```

The CLI copies framework-ready public artifacts from a registry into your app. It does not require a runtime component package.

## Commands

```sh
bambiui init
bambiui add tabs --framework react
bambiui add tabs --framework solid
bambiui add tabs --framework svelte
bambiui add tabs --framework vue
```

Options:

```txt
--framework react|solid|svelte|vue
--component-dir <path>
--style-file <path>
--registry-url <url>
--cwd <path>
--force
--yes, -y
```

If framework detection is inconclusive, React defaults are used.

## Init

`init` creates `bambiui.config.json` and writes the global style file to `src/styles/bambi.css` by default.

Default config:

```json
{
  "framework": "react",
  "componentDir": "src/components/ui",
  "styleFile": "src/styles/bambi.css"
}
```

## Add

`add <component>` reads public `registry.json` version 2 and copies:

- `styles.global` to the configured style file.
- `components.<name>.files.<framework>[]` into `componentDir/<name>/`.
- `components.<name>.css` into the component directory when declared.
- `registry.json.shared` to `componentDir/bambi-helpers.ts` only when `components.<name>.helpers.<framework>` is non-empty.

Tabs output:

```txt
# react / solid
src/components/ui/bambi-helpers.ts
src/components/ui/tabs/index.tsx
src/components/ui/tabs/tabs.css

# svelte
src/components/ui/bambi-helpers.ts
src/components/ui/tabs/Tabs.svelte
src/components/ui/tabs/TabsList.svelte
src/components/ui/tabs/TabsTrigger.svelte
src/components/ui/tabs/TabsContent.svelte
src/components/ui/tabs/index.ts
src/components/ui/tabs/tabs.css

# vue
src/components/ui/bambi-helpers.ts
src/components/ui/tabs/Tabs.vue
src/components/ui/tabs/TabsList.vue
src/components/ui/tabs/TabsTrigger.vue
src/components/ui/tabs/TabsContent.vue
src/components/ui/tabs/index.ts
src/components/ui/tabs/tabs.css
```

Generated output must stay self-contained: no runtime `@bambiui/*` imports, contracts, controllers, internal primitives, or generator files.

## Maintainers

Public artifacts are generated from internal DOM Protocol authoring inputs:

```sh
pnpm registry:refresh
pnpm --filter bambiui check
```

`registry:refresh` calls `@bambiui/generator`, regenerates framework artifacts, copies CSS, validates helper declarations, refreshes hashes, and runs registry validation.

## Links

- Registry manifest: `registry.json` or `https://bambiui.com/registry.json`
- GitHub: https://github.com/bambiui/platform

## License

MIT
