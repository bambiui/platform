import type { ResolvedInstallFile } from "./generate-install";

export interface InstallWriteOptions {
  rootDir?: string;
  overwrite?: boolean;
}

export interface InstallWriteOperation {
  target: string;
  path: string;
  content: string;
  action: "create" | "overwrite" | "skip";
}

export interface InstallWriterHost {
  exists(path: string): boolean | Promise<boolean>;
  writeFile(path: string, content: string): void | Promise<void>;
}

export interface InstallWriteResult {
  operations: InstallWriteOperation[];
  written: InstallWriteOperation[];
  skipped: InstallWriteOperation[];
}

function trimLeadingSlashes(value: string): string {
  return value.replace(/^\/+/, "");
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/g, "");
}

export function joinInstallPath(
  rootDir: string | undefined,
  target: string,
): string {
  const cleanTarget = trimLeadingSlashes(target);
  const cleanRoot = rootDir ? trimTrailingSlashes(rootDir) : "";
  return cleanRoot ? `${cleanRoot}/${cleanTarget}` : cleanTarget;
}

export async function createInstallWriteOperations(
  files: ResolvedInstallFile[],
  host: Pick<InstallWriterHost, "exists">,
  options: InstallWriteOptions = {},
): Promise<InstallWriteOperation[]> {
  const overwrite = options.overwrite ?? false;
  const operations: InstallWriteOperation[] = [];

  for (const file of files) {
    const path = joinInstallPath(options.rootDir, file.target);
    const exists = await host.exists(path);

    operations.push({
      target: file.target,
      path,
      content: file.content,
      action: exists ? (overwrite ? "overwrite" : "skip") : "create",
    });
  }

  return operations;
}

export async function writeInstallFiles(
  files: ResolvedInstallFile[],
  host: InstallWriterHost,
  options: InstallWriteOptions = {},
): Promise<InstallWriteResult> {
  const operations = await createInstallWriteOperations(files, host, options);
  const written: InstallWriteOperation[] = [];
  const skipped: InstallWriteOperation[] = [];

  for (const operation of operations) {
    if (operation.action === "skip") {
      skipped.push(operation);
      continue;
    }

    await host.writeFile(operation.path, operation.content);
    written.push(operation);
  }

  return { operations, written, skipped };
}
