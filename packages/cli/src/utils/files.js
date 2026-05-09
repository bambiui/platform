import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const colors = {
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
};

/**
 * @param {string} value
 * @param {keyof typeof colors} tone
 */
export function color(value, tone) {
  return `${colors[tone]}${value}${colors.reset}`;
}

/**
 * @param {string} filePath
 */
export async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * @param {string} filePath
 * @param {string} content
 * @param {boolean} force
 */
export async function writeProjectFile(filePath, content, force) {
  await mkdir(path.dirname(filePath), { recursive: true });

  if (existsSync(filePath) && !force) {
    return { skipped: true, path: filePath };
  }

  await writeFile(filePath, content);
  return { skipped: false, path: filePath };
}

/**
 * @param {Array<{ skipped: boolean, path: string }>} results
 */
export function printResults(results) {
  for (const result of results) {
    const label = result.skipped ? "skipped" : "created";
    process.stdout.write(
      `  ${label} ${path.relative(process.cwd(), result.path)}\n`,
    );
  }
}

/**
 * @param {string} fileName
 */
export function moduleSpecifier(fileName) {
  const parsed = path.parse(fileName);
  return `./${parsed.name}`;
}

/**
 * @param {string} content
 * @param {Record<string, string>} [replacements]
 */
export function transformComponentSource(content, replacements = {}) {
  let next = content;

  if (replacements.recipe) {
    next = next.replace(
      /from "\.\/recipe"/g,
      `from "${moduleSpecifier(replacements.recipe)}"`,
    );
  }

  if (replacements.types) {
    next = next.replace(
      /from "\.\/types"/g,
      `from "${moduleSpecifier(replacements.types)}"`,
    );
    next = next.replace(
      /from "@bambiui\/core\/button"/g,
      `from "${moduleSpecifier(replacements.types)}"`,
    );
  }

  if (replacements.style) {
    next = next.replace(
      /import "\.\/button\.css";/g,
      `import "./${replacements.style}";`,
    );
  }

  return next;
}

/**
 * @param {string} content
 */
export function transformButtonTypesSource(content) {
  if (
    !content.includes('from "./contracts"') &&
    !content.includes('from "@bambiui/core/button"')
  ) {
    return content;
  }

  return `export const buttonIntents = [
  "primary",
  "secondary",
  "danger",
  "success",
  "warning",
] as const;

export const buttonAppearances = ["solid", "outline", "ghost", "link"] as const;

export const buttonSizes = ["sm", "md", "lg", "icon"] as const;

export type ButtonIntent = (typeof buttonIntents)[number];

export type ButtonAppearance = (typeof buttonAppearances)[number];

export type ButtonSize = (typeof buttonSizes)[number];

export interface ButtonBaseProps {
  intent?: ButtonIntent;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  loading?: boolean;
}

export type ButtonDefaults = Required<
  Pick<ButtonBaseProps, "intent" | "appearance" | "size" | "loading">
>;
`;
}
