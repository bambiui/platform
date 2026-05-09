import path from "node:path";
import {
  createDefaultConfig,
  detectFramework,
  frameworkOptions,
} from "../utils/framework.js";
import { color, writeProjectFile } from "../utils/files.js";
import {
  copyRegistryFile,
  getRegistryUrl,
  getTokensPath,
  readRegistryManifest,
} from "../utils/registry.js";
import { normalizeRelativePath } from "../utils/files.js";

/**
 * @param {Record<string, string | boolean | undefined>} flags
 */
export async function initProject(flags) {
  const cwd = path.resolve(String(flags.cwd));
  const framework = String(flags.framework ?? (await detectFramework(cwd)));
  const defaults = createDefaultConfig(
    framework,
    /** @type {Record<string, string | undefined>} */ (flags),
  );
  const config = await promptForConfig(defaults, flags);
  const registryUrl = getRegistryUrl(
    /** @type {Record<string, string | undefined>} */ (flags),
  );
  const manifest = await readRegistryManifest(registryUrl);

  return [
    await writeProjectFile(
      path.join(cwd, "bambiui.config.json"),
      `${JSON.stringify(config, null, 2)}\n`,
      Boolean(flags.force),
    ),
    await copyRegistryFile(
      registryUrl,
      getTokensPath(manifest),
      path.join(cwd, config.tokensFile),
      Boolean(flags.force),
    ),
  ];
}

/**
 * @param {{ framework: string, componentDir: string, tokensFile: string }} defaults
 * @param {Record<string, string | boolean | undefined>} flags
 */
async function promptForConfig(defaults, flags) {
  if (flags.yes || !process.stdin.isTTY) {
    return defaults;
  }

  const { createInterface } = await import("node:readline/promises");

  process.stdout.write(
    `${color("Bambi UI", "bold")} ${color("setup", "cyan")}\n`,
  );
  process.stdout.write(`${color("Detected defaults", "green")}\n\n`);
  process.stdout.write(
    `  ${color("framework", "dim")}    ${color(defaults.framework, "yellow")}\n`,
  );
  process.stdout.write(
    `  ${color("componentDir", "dim")} ${color(defaults.componentDir, "yellow")}\n`,
  );
  process.stdout.write(
    `  ${color("tokensFile", "dim")}   ${color(defaults.tokensFile, "yellow")}\n\n`,
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const useDefaults = await rl.question(
    `Use these defaults? ${color("(Y/n)", "dim")} `,
  );
  rl.close();

  if (!useDefaults.trim() || useDefaults.trim().toLowerCase().startsWith("y")) {
    return defaults;
  }

  process.stdout.write(`\n${color("Customize config", "green")}\n`);
  process.stdout.write(
    `${color("Press enter to keep the shown value.", "dim")}\n\n`,
  );

  process.stdin.resume();
  const framework = await selectFramework(defaults.framework);

  process.stdin.resume();
  const customRl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const componentDir = await customRl.question(
      `Component directory (${defaults.componentDir}): `,
    );
    const tokensFile = await customRl.question(
      `Tokens file (${defaults.tokensFile}): `,
    );

    return {
      framework,
      componentDir: normalizeRelativePath(
        componentDir.trim() || defaults.componentDir,
      ),
      tokensFile: normalizeRelativePath(tokensFile.trim() || defaults.tokensFile),
    };
  } finally {
    customRl.close();
  }
}

/**
 * @param {string} defaultFramework
 */
async function selectFramework(defaultFramework) {
  const readline = await import("node:readline");
  const input = process.stdin;
  const output = process.stdout;
  const startIndex = Math.max(0, frameworkOptions.indexOf(defaultFramework));
  let selectedIndex = startIndex;

  readline.emitKeypressEvents(input);

  if (input.isTTY) {
    input.setRawMode(true);
  }

  function selectedIndexFramework() {
    return frameworkOptions[selectedIndex];
  }

  function render() {
    const choices = frameworkOptions
      .map((framework, index) => {
        const label =
          framework === selectedIndexFramework()
            ? color(framework, "yellow")
            : framework;
        return index === selectedIndex
          ? `${color("›", "cyan")} ${label}`
          : `  ${color(framework, "dim")}`;
      })
      .join("  ");

    output.write(
      `\rFramework ${color("(use ←/→, enter)", "dim")} ${choices}\x1b[K`,
    );
  }

  render();

  return new Promise((resolve) => {
    /**
     * @param {string | undefined} _
     * @param {{ name?: string, ctrl?: boolean } | undefined} key
     */
    function onKeypress(_, key) {
      if (key?.name === "return" || key?.name === "enter") {
        const framework = selectedIndexFramework();
        cleanup();
        resolve(framework);
        return;
      }

      if (key?.name === "left" || key?.name === "up") {
        selectedIndex =
          (selectedIndex - 1 + frameworkOptions.length) %
          frameworkOptions.length;
        render();
        return;
      }

      if (key?.name === "right" || key?.name === "down") {
        selectedIndex = (selectedIndex + 1) % frameworkOptions.length;
        render();
        return;
      }

      if (key?.ctrl && key.name === "c") {
        cleanup();
        process.exitCode = 130;
        resolve(selectedIndexFramework());
      }
    }

    function cleanup() {
      input.off("keypress", onKeypress);
      if (input.isTTY) {
        input.setRawMode(false);
      }
      output.write("\n");
    }

    input.on("keypress", onKeypress);
  });
}
