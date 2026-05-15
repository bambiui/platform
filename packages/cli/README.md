# bambiui CLI

CLI-first, source-distributed UI components for React, Svelte, Vue, Solid, and plain HTML.

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
- `src/components/ui/<name>/component/<name>.contract.ts`
- `src/components/ui/<name>/component/<name>.controller.ts`
- Framework wrapper/template files (e.g. `tabs.react.tsx`, `tabs.svelte`, `tabs.vue`, etc.)
- `src/components/ui/<name>/tabs.ts` barrel re-exporting all framework components

## Commands

```sh
bambiui init
bambiui add tabs --framework react
```

Options:

```txt
--framework react|svelte|vue|solid|html
--component-dir <path>
--style-file <path>
--registry-url <url>
--cwd <path>
--force
--yes, -y
```

> **Astro**: there is no dedicated Astro wrapper. Astro users should use the `html` output, which provides a plain TypeScript auto-mount helper compatible with any HTML-based environment.

> **`--tokens-file`**: removed. Use `--style-file` to specify a custom output path for the global style file.

## Links

- Registry manifest: `registry.json` (local) or `https://bambiui.com/registry.json` (hosted)
- GitHub: https://github.com/bambiui/platform

## License

MIT
