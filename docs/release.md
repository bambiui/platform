# Release Checklist

Use this checklist when publishing a new bambiui CLI or registry release.

## 1. Verify Locally

```sh
pnpm install
pnpm check-types
pnpm check-registry
pnpm --filter bambiui smoke
pnpm check
```

Run end-to-end template smoke if template dependencies are available:

```sh
pnpm smoke:templates -- --install
```

## 2. Test Local Registry Install

```sh
tmpdir="$(mktemp -d)"
node packages/cli/src/index.js init --yes --framework react --cwd "$tmpdir" --registry-url .
node packages/cli/src/index.js add tabs --framework react --cwd "$tmpdir" --registry-url .
grep -r "@bambiui/" "$tmpdir" || echo "OK — no @bambiui/ imports in generated output"
```

Expect no matches. Generated output must be self-contained.

## 3. Test Hosted Registry (after deploy)

> **Note**: no active static site deploy target exists as of the current architecture. Skip this section until deployment is re-established.

When a hosted registry is available:

```sh
tmpdir="$(mktemp -d)"
npx bambiui init --yes --framework react --cwd "$tmpdir"
npx bambiui add tabs --framework react --cwd "$tmpdir"
grep -r "@bambiui/" "$tmpdir" || echo "OK"
```

Verify registry files are reachable:

```sh
curl -I https://bambiui.com/registry.json
curl -I https://bambiui.com/registry.schema.json
curl -I https://bambiui.com/packages/registry/src/styles/bambi.css
```

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
git add packages/cli/package.json
git commit -m "Release bambiui <version>"
git tag bambiui@<version>
```
