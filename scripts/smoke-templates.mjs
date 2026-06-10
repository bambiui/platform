import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const templatesRoot = path.join(root, "apps/templates");
const workRoot = path.join(root, ".tmp-template-smoke");
const cliPath = path.join(root, "dist-cli/index.js");
const tscPath = path.join(root, "node_modules/.bin/tsc");

const forbiddenStrings = [
  "@bambiui/core",
  "@bambiui/generator",
  "@bambiui/adapters",
  "../../core",
  "../../generator",
];

const templates = [
  {
    name: "bambi-react",
    framework: "react",
    expectedFiles: [
      "bambi.config.json",
      "src/styles/bambi.css",
      "src/components/ui/components/button.ts",
      "src/components/ui/components/tabs.ts",
      "src/components/ui/shared/define-component.ts",
      "src/components/ui/styles/button.css",
      "src/components/ui/styles/tabs.css",
      "src/components/ui/styles/index.css",
      "src/components/ui/auto-init.ts",
      "src/components/ui/react/button.tsx",
      "src/components/ui/react/tabs.tsx",
      "src/components/ui/react/attrs.ts",
      "src/components/ui/react/use-bambi.ts",
    ],
  },
  {
    name: "bambi-solid",
    framework: "solid",
    expectedFiles: [
      "bambi.config.json",
      "src/styles/bambi.css",
      "src/components/ui/components/button.ts",
      "src/components/ui/components/tabs.ts",
      "src/components/ui/shared/define-component.ts",
      "src/components/ui/styles/button.css",
      "src/components/ui/styles/tabs.css",
      "src/components/ui/styles/index.css",
      "src/components/ui/auto-init.ts",
      "src/components/ui/solid/button.tsx",
      "src/components/ui/solid/tabs.tsx",
    ],
  },
  {
    name: "bambi-svelte",
    framework: "svelte",
    expectedFiles: [
      "bambi.config.json",
      "src/styles/bambi.css",
      "src/components/ui/components/button.ts",
      "src/components/ui/components/tabs.ts",
      "src/components/ui/shared/define-component.ts",
      "src/components/ui/styles/button.css",
      "src/components/ui/styles/tabs.css",
      "src/components/ui/styles/index.css",
      "src/components/ui/auto-init.ts",
      "src/components/ui/svelte/Button.svelte",
      "src/components/ui/svelte/Tabs.svelte",
    ],
  },
  {
    name: "bambi-vue",
    framework: "vue",
    expectedFiles: [
      "bambi.config.json",
      "src/styles/bambi.css",
      "src/components/ui/components/button.ts",
      "src/components/ui/components/tabs.ts",
      "src/components/ui/shared/define-component.ts",
      "src/components/ui/styles/button.css",
      "src/components/ui/styles/tabs.css",
      "src/components/ui/styles/index.css",
      "src/components/ui/auto-init.ts",
      "src/components/ui/vue/Button.vue",
      "src/components/ui/vue/Tabs.vue",
    ],
  },
];

async function runCli(args, cwd = root) {
  const result = await execFileAsync(process.execPath, [cliPath, ...args], {
    cwd,
  });

  return `${result.stdout}${result.stderr}`;
}

async function runTsc(templateDir) {
  try {
    await execFileAsync(
      tscPath,
      ["--project", "tsconfig.template-smoke.json"],
      {
        cwd: templateDir,
      },
    );
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    throw new Error(
      `Template TypeScript compile failed in ${templateDir}.\n${output}`,
    );
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertFiles(templateDir, files) {
  for (const file of files) {
    const absolutePath = path.join(templateDir, file);
    assert(
      existsSync(absolutePath),
      `Expected generated file to exist: ${absolutePath}`,
    );
  }
}

async function writeTemplateTsconfig(templateDir) {
  await mkdir(path.join(templateDir, "stubs"), { recursive: true });
  await cp(
    path.join(templatesRoot, "shared/framework-stubs.d.ts"),
    path.join(templateDir, "stubs/framework-stubs.d.ts"),
  );
  await writeFile(
    path.join(templateDir, "tsconfig.template-smoke.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          module: "ESNext",
          lib: ["ES2023", "DOM"],
          jsx: "preserve",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["src/**/*.ts", "src/**/*.tsx", "stubs/**/*.d.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    )}\n`,
  );
}

async function walkFiles(dir) {
  const entries = await import("node:fs/promises").then((fs) =>
    fs.readdir(dir, { withFileTypes: true }),
  );
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }

  return files;
}

async function assertNoForbiddenOutput(dir) {
  for (const filePath of await walkFiles(dir)) {
    if (!/\.(ts|tsx|svelte|vue|css)$/.test(filePath)) continue;
    const content = await readFile(filePath, "utf8");

    for (const forbidden of forbiddenStrings) {
      if (content.includes(forbidden)) {
        throw new Error(
          `Generated output contains forbidden string "${forbidden}": ${filePath}`,
        );
      }
    }
  }
}

async function generatedTemplateFiles(templateDir) {
  const roots = ["bambi.config.json", "src/styles", "src/components/ui"];
  const files = [];

  for (const rootPath of roots) {
    const absolutePath = path.join(templateDir, rootPath);
    if (!existsSync(absolutePath)) continue;
    if (/\.[a-z]+$/i.test(rootPath)) {
      files.push(rootPath);
      continue;
    }

    for (const filePath of await walkFiles(absolutePath)) {
      files.push(
        path.relative(templateDir, filePath).replaceAll(path.sep, "/"),
      );
    }
  }

  return files.sort();
}

async function assertTemplateOutputIsCurrent(sourceDir, generatedDir) {
  const sourceFiles = await generatedTemplateFiles(sourceDir);
  const generatedFiles = await generatedTemplateFiles(generatedDir);

  if (sourceFiles.join("\n") !== generatedFiles.join("\n")) {
    throw new Error(
      `Committed template output file list is stale for ${path.basename(sourceDir)}. Run pnpm templates:update.`,
    );
  }

  for (const file of generatedFiles) {
    const sourceContent = await readFile(path.join(sourceDir, file), "utf8");
    const generatedContent = await readFile(
      path.join(generatedDir, file),
      "utf8",
    );

    if (sourceContent !== generatedContent) {
      throw new Error(
        `Committed template output is stale for ${path.basename(sourceDir)}:${file}. Run pnpm templates:update.`,
      );
    }
  }
}

async function smokeTemplate(template) {
  const sourceDir = path.join(templatesRoot, template.name);
  const templateDir = path.join(workRoot, template.name);

  process.stdout.write(`\nSmoke testing template ${template.name}...\n`);
  await cp(sourceDir, templateDir, { recursive: true });

  await runCli([
    "init",
    "--cwd",
    templateDir,
    "--framework",
    template.framework,
    "--out-dir",
    "src/components/ui",
    "--style-file",
    "src/styles/bambi.css",
    "--yes",
  ]);

  for (const component of ["button", "tabs"]) {
    await runCli([
      "add",
      component,
      "--cwd",
      templateDir,
      "--framework",
      template.framework,
      "--force",
    ]);
  }

  assertFiles(templateDir, template.expectedFiles);
  await assertNoForbiddenOutput(path.join(templateDir, "src/components/ui"));
  await assertTemplateOutputIsCurrent(sourceDir, templateDir);
  await writeTemplateTsconfig(templateDir);
  await runTsc(templateDir);
}

await rm(workRoot, { force: true, recursive: true });
await mkdir(workRoot, { recursive: true });

for (const template of templates) {
  await smokeTemplate(template);
}

await rm(workRoot, { force: true, recursive: true });
process.stdout.write("\nTemplate smoke tests passed.\n");
