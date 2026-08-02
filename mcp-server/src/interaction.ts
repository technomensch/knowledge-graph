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

export interface InputRequiredError {
  error: "KMG_INPUT_REQUIRED";
  reason: string;
  resolveWith: { param: string; accepts?: string[] };
}

export function requireInput(reason: string, param: string, accepts?: string[]): InputRequiredError {
  return { error: "KMG_INPUT_REQUIRED", reason, resolveWith: { param, accepts } };
}

export interface GateOptions {
  mode: InteractionMode;
  reason: string;
  param: string;
  accepts?: string[];
  timeoutMs?: number;
  ask: (signal: AbortSignal) => Promise<string>;
}

export async function gate(opts: GateOptions): Promise<{ answer: string } | InputRequiredError> {
  if (opts.mode === "automated") {
    return requireInput(opts.reason, opts.param, opts.accepts);
  }
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const controller = new AbortController();
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeout = new Promise<InputRequiredError>((resolve) => {
    timeoutHandle = setTimeout(() => {
      controller.abort(); // let an ask() implementation that respects AbortSignal actually stop waiting
      resolve(requireInput(`${opts.reason}_timeout`, opts.param, opts.accepts));
    }, timeoutMs);
  });
  // Normalize a synchronous throw from ask() into a rejected promise so it
  // still participates in the try/finally below instead of escaping gate()
  // before the timer can be cleared.
  const answered = Promise.resolve()
    .then(() => opts.ask(controller.signal))
    .then((answer) => ({ answer }));

  try {
    return await Promise.race([answered, timeout]);
  } finally {
    // Whichever side won, the timer must not be left pending — an
    // un-cleared setTimeout leaks a live handle for every answered
    // question, up to timeoutMs after the call already resolved
    // (findings doc #17).
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}
