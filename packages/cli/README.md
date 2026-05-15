# bambiui CLI

CLI-first, source-distributed UI components for React.

bambiui is currently focusing on React as the first canonical adapter target.
Vue, Svelte and Solid support are intentionally removed during the generic adapter migration and will be rebuilt later.

```sh
npx bambiui init
npx bambiui add tabs --framework react
```

bambiui copies framework-specific component source files directly into your app. It does not require a runtime component package. Generated output is self-contained — no `@bambiui/*` imports remain after install.

## Init

`init` writes the global style file to `src/styles/bambi.css` by default and creates `bambiui.config.json`.

## Add

`add <component>` copies the following into your project:

- `src/styles/bambi.css` (if not already present)
- `src/components/ui/<name>/component/<name>.css`
- Shared contract helper files referenced by the registry, when present
- `src/components/ui/<name>/component/<name>.contract.ts`
- `src/components/ui/<name>/component/<name>.controller.ts`
- Framework adapter helper files referenced by the registry, when present
- React wrapper/template files (e.g. `tabs.react.tsx`)
- `src/components/ui/<name>/tabs.ts` barrel re-exporting React components

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
