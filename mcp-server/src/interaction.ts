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
  detail?: unknown;
}

export function requireInput(reason: string, param: string, accepts?: string[], detail?: unknown): InputRequiredError {
  const base: InputRequiredError = { error: "KMG_INPUT_REQUIRED", reason, resolveWith: { param, accepts } };
  return detail !== undefined ? { ...base, detail } : base;
}

export type AskResult =
  | { status: "answered"; answer: string }
  | { status: "declined" }
  | { status: "cancelled" };

export type GateResult =
  | { answer: string }
  | { declined: true }
  | { cancelled: true }
  | InputRequiredError;

export interface GateOptions {
  mode: InteractionMode;
  reason: string;
  param: string;
  accepts?: string[];
  timeoutMs?: number;
  /**
   * Optional structured payload describing what's being confirmed (e.g. a
   * merge preview, a candidate KG list). Automated-mode callers receive it
   * merged into the InputRequiredError response via requireInput()'s detail
   * param. Interactive callers' ask() implementations receive it as a
   * second argument so a real elicitation transport can render it before
   * prompting -- gate() itself never interprets this value, just carries it.
   */
  detail?: unknown;
  /**
   * Only invoked when mode === "interactive". Receives an AbortSignal that
   * aborts on timeout. A synchronous throw or a rejected promise from ask()
   * propagates out of gate() as a rejection -- gate() does not catch or map
   * transport/adapter failures into a structured result. Callers must be
   * prepared to catch (ADR-067 Phase 3 final review finding I-2).
   */
  ask: (signal: AbortSignal, detail?: unknown) => Promise<AskResult>;
}

/**
 * Deadline for gate() call sites whose ask() is the permanent no-transport
 * stub below (spec §12: "mechanism, not native blocking elicitation").
 *
 * Those sites can never be answered, so their only outcome is the timeout, and
 * gates run sequentially: at gate()'s own 30s default a three-gate kg_capture
 * chain took ~90s, past the point most MCP clients give up and well into
 * looking like a hang rather than a fast structured error. gate()'s default is
 * deliberately left at 30s for a future real transport, where a human actually
 * has to read and answer the question.
 */
export const STUB_ASK_TIMEOUT_MS = 5_000;

/**
 * The no-transport ask() stub. Never resolves, so gate()'s timeout produces
 * the same KMG_INPUT_REQUIRED shape the automated branch returns directly.
 * Always pair with `timeoutMs: STUB_ASK_TIMEOUT_MS`.
 */
export const stubAsk = (): Promise<never> => new Promise<never>(() => {});

export async function gate(opts: GateOptions): Promise<GateResult> {
  if (opts.mode === "automated") {
    return requireInput(opts.reason, opts.param, opts.accepts, opts.detail);
  }
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const controller = new AbortController();
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeout = new Promise<InputRequiredError>((resolve) => {
    timeoutHandle = setTimeout(() => {
      controller.abort(); // let an ask() implementation that respects AbortSignal actually stop waiting
      resolve(requireInput(`${opts.reason}_timeout`, opts.param, opts.accepts, opts.detail));
    }, timeoutMs);
  });

  // Wrapped so a synchronous throw inside ask() becomes a rejected promise
  // and still flows through the try/finally below (ADR-067 Phase 3 fix,
  // commit 1de44b6d) -- do not inline opts.ask(...) directly here.
  const asked = Promise.resolve().then(() => opts.ask(controller.signal, opts.detail));

  try {
    const result = await Promise.race([asked, timeout]);

    if ("error" in result) {
      return result; // timeout won
    }
    if (result.status === "declined") {
      return { declined: true };
    }
    if (result.status === "cancelled") {
      return { cancelled: true };
    }
    // result.status === "answered"
    if (opts.accepts && !opts.accepts.includes(result.answer)) {
      return requireInput(`${opts.reason}_invalid_answer`, opts.param, opts.accepts);
    }
    return { answer: result.answer };
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}
