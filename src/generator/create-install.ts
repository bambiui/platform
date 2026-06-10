import {
  generateInstallPlan,
  resolveInstallPlan,
  type GenerateInstallOptions,
  type InstallPlan,
  type ResolvedInstallFile,
  type SourceResolver,
} from "./generate-install";
import {
  validateInstallPlan,
  validateInstallRequest,
  type InstallPlanValidationIssue,
} from "./validate-install";

export interface InstallBundle {
  ok: boolean;
  plan?: InstallPlan;
  files: ResolvedInstallFile[];
  issues: InstallPlanValidationIssue[];
}

export function createInstallBundle(
  options: GenerateInstallOptions,
  resolveSource: SourceResolver,
): InstallBundle {
  const requestIssues = validateInstallRequest(options);

  if (requestIssues.length > 0) {
    return {
      ok: false,
      files: [],
      issues: requestIssues,
    };
  }

  const plan = generateInstallPlan(options);
  const planIssues = validateInstallPlan(plan);

  if (planIssues.length > 0) {
    return {
      ok: false,
      plan,
      files: [],
      issues: planIssues,
    };
  }

  return {
    ok: true,
    plan,
    files: resolveInstallPlan(plan, resolveSource),
    issues: [],
  };
}
