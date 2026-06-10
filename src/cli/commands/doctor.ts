import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CliFlags } from "../utils/args";
import { color } from "../utils/files";
import { registry } from "../../registry/registry";
import { detectFramework, getConfig } from "../utils/framework";

export type DoctorStatus = "ok" | "warn" | "error";

export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  message: string;
}

export interface DoctorResult {
  ok: boolean;
  cwd: string;
  checks: DoctorCheck[];
}

function checkStatus(status: DoctorStatus): string {
  if (status === "ok") return color("ok", "green");
  if (status === "warn") return color("warn", "yellow");
  return color("error", "yellow");
}

function pushCheck(
  checks: DoctorCheck[],
  name: string,
  status: DoctorStatus,
  message: string,
): void {
  checks.push({ name, status, message });
}

async function canWriteToDirectory(dir: string): Promise<boolean> {
  const marker = path.join(dir, `.bambi-doctor-${Date.now()}.tmp`);

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(marker, "ok");
    await rm(marker, { force: true });
    return true;
  } catch {
    await rm(marker, { force: true }).catch(() => undefined);
    return false;
  }
}

export async function runDoctor(flags: CliFlags): Promise<DoctorResult> {
  const cwd = path.resolve(flags.cwd);
  const checks: DoctorCheck[] = [];

  pushCheck(
    checks,
    "cwd",
    existsSync(cwd) ? "ok" : "error",
    existsSync(cwd)
      ? `Target project exists: ${cwd}`
      : `Target project does not exist: ${cwd}`,
  );

  try {
    const detected = await detectFramework(cwd);
    pushCheck(
      checks,
      "framework-detection",
      "ok",
      `Detected framework: ${detected}`,
    );
  } catch (error) {
    pushCheck(
      checks,
      "framework-detection",
      "error",
      error instanceof Error ? error.message : String(error),
    );
  }

  try {
    const config = await getConfig(cwd, flags);
    const outDir = path.join(cwd, config.outDir);
    const styleDir = path.dirname(path.join(cwd, config.styleFile));

    pushCheck(
      checks,
      "config",
      "ok",
      `framework=${config.framework}, outDir=${config.outDir}, styleFile=${config.styleFile}`,
    );
    pushCheck(
      checks,
      "out-dir",
      "ok",
      `Generated files will be written under ${outDir}`,
    );
    pushCheck(
      checks,
      "style-file",
      "ok",
      `CSS entry will be written under ${path.join(cwd, config.styleFile)}`,
    );
    if (existsSync(cwd)) {
      const canWriteOutDir = await canWriteToDirectory(outDir);
      const canWriteStyleDir = await canWriteToDirectory(styleDir);
      pushCheck(
        checks,
        "writable-out-dir",
        canWriteOutDir ? "ok" : "error",
        canWriteOutDir
          ? "Generated output directory is writable."
          : "Generated output directory is not writable.",
      );
      pushCheck(
        checks,
        "writable-style-dir",
        canWriteStyleDir ? "ok" : "error",
        canWriteStyleDir
          ? "Style output directory is writable."
          : "Style output directory is not writable.",
      );
    } else {
      pushCheck(
        checks,
        "writable-output",
        "error",
        "Cannot check writability because target project directory does not exist.",
      );
    }
  } catch (error) {
    pushCheck(
      checks,
      "config",
      "error",
      error instanceof Error ? error.message : String(error),
    );
  }

  pushCheck(
    checks,
    "components",
    "ok",
    `Available components: ${Object.keys(registry.components).join(", ")}`,
  );

  if (!existsSync(path.join(cwd, "package.json"))) {
    pushCheck(
      checks,
      "package-json",
      "warn",
      "No package.json found in target project; framework detection may fall back to vanilla.",
    );
  } else {
    pushCheck(checks, "package-json", "ok", "package.json found.");
  }

  return {
    ok: checks.every((check) => check.status !== "error"),
    cwd,
    checks,
  };
}

export function formatDoctorResult(result: DoctorResult): string {
  const lines = [`${color("bambi", "bold")} ${color("doctor", "cyan")}`];

  for (const check of result.checks) {
    lines.push(
      `  ${checkStatus(check.status)} ${check.name}: ${check.message}`,
    );
  }

  lines.push(
    result.ok ? "\nAll required checks passed." : "\nDoctor found errors.",
  );
  return `${lines.join("\n")}\n`;
}
