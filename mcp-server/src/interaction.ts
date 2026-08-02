export type InteractionMode = "interactive" | "automated";

export interface InteractionContext {
  explicitParam?: InteractionMode;
  clientCanElicit?: boolean;
  env?: NodeJS.ProcessEnv;
}

const CI_SIGNAL_VARS = [
  "GITHUB_ACTIONS", "GITLAB_CI", "CIRCLECI", "JENKINS_URL", "BUILDKITE",
  "TF_BUILD", "TEAMCITY_VERSION", "BITBUCKET_BUILD_NUMBER", "CODEBUILD_BUILD_ID",
  "DRONE", "APPVEYOR", "HEROKU_TEST_RUN_ID",
];

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return !["0", "false", "no", "off", ""].includes(v);
}

// findings doc #16: OR, not AND. Either the generic CI var or any one named
// vendor variable is sufficient on its own -- under-detecting CI (hanging on
// a question nobody will answer) is worse than over-detecting it, so the
// looser check is the safer default. The original AND-based version failed
// open to "interactive" on CI systems (Jenkins, TeamCity are the two most
// commonly cited) that set only their own vendor variable and not a bare
// `CI=true`.
function isCiDetected(env: NodeJS.ProcessEnv): boolean {
  if (isTruthy(env.CI)) return true;
  return CI_SIGNAL_VARS.some((name) => isTruthy(env[name]));
}

export function resolveInteractionMode(
  ctx: InteractionContext
): { mode: InteractionMode; warning?: string; downgradedFrom?: InteractionMode } {
  const env = ctx.env ?? process.env;
  const ciDetected = isCiDetected(env);

  // Spec §12's one exception, checked ahead of all precedence: a claimed
  // `interactive` (whether from the explicit param or the env override)
  // cannot be honored if the client has explicitly signaled it genuinely
  // can't accept the ask. `clientCanElicit === false` is a definite signal;
  // `undefined` means "unknown" and does NOT trigger this (findings doc #15).
  const claimedInteractive =
    ctx.explicitParam === "interactive" ||
    (!ctx.explicitParam && (env.KMG_INTERACTION as InteractionMode | undefined) === "interactive");
  if (claimedInteractive && ctx.clientCanElicit === false) {
    return {
      mode: "automated",
      downgradedFrom: "interactive",
      warning: "interactive mode was requested but the client cannot accept an input-required retry; downgraded to automated.",
    };
  }

  if (ctx.explicitParam) {
    if (ctx.explicitParam === "interactive" && ciDetected) {
      return {
        mode: "interactive",
        warning: "CI environment detected but interaction=interactive was explicitly requested. Verify this override is intentional (e.g. not a leftover flag in a CI script).",
      };
    }
    return { mode: ctx.explicitParam };
  }

  const envOverride = env.KMG_INTERACTION as InteractionMode | undefined;
  if (envOverride === "interactive" || envOverride === "automated") {
    return { mode: envOverride };
  }

  if (ciDetected) return { mode: "automated" };

  if (ctx.clientCanElicit) return { mode: "interactive" };

  return { mode: "automated" };
}
