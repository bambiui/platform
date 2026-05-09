# Release Checklist

Use this checklist when publishing a new BambiUI CLI or registry release.

## 1. Verify Locally

```sh
pnpm install
pnpm check
pnpm deploy-static
```

Confirm the generated docs output contains the hosted registry files:

```sh
ls apps/docs/dist/registry.json
ls apps/docs/dist/registry.schema.json
ls apps/docs/dist/packages/tokens/src/tokens.css
```

## 2. Deploy The Site

Deploy `apps/docs/dist` to Cloudflare Pages.

After deploy, verify:

```sh
curl -I https://bambi-ui.felekoglu.dev
curl -I https://bambi-ui.felekoglu.dev/builder/
curl -I https://bambi-ui.felekoglu.dev/registry.json
curl -I https://bambi-ui.felekoglu.dev/registry.schema.json
curl -I https://bambi-ui.felekoglu.dev/packages/tokens/src/tokens.css
```

## 3. Test Hosted Registry

```sh
tmpdir="$(mktemp -d)"
npx bambiui init --yes --framework react --cwd "$tmpdir"
npx bambiui add button --framework react --cwd "$tmpdir"
```

The generated component files should be self-contained and should not import `@bambiui/*`.

## 4. Publish CLI

Bump `packages/cli/package.json` version, then run:

```sh
pnpm --filter bambiui check
cd packages/cli
npm publish --dry-run
npm publish
```

After npm propagation:

```sh
npm view bambiui name version dist-tags.latest
npx bambiui --help
```

## 5. Finish The Release

Commit the release changes and create a matching git tag:

```sh
git add .
git commit -m "Release bambiui <version>"
git tag bambiui@<version>
```
