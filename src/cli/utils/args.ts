export interface CliFlags {
  componentDir?: string;
  cwd: string;
  dryRun: boolean;
  force: boolean;
  framework?: string;
  json: boolean;
  outDir?: string;
  registryUrl?: string;
  plan: boolean;
  styleFile?: string;
  yes: boolean;
}

export interface ParsedArgs {
  command?: string;
  component?: string;
  flags: CliFlags;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, maybeComponent, ...tail] = argv;
  const hasComponent = Boolean(
    maybeComponent && !maybeComponent.startsWith("-"),
  );
  const component = hasComponent ? maybeComponent : undefined;
  const rest = hasComponent ? tail : argv.slice(1);
  const flags: CliFlags = {
    cwd: process.cwd(),
    dryRun: false,
    force: false,
    json: false,
    plan: false,
    yes: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === "--force") {
      flags.force = true;
      continue;
    }

    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      flags.yes = true;
      continue;
    }

    if (arg === "--json") {
      flags.json = true;
      continue;
    }

    if (arg === "--plan") {
      flags.plan = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg
        .slice(2)
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      const value = rest[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }

      (flags as unknown as Record<string, string | boolean | undefined>)[key] =
        value;
      index += 1;
    }
  }

  return { command, component, flags };
}
