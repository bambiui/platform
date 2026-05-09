import { DEFAULT_COMPONENT_DIR, DEFAULT_TOKENS_FILE } from "./framework.js";

/**
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const [command, maybeComponent, ...tail] = argv;
  const hasComponent = maybeComponent && !maybeComponent.startsWith("-");
  const component = hasComponent ? maybeComponent : undefined;
  const rest = hasComponent ? tail : argv.slice(1);
  const flags = {
    componentDir: DEFAULT_COMPONENT_DIR,
    cwd: process.cwd(),
    force: false,
    framework: undefined,
    yes: false,
    registryUrl: process.env.BAMBIUI_REGISTRY_URL,
    styleFile: DEFAULT_TOKENS_FILE,
    tokensFile: undefined,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--force") {
      flags.force = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      flags.yes = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg
        .slice(2)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      flags[key] = value;
      index += 1;
    }
  }

  return { command, component, flags };
}
