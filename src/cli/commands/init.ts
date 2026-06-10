import path from "node:path";
import type { CliFlags } from "../utils/args";
import { color, writeProjectFile, type WriteResult } from "../utils/files";
import { createDefaultConfig, detectFramework } from "../utils/framework";

export async function initProject(flags: CliFlags): Promise<WriteResult[]> {
  const cwd = path.resolve(flags.cwd);
  const framework = flags.framework ?? (await detectFramework(cwd));
  const config = createDefaultConfig(framework, {
    outDir: flags.outDir,
    styleFile: flags.styleFile,
  });

  process.stdout.write(`${color("bambi", "bold")} ${color("setup", "cyan")}\n`);

  return [
    await writeProjectFile(
      path.join(cwd, "bambi.config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      flags.force,
    ),
  ];
}
