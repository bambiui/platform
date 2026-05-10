import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tokenPath = path.join(repoRoot, "packages/tokens/src/tokens.css");
const requiredScaleSteps = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];
const requiredScales = ["neutral", "primary", "danger", "success", "warning"];
const forbiddenTokenPatterns = [
  /--_/,
  /--bambi-color-(blue|slate|red|green|amber)-/,
];
const cssPaths = [
  "packages/components/button/src/button.css",
  "apps/builder/src/styles/builder.css",
  "apps/docs/src/styles/global.css",
  "apps/docs/src/styles/preview.css",
].map((file) => path.join(repoRoot, file));

/**
 * @param {string} source
 */
function readDefinedTokens(source) {
  return new Set(
    [...source.matchAll(/(^|\s)(--bambi-[a-z0-9-]+)\s*:/g)].map(
      (match) => match[2],
    ),
  );
}

/**
 * @param {string} source
 */
function readTokenReferences(source) {
  return new Set(
    [...source.matchAll(/var\((--bambi-[a-z0-9-]+)/g)].map((match) => match[1]),
  );
}

/**
 * @param {string} source
 */
function readRootDefinedTokens(source) {
  const rootMatch = source.match(/:root\s*\{([\s\S]*?)\n\}/);

  if (!rootMatch) {
    throw new Error("packages/tokens/src/tokens.css is missing a :root block.");
  }

  return [...rootMatch[1].matchAll(/(^|\s)(--bambi-[a-z0-9-]+)\s*:/g)].map(
    (match) => match[2],
  );
}

/**
 * @param {string[]} tokens
 */
function findDuplicates(tokens) {
  const seen = new Set();
  const duplicates = new Set();

  for (const token of tokens) {
    if (seen.has(token)) {
      duplicates.add(token);
    }

    seen.add(token);
  }

  return duplicates;
}

/**
 * @param {string} source
 * @param {string} relativePath
 */
function assertForbiddenTokens(source, relativePath) {
  for (const pattern of forbiddenTokenPatterns) {
    const match = source.match(pattern);

    if (match) {
      throw new Error(
        `${relativePath} contains forbidden token pattern "${match[0]}".`,
      );
    }
  }
}

/**
 * @param {Set<string>} publicTokens
 */
function assertScaleTokens(publicTokens) {
  for (const scale of requiredScales) {
    for (const step of requiredScaleSteps) {
      const token = `--bambi-${scale}-${step}`;

      if (!publicTokens.has(token)) {
        throw new Error(`Missing required color scale token "${token}".`);
      }
    }
  }
}

/**
 * @param {string[]} rootTokens
 */
function assertRootTokensAreUnique(rootTokens) {
  const duplicates = findDuplicates(rootTokens);

  if (duplicates.size > 0) {
    throw new Error(
      `Duplicate :root token definitions: ${[...duplicates].sort().join(", ")}.`,
    );
  }
}

const tokenSource = await readFile(tokenPath, "utf8");
const publicTokens = readDefinedTokens(tokenSource);
const rootTokens = readRootDefinedTokens(tokenSource);

assertForbiddenTokens(tokenSource, "packages/tokens/src/tokens.css");
assertRootTokensAreUnique(rootTokens);
assertScaleTokens(publicTokens);

for (const token of readTokenReferences(tokenSource)) {
  if (!publicTokens.has(token)) {
    throw new Error(
      `packages/tokens/src/tokens.css references missing public token "${token}".`,
    );
  }
}

for (const cssPath of cssPaths) {
  const source = await readFile(cssPath, "utf8");
  const relativePath = path.relative(repoRoot, cssPath);
  const fileTokens = readDefinedTokens(source);

  assertForbiddenTokens(source, relativePath);

  for (const token of readTokenReferences(source)) {
    if (!publicTokens.has(token) && !fileTokens.has(token)) {
      throw new Error(
        `${relativePath} references missing token "${token}". It must be declared in packages/tokens/src/tokens.css or in the same CSS file.`,
      );
    }
  }
}

process.stdout.write("Token checks passed.\n");
