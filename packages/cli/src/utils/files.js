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
 * @param {{ modules?: Record<string, string>, style?: string }} [replacements]
 */
export function transformComponentSource(content, replacements = {}) {
  let next = content;

  for (const [source, target] of Object.entries(replacements.modules ?? {})) {
    next = next.replaceAll(
      `from "${source}"`,
      `from "${moduleSpecifier(target)}"`,
    );
  }

  next = next.replace(
    /import "\.\/([^"]+\.css)";/g,
    `import "./${replacements.style ?? "$1"}";`,
  );

  return next;
}

/**
 * @param {{ consts?: Array<{ name: string, values: string[] }>, aliasesFromConsts?: Array<{ name: string, constName: string }>, interfaces?: Array<{ name: string, props: Array<{ name: string, type: string, optional?: boolean }> }>, requiredPicks?: Array<{ name: string, source: string, keys: string[] }> }} types
 */
export function generateTypesSource(types) {
  const chunks = [];

  for (const item of types.consts ?? []) {
    const values = item.values.map((value) => `  "${value}",`).join("\n");
    chunks.push(`export const ${item.name} = [\n${values}\n] as const;`);
  }

  for (const item of types.aliasesFromConsts ?? []) {
    chunks.push(
      `export type ${item.name} = (typeof ${item.constName})[number];`,
    );
  }

  for (const item of types.interfaces ?? []) {
    const props = item.props
      .map((prop) => `  ${prop.name}${prop.optional ? "?" : ""}: ${prop.type};`)
      .join("\n");
    chunks.push(`export interface ${item.name} {\n${props}\n}`);
  }

  for (const item of types.requiredPicks ?? []) {
    const keys = item.keys.map((key) => `"${key}"`).join(" | ");
    chunks.push(
      `export type ${item.name} = Required<\n  Pick<${item.source}, ${keys}>\n>;`,
    );
  }

  return `${chunks.join("\n\n")}\n`;
}
