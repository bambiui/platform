import { registry, type ComponentName } from "../registry/registry";
import type { GenerateInstallOptions, InstallPlan } from "./generate-install";

export interface InstallPlanValidationIssue {
  code:
    | "duplicate-target"
    | "missing-component"
    | "unsafe-source"
    | "unsafe-target";
  message: string;
  target?: string;
  source?: string;
  component?: string;
}

const allowedSourcePrefixes = [
  "core/components/",
  "core/define-component.ts",
  "core/shared/",
  "styles/",
];

function isKnownComponent(value: string): value is ComponentName {
  return value in registry.components;
}

function isSafeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.startsWith("./") &&
    !path.startsWith("../") &&
    !path.includes("/../") &&
    !path.includes("//")
  );
}

function isAllowedSource(source: string): boolean {
  return allowedSourcePrefixes.some((prefix) => source.startsWith(prefix));
}

export function validateInstallRequest(
  options: GenerateInstallOptions,
): InstallPlanValidationIssue[] {
  const issues: InstallPlanValidationIssue[] = [];

  for (const component of options.components) {
    if (!isKnownComponent(component)) {
      issues.push({
        code: "missing-component",
        component,
        message: `Unknown component "${component}".`,
      });
      continue;
    }
  }

  return issues;
}

export function validateInstallPlan(
  plan: InstallPlan,
): InstallPlanValidationIssue[] {
  const issues: InstallPlanValidationIssue[] = [];
  const targets = new Set<string>();

  for (const file of plan.files) {
    if (!isSafeRelativePath(file.target)) {
      issues.push({
        code: "unsafe-target",
        target: file.target,
        message: `Unsafe target path "${file.target}".`,
      });
    }

    if (targets.has(file.target)) {
      issues.push({
        code: "duplicate-target",
        target: file.target,
        message: `Duplicate install target "${file.target}".`,
      });
    }

    targets.add(file.target);

    if (file.kind === "copy") {
      if (!isSafeRelativePath(file.source) || !isAllowedSource(file.source)) {
        issues.push({
          code: "unsafe-source",
          source: file.source,
          message: `Unsafe source path "${file.source}".`,
        });
      }
    }
  }

  return issues;
}
