# bambiui CLI

CLI-first, public source-distributed UI components for React.

bambiui is currently focusing on React as the first canonical adapter target.
Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

```sh
npx bambiui init
npx bambiui add tabs --framework react
```

bambiui copies framework-ready public component artifacts directly into your app. It does not require a runtime component package. Generated output is self-contained and must not include `@bambiui/*` imports, contracts, controllers, adapter helpers, or generator files.

Maintainers refresh public artifacts with `pnpm registry:refresh`; this calls internal `@bambiui/generator` framework dispatch, parses internal contracts, emits framework parts from contract metadata, inlines controller behavior, and copies component CSS.

## Init

`init` writes the global style file to `src/styles/bambi.css` by default and creates `bambiui.config.json`. If React cannot be detected, the CLI uses React defaults during the React-only migration.

## Add

`add <component>` copies the following into your project:

- `src/styles/bambi.css` (if not already present)
- Files listed in public `registry.json` for the selected framework

For Tabs React today, that means:

```txt
src/components/ui/tabs/index.tsx
src/components/ui/tabs/tabs.css
```

`add` also ensures the global style file exists, so `bambiui add tabs --framework react` is safe before `init`. Running `init` is still recommended so `bambiui.config.json` records your paths.

## Commands

```sh
bambiui init
bambiui add tabs --framework react
```

Options:

```txt
--framework react
--component-dir <path>
--style-file <path>
--registry-url <url>
--cwd <path>
--force
--yes, -y
```

> **`--tokens-file`**: removed. Use `--style-file` to specify a custom output path for the global style file.

## Links

- Registry manifest: `registry.json` (local) or `https://bambiui.com/registry.json` (hosted)
- GitHub: https://github.com/bambiui/platform

## License

MIT
