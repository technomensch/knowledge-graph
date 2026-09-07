import {
  compareSemver,
  resolveFreshestInstalledVersion,
  getRemediationText,
} from "./staleProcessCheck.js";

/**
 * Returns a human-addressed warning string if this process (running
 * `runningVersion`) is behind the freshest version actually installed
 * on disk, else null. No caching -- re-scans on every call, matching
 * issue-32's resolved design (cheap enough; caching would risk a stale
 * "not stale" answer surviving a second upgrade mid-session).
 */
export function checkStaleProcess(
  runningVersion: string,
  clientName: string | undefined
): string | null {
  const freshest = resolveFreshestInstalledVersion();
  if (!freshest) return null;

  const cmp = compareSemver(freshest, runningVersion);
  // Only warn when installed > running. installed < running (local dev
  // build, or a genuine downgrade) stays silent -- deliberate, matches
  // issue-32's explicitly-stated comparison semantics, not an oversight.
  if (cmp !== 1) return null;

  const remediation = getRemediationText(clientName);
  return `KMGraph process is running v${runningVersion}, but v${freshest} is now installed. ${remediation}`;
}
