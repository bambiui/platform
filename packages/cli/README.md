# bambiui CLI

CLI-first, source-distributed UI components for React, Svelte, Vue, and Astro.

```sh
npx bambiui init
npx bambiui add button
```

bambiui copies framework-specific component source files into your app. It does not require a runtime component package.

`init` writes global tokens to `src/styles/bambi.css` by default. `add button` writes source, recipe, types, component CSS, and an `index.ts` barrel that re-exports the component, recipe helpers, defaults, and public types.

## Commands

```sh
bambiui init
bambiui add button
```

Options:

```txt
--framework react|svelte|vue|astro
--component-dir <path>
--tokens-file <path>
--registry-url <url>
--cwd <path>
--force
--yes, -y
```

## Links

- Documentation: https://bambiui.com
- Registry manifest: https://bambiui.com/registry.json
- GitHub: https://github.com/bambiui/platform

## License

MIT
