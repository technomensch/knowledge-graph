---
title: "ADR-067 Implementation Spec: KG Resolution Model"
status: Ready for implementation
date: 2026-07-28
supersedes_draft: "docs/specs/2026-07-26-adr-067-kg-resolution-v0.7-spec.md"
source_adr: "knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md"
related_adrs: [1, 19, 55, 60, 63, 66]
related_enhs: [53, 54, 55]
related_issues: [10, 14, 15, 27]
---

# ADR-067 Implementation Spec: KG Resolution Model

Transcribed from the full ADR-067 brainstorm/review record (13 Fable-review items + 3 previously-undesigned mechanisms, all resolved 2026-07-28). This document is the implementation-ready reference; the source ADR remains the durable decision record and rationale trail — consult it for *why*, this document for *what to build*.

**Location note:** written to `knowledge/decisions/` alongside the source ADR, not `docs/superpowers/specs/` — per this project's current rules override (specs from `superpowers:brainstorming` stay in their ENH/ADR/issue folder, where `recall` searches for them). This supersedes the ADR's own earlier stated target path.

---

## 1. Problem

`kg-config.json` currently resolves "which knowledge graph" via a single mutable `.active` pointer, shared across all sessions on a machine. This produces cross-KG bleed via three structural failure modes: stale/divergent pointer (issue-14), concurrency (one session's switch silently retargets another), and context mismatch (active KG disagrees with cwd, only partially guarded by issue-10's `KG_MISMATCH` check). Two real bugs (issue-10's guard, issue-14's split-brain) and one live incident (caught mid-session during this ADR's own research) confirm this is not hypothetical.

## 2. Scope: two KG shapes

Global-topic KGs (ADR-066's third taxonomy shape) are **out of scope** — no real cross-project-topic use case observed; captured separately as **ENH-053**, revisit only if one appears.

- **Project-local** (many) — resolved from cwd/project-root, per call, no switch.
- **Personal** (exactly one) — lives outside all repos in `~/.kmgraph/`; resolved via explicit `scope` param, not a switch.

## 3. Resolution flow

1. **No name given** → resolve from cwd/project-root, without asking *which graph*. Default path, empirically dominant (all 18 historical `kmg-switch` invocations were project↔project). A one-line notice can still fire (never a disambiguation question): first-time-seeing-this-repo (§7), resolved-KG change across nesting levels (§5).
2. **Name given, exact registry match** → route directly.
3. **Name given, fuzzy match(es)** → always show candidates, ask which — no silent fan-out, for reads or writes (no read/write asymmetry).
4. **Name given, no match** → tell the user it isn't registered. No search of unregistered locations, ever — not all projects live under one folder, not all use git, naming is arbitrary. Correct answer: "go there, run `kmg-init`." **This is distinct from step 1's bounded upward walk from cwd** (checking which *already-registered* root the current directory falls under) — that's matching against known data, not a search; the "no search" rule here is specifically about never scanning for unregistered/unknown folders.

## 4. Registry lifecycle

`graphs` entries (keyed by **name**, confirmed via `utils.ts:29,88` — not a list) gain:

- **`status`**: `pending` | `active` | `archived` | `deleted` (4-value enum; `pending` added for §7). Archive, never hard-delete — flips status + timestamp only, content directory untouched (ADR-063 invariant).
- **`statusChangedAt`** timestamp.
- **`githubUser`** (optional) — attribution only, not access control; powers "who archived this" in the restore-offer flow.
- **`graphId`** — see §9.
- **No `lastUsed` field.** Confirmed only 3 writers today (`kg_config_switch`, init, `kmg-switch.md`), all retired with `kmg-switch` — removed entirely during migration rather than kept-but-ignored. If recency is needed later (§15), derive it the same way §10's compare-view does: **git-derived recency** (`git log -1 --format=%cI`) for git-tracked KGs as the primary signal, filesystem mtime only as a fallback for non-git KGs — never a registry field (preserves append-mostly invariant), and never filesystem mtime as the primary signal for a git-tracked KG (§10 established why: `git clone`/`checkout` resets mtime to checkout time, so a freshly re-cloned KG would misleadingly rank as "most recent" regardless of how stale its actual content is — this applies to any recency ranking, not only the compare-view's specific use case).
- **Never write to an archived/deleted entry silently** — surface "archived on `<date>`," offer to restore, before proceeding. Applies regardless of whether resolution was automatic (cwd) or explicit (name) — silence is never earned just because resolution was implicit. **Ask-frequency, not a fixed policy:** the surfacing prompt itself offers two distinctly-labeled options, not interchangeable — **"Skip"** (just this once, ask again next call) vs. **"Ignore"** (stop reminding for the rest of this session). "Always surface, never silent on first encounter" always holds; this only decides how long an acknowledgment lasts once given.
- Full history log (every transition) explicitly deferred — **ENH-054**, YAGNI'd; lightweight status+timestamp covers every discussed need.

**Path-missing handling** (registry entry exists, but the path it points at doesn't): check parent directory reachability first (unmounted drive ≠ deleted). If parent is reachable and target isn't: ask "deleted or moved?" — never default to `deleted`. If moved, update path, keep entry. Only mark `deleted` on explicit user confirmation.

**Distinct case: registered path exists, but the KG content folder inside it is missing.** Never silent, always ask — but investigate before asking: if it's a git repo, check other branches/git history first to see whether the content previously existed, was moved, or renamed within git, before presenting a bare "it's missing, want me to recreate it?" prompt.

**Personal KG doesn't exist yet (first-use case):** no auto-create. Tell the user it doesn't exist, ask if they want to create it, then trigger the personal-init flow — same create-vs-select gate philosophy used elsewhere in this design, applied to the personal KG's own first use.

**Filesystem normalization:** resolve symlinks and treat git worktrees as belonging to their main repo's registered entry before matching against the registry, so legitimate configs don't produce false "not registered."

## 5. Nested project-local KGs — allowed

Reversed from an earlier blanket ban. Deepest/most-specific registered path wins, boundary-safe segment matching (not naive `startsWith`), supports 3+ nesting levels.

- **Reads are deepest-only** — no union across nesting levels (a union read would be the exact bleed this design closes). Target a parent explicitly by name if wanted.
- **Archived/deleted deepest match** → surface and stop, never silently fall back a level.
- **True path ties** are §9's duplicate-registration case, not a separate tiebreak — `graphId` resolves it.
- **Notice on transition**: flag once when the *resolved KG* changes between nesting levels within a session (e.g. `cd packages/api` in an open monorepo) — not on every raw cwd move. Does not apply to "hop to a different top-level project mid-conversation" — that scenario doesn't occur for Claude Code/Gemini (MCP server cwd fixed at process spawn; a new top-level project means a new session, not a `cd`). Codex is a partial exception per its `sandbox-state-meta` mechanism (§13).

## 6. Registry concurrency (write safety)

Two problems, two mechanisms — do not conflate.

**Crash safety** — replace bare `fs.writeFileSync` with write-temp-file → `fsync` → atomic rename:
- Temp file **same directory** as target (rename fails cross-filesystem, `EXDEV`; `CONFIG_PATH` is env-overridable via `KG_CONFIG_PATH` so this isn't a fixed constant).
- Temp filename **unique per process** (pid + counter).
- **Windows**: bounded retry around the rename call itself (`MoveFileExW` transient `EPERM`/`EBUSY` from AV/Search Indexer/OneDrive).
- Preserve file mode/permissions explicitly (rename replaces the inode).
- Reference implementation: `write-file-atomic` (npm's own CLI dependency) — not necessarily taken as a dependency, but a correctness reference.

**Mutual exclusion** (risk-reduction, not true CAS — say so plainly, a microsecond window remains):
- Before final rename, compare raw bytes already held from the original read against a fresh read.
- **Retry is not implementable against the current 7-call-site API shape** (read → mutate in hand → write back — nothing to redo on conflict except rewrite the same stale object). Two ways out, prefer the second: (a) refactor every call site to an `updateConfig(mutatorFn)` shape that re-runs the mutation against a fresh read on conflict — correct, but a real cross-cutting refactor; (b) **merge only the specific registry keys that changed**, not whole-object write-back — realistic collisions are disjoint (session A registers graph X, session B archives graph Y), so this resolves the conflict by construction rather than detecting-and-retrying it. The one genuinely contested field is scalar `active` — last-writer-wins is acceptable there.
- **Sequencing dependency:** this mechanism is only coherent after the legacy `~/.claude/kg-config.json` read-fallback is fully retired (§14) — `readConfig()` falling back to a different file than `writeConfig()` targets makes any "did it change" comparison meaningless. Do not build in parallel with legacy retirement; build after.
- **Terminal behavior differs by write intent:** intentful writes (init, archive, add-category) get bounded retry (few attempts, small jitter, no backoff — window is microseconds) then a clear actionable error. Incidental bookkeeping writes (timestamp bumps, fts5 housekeeping) are best-effort, silently skip on conflict rather than failing the user's actual operation.
- **Rejected:** advisory byte-range locks (`flock` — inconsistent POSIX/Windows). Considered and passed over: git's own `O_CREAT|O_EXCL` lockfile pattern (portable, fail-immediately terminal behavior — legitimate alternative, not chosen); `proper-lockfile` (mkdir-based, needs stale-lock timeout heuristic). Explicit trap: `node-sqlite3-wasm` (already a dependency) has no POSIX advisory locking — does not provide a cross-process mutex, don't reach for it here.
- **Adjacent fix, same change:** `readConfig()` has 17 call sites across the codebase, each doing an unguarded `JSON.parse` with no try/catch. Add a guarded parse that names the file path in its error — protects against a file already truncated by the current unguarded-write code, which atomic writes alone won't repair or gracefully report.

**Cross-branch `ENH-NNN`/`issue-N` ID collision** — explicitly deferred, not designed now. Git's merge-conflict behavior catches this for free today (two branches both creating `ENH-56` collide visibly). Only becomes a real requirement if the storage backend ever leaves git-mediated files. If it ever needs a mechanism: a compare-and-swap-style atomic claim on the next number (check-then-write as one operation, fail/retry on conflict) is the candidate direction, generalizing across both this and the registry-locking case above — not designed further now, record as a future constraint.

## 7. Un-init'd repo, first-time-repo write

**Never fall back to personal** when capturing in an un-init'd project — tell the user it isn't set up, run `kmg-init`. Personal graph is for cross-cutting behavioral preferences, not project content; a fallback risks contractor cross-customer bleed. Hard-fail, no exceptions.

**First-time-seeing-this-repo confirmation** (security: closes prompt-injection-in-a-freshly-cloned-repo-gets-a-silent-write): required before the first write to any newly-registered entry. Persisted via registry `status: pending` (§4) → flips to `active` on first confirmed write, reusing archived-entry surfacing machinery, zero new schema. Under automated mode (§12): caller cannot silently flip `pending → active`; must pass `confirmFirstUse: true`, recorded `confirmedBy: "automated"` so an interactive session still surfaces it once later.

## 8. `$HOME`/`/` as cwd

Two-layer, and the layers behave differently by mode — this is deliberate, not a leftover ambiguity:

- **Interactive mode:** check first whether the session's actual OS user owns this home directory — a mismatch is a real signal (sudo'd session, a container mounting someone else's home, etc.) worth surfacing rather than silently proceeding. If ownership checks out (the ordinary case — a human sitting at their own machine), ask plainly: *"You're currently in your own home directory — is this for your personal graph, or one of your existing registered projects?"* Never silently default to personal just because home is a path-ancestor of the personal KG's storage location.
- **Automated mode:** the ownership check is skipped entirely, not attempted — on a shared/CI machine everything typically runs as one system user (`root`/`runner`/`ci`), where the check would trivially pass regardless of who's actually responsible, producing zero real signal. Governed by §12's interactivity discriminator: immediate structured error requiring an explicit `scope` param, no question asked.

The distinction: the ownership check itself still has real value for a human session (that's what interactive mode keeps it for); it was never a valid *substitute* for detecting interactive-vs-automated in the first place (that job belongs entirely to §12's discriminator), which is why it's dropped rather than repurposed in automated mode.

## 9. Duplicate/forked/worktree KG registration

**Base mechanism:** a `graphId` marker lives in the KG's own content directory (`knowledge/`), not the registry entry — travels automatically with clones/checkouts of that history when git-tracked. **Always written regardless of git status** — non-git KGs (personal, per ADR-066) still get one; git-tracking is what makes it *travel*, not what makes it *exist*. At `kmg-init`, check for a `graphId` already present elsewhere in the registry; surface rather than silently double-register.

**Verified empirically before finalizing this design** (this repo's own 690-file KG): forks are distinguishable from clones via `origin` remote URL from creation, not indistinguishable as first assumed. Filename-only comparison is a bad proxy here — 22 basenames recur across unrelated folders purely from this project's own template scaffolding (`specification.md`, `progress-log.md`, etc.) — comparisons must use relative path + content hash (§10 covers the compare-view built on this).

**Merge target resolution** (registry is name-keyed, not path-keyed — two separable questions):
- Ask only about **path** (never auto-pick which folder is canonical).
- **Name defaults to the pre-existing entry**, stated plainly — names are user-facing targeting elsewhere in this design; silently discarding one breaks references.
- **Gate on actual content divergence** — a fresh clone with nothing captured yet gets a silent re-point, no question asked.
- **Automated mode:** `{"error": "KMG_INPUT_REQUIRED", "reason": "duplicate_graph_id", "resolveWith": {"param": "canonicalPath"}}`.

**Scope boundary: per-machine only, and deliberately not a content-authority decision.** Registry entries are local to `~/.kmgraph/kg-config.json`, never committed — two clones on the *same* machine trigger this flow; two clones on *different* machines (e.g. a contractor's laptop plus a client's CI runner) never collide locally and don't need to, since neither machine's registry is aware of the other's. **This mechanism intentionally does not decide which clone is "authoritative."** Content authority stays exactly where git already puts it — whichever branch/commit reaches the shared remote. The fix only prevents local registry-bookkeeping confusion (two entries pointing at what's really one graph); actual file-tree reconciliation between diverged clones stays the manual, human-led git operation described above.

**Merge is scoped narrowly: registry pointer only, never KG content.** A full content-level merge of two independently-numbered KGs walks straight into the cross-branch ID-collision problem (§6) — two separate `issue-1`/`ENH-1`... sequences colliding on merge. Merging *only* the registry pointer (stop treating them as two separate registered paths, point at one going forward) avoids that; actual file-tree reconciliation stays a manual, human-led step, optionally assisted by §10's compare view.

**Dry-run required before any actual merge, with explicit approval.** Bypass is allowed, but split into two independent axes, not one: bypass may skip *friction* (the dry-run/review step) — it must never skip *safety* (a backup/undo point is written regardless of whether the user bypassed review). Matches this project's own established pattern elsewhere (PR admin-override, `--admin` merges) and the ADR-063 invariant (never destroy known-good state before a confirmed write) — overriding review is not the same request as overriding the safety net, and the two stay separate rather than letting one imply the other.

**Losing-folder fate: archive, never delete.** `mergedInto` pointer on the archived entry; its name stays resolvable as an alias to the survivor. A session landing in the archived folder gets "merged into X on `<date>`," not a bare "not initialized." Reversible, satisfying the bypass-safety rule above for free without a separate backup mechanism.

**Four-answer prompt** at `kmg-init`'s duplicate-`graphId` detection:
1. **Reattach** (genuine duplicate) → merge mechanism above.
2. **Worktree / deliberate linked copy** → records `duplicateOf`, suppresses the warning permanently for that pair, no merge, no re-mint. (This project's own tooling assumes worktrees exist — `superpowers:using-git-worktrees`, `Agent` tool `isolation: "worktree"` — so this is the single most likely false positive otherwise.)
3. **Intentionally separate project (fork)** → mints a fresh `graphId` immediately. This dirties the fork's working tree; say so, offer to commit. Marker file must carry a self-resolving conflict comment for non-technical readers (e.g. *"if this conflicts during merge/sync, keep your side — this file just identifies your copy."*). **Must be reachable as a standalone action later**, not only at `kmg-init` time — a fork's `knowledge/` typically already exists, so init may short-circuit as "already initialized" and never reach this prompt.
4. **Decline/not sure** → no forced choice, ask again next `kmg-init`.

**Ordering signal:** captured `origin` URL, once, at registration — for ordering only, never for reconciliation (state this explicitly so it isn't mistaken for an unfinished sync feature). Different origin → lead with option 3. Same origin + same path-lineage → lead with option 2. Same origin, different path, no worktree signature → lead with option 1.

**Three gaps folded into the base mechanism, not left as residual risk:**
- **Selective `.gitignore` can silently void the whole mechanism** — verify the marker path is actually tracked at write time (`git check-ignore`/`git ls-files`), warn if not. (This repo already gitignores parts of `knowledge/` — `plans/`, `sessions/*`, `me.md`, `chat-history/`, `tmp/`.)
- **Template/scaffold tooling (`core/templates/`, `kg_scaffold`) must strip-or-re-mint `graphId`** on copy — same rule as option 3, applied to scaffold code paths, not only `kmg-init`.
- Post-merge git divergence between already-merged folders stays explicitly out of scope (file-tree reconciliation is manual, per the registry-pointer-only boundary stated above).

**Marker write must be strictly idempotent** — re-running `kmg-init` on an already-marked graph is a guaranteed no-op on the marker; a re-init that re-mints creates a second identity for one graph, the exact failure this mechanism exists to prevent.

Detection wording: "already **registered** at X," never "already **exists** at X" — the check only sees registered graphs; a re-clone that's never `kmg-init`'d is invisible to it but already hard-fails safely under §7's un-init'd rule.

## 10. Moved-path compare-view (`kg_compare_graphs`)

Fires as part of §9's flow, **after** the content-divergence gate — not on every collision.

**Comparison basis: relative path + content hash**, not filename or mtime.
- Filename-only is misleading here (§9) — use relpath.
- Content hash cost reported at ~215ms for a 690-file/49MB KG (this figure itself wasn't independently re-measured — see §17 — but is small enough relative to a chat-response cycle that it doesn't change the design decision either way) — negligible, always compute.
- Four categories: same path + same hash → identical (zero-risk); same path + different hash → **diverged** (load-bearing signal, genuine-fork evidence); path unique to one side → unique content; different path + same hash → moved/renamed unchanged (own bucket — otherwise double-counts as "unique" on both sides).

**Recency: git-derived, never filesystem mtime.** `git clone`/`checkout` resets mtime to checkout time — inverted in exactly this mechanism's primary trigger scenarios (fresh clone/CI checkout/re-clone), making the freshest-looking folder reliably the one with the *least* real work. Use `git log -1 --format=%cI -- knowledge/` for git-tracked KGs (label as git-derived), filesystem mtime fallback only for non-git KGs (label that too). Prefer "N files touched in the last 30 days" over a single max-date (robust to one stray save).

**Split unique-to-one-side into recoverable vs. not** — highest-value addition. Gitignored paths (`sessions/`, `chat-history/`, `plans/`, `me.md`) can never be recovered from git if that entry is archived; one `git ls-files` per folder converts the view from informational to decision-bearing.

**Presentation: fixed-size summary, not exhaustive lists.** Full counts always shown; example filenames capped ~5 with "(N more)," sorted most-recently-changed first; lead with one plain-English verdict line (the part that actually survives being relayed through an AI chat client). Minimum viable version needs no filename lists at all — six numbers (file counts per side, git-derived last-activity per side, changed-in-both count, only-in-B split tracked/untracked) already unblock §9's four-way choice; filenames are a confidence layer on top.

**Worktree fingerprint reported as its own line:** 100% identical tracked content + differences confined to gitignored paths → strong positive signal for §9 option 2, independent of and complementary to that option's own detection.

**Standalone tool** (`kg_compare_graphs(a, b)`), invoked both inline during §9's flow and on demand later — a user who defers today needs to be able to re-run this tomorrow.

**Explicit handling for missing/invalid targets** — state plainly if a folder doesn't exist or isn't a valid KG; reporting zero files for a nonexistent path reads as "empty, safe to discard," a different and more dangerous claim.

## 11. `kmg-switch` and `KG_MISMATCH` — both retired

`kmg-switch` retired entirely as a config-mutating command, including any narrowly-scoped personal-graph variant — any disk-persisted "current target" reintroduces this ADR's own drift risk at a smaller blast radius. Personal-graph access becomes explicit `scope` param per call.

**Ephemeral personal-scope preference** — never written to disk, never shared across sessions:
- Asked explicitly on first invocation per session: one-shot, or stay until told otherwise ("if you don't say to leave, I'll stay").
- Applies to **both reads and writes** (no read/write asymmetry — a silent project-graph search on "what did I note about X" while "in personal" would be the same burden this design removes).
- Lives in **server-process memory** — confirmed safe: Claude Code, Gemini, and Codex (2 verified simultaneous sessions, distinct PIDs/cwds) each spawn their own dedicated process per top-level session; nothing shared across sessions at the process level. **Confirmed to propagate to Claude Code subagents** (direct live test: baseline 8 processes, spawned subagent, still exactly 8 processes/same PIDs after — subagent shares the parent's MCP connection). **Any orchestrator dispatching a subagent doing `kg_*` writes must restate `scope` explicitly** — do not rely on ambient inheritance, because inheritance is real, not absent. (Codex/Gemini subagent behavior unverified; the restate-explicitly mitigation is safe under either model.)
- **Explicit instruction beats ambient signal**: "stay in personal" persists across a nested-KG transition notice (§5) — the notice still fires as a heads-up, never as a silent override.
- **Session resume after a real process restart is a cold start** — no state reconstruction from transcript history (fragile, reintroduces exactly the state-reconstruction logic this design avoids). Re-ask the up-front question on first call. Does **not** apply to OS sleep with the window left open — sleep suspends the process, doesn't kill it, preference survives untouched; only applies to a genuinely new process (closed/reopened terminal, crash, reboot, "continue conversation" spinning up fresh).
- **Automated mode disables ephemeral scope entirely** — no standing conversation to persist within; `scope` is per-call only there.
- **Known residual risk:** mid-session compaction could silently drop this never-on-disk preference; echoing the resolved target on every write (already standard elsewhere in this design) makes it visible after the fact, doesn't prevent it.

**Marker syntax: `[personal]` / `[project]` bracket prefix**, one-shot shortcut without repeating the up-front question. Bare words rejected (ordinary prose containing "personal" would misfire, same failure class as ENH-055's trigger-vocabulary gap). Dash/CLI-flag style rejected (dashes appear constantly in prose). Slash-command style rejected outright (collides with real slash commands on these platforms). Symmetric `[project]` counterpart included — no reason only one direction gets a shortcut.

**Documentation impact:** `[personal]`/`[project]` is new user-facing syntax — `docs/` reference/guide pages must be updated when this ships.

`KG_MISMATCH` guard (issue-10) becomes dead code once this model is live — no separate "active" value left to disagree with cwd. Retire as part of migration, don't leave it stranded.

**Security, cwd-derived write targeting:** first-time-repo confirmation (§7) closes the injection risk. `scope: "user"` from a repo the assistant hasn't seen before needs its own explicit confirmation too, separate from the ordinary stay/one-shot flow (guards against an untrusted instruction faking genuine intent).

## 12. Automated-mode / interactivity discriminator

One resolved value per tool call, never cached (consistent with the existing no-caching invariant): `interaction: "interactive" | "automated"`.

**Precedence, first match wins:**
1. Explicit per-call param (`interaction`)
2. Explicit env override (`KMG_INTERACTION=interactive|automated`)
3. CI environment detected (`CI` + standard list: `GITHUB_ACTIONS`, `GITLAB_CI`, `CIRCLECI`, `JENKINS_URL`, `BUILDKITE`, `TF_BUILD`, `TEAMCITY_VERSION`, `BITBUCKET_BUILD_NUMBER`, `CODEBUILD_BUILD_ID`, `DRONE`, `APPVEYOR`, `HEROKU_TEST_RUN_ID`) → `automated`. Truthiness excludes `0`/`false`/`no`/`off` case-insensitive.
4. Client can accept an `InputRequiredResult` retry, no CI signal → `interactive`
5. Otherwise → `automated` (fail-closed default)

Never used as a signal: `clientInfo.name` (spoofable), container/Docker detection (devcontainers/Codespaces are humans).

**Explicit-beats-ambient, one exception:** a claimed `interactive` mode cannot be honored if the client genuinely can't accept the ask — downgrades to `automated` with a machine-readable reason (an override grants permission, not a channel). CI-detected + explicit `interactive` override both present → override wins, but the result includes a visible warning (guards a copy-pasted override left in a CI script).

**Mandatory bounded timeout on every question, regardless of detected mode** — expiry cancels, returns a structured error, no partial write. This is the actual safety property (not the discriminator's accuracy) — covers the one case no signal can catch: a human running a script from their own unattended terminal.

**Rejected: bare `confirm: true`/`--yes`** — can't answer a multiple-choice question with a boolean. Automated callers pass the actual answer as an explicit param (`scope`, `graph`, `confirmFirstUse`, `confirmMigration`); a missing one returns `{"error": "KMG_INPUT_REQUIRED", "reason": "...", "resolveWith": {"param": "...", "accepts": [...]}}`.

**Mechanism, not native blocking elicitation.** Verified 2026-07-28: Gemini CLI cannot use MCP elicitation at all (open bug, filed 2026-03-13, [gemini-cli#22249](https://github.com/google-gemini/gemini-cli/issues/22249)). The same-day MCP spec RC removes the old blocking-elicitation shape entirely in favor of a stateless `InputRequiredResult` (return "need more info," client retries with the answer). **Build only this one path — no native blocking elicitation for any client.** Forward-compatible with the protocol direction, works on Gemini today for free, one code path instead of client-capability branching.

**Every genuine question in this design routes through one gate function** with this mode check + timeout: fuzzy match, archived entry, first-time-repo confirmation, personal-KG-missing, moved-path/duplicate-`graphId` merge, `$HOME` ambiguity. No branch can hang, because none can ask outside this gate. (The nested-KG-transition signal, §5, is a one-line notice, not a question — it doesn't route through this gate at all, and never blocks on a response.)

**Four cross-item interactions this research surfaced, folded into their origin points (not separate items):**
- §7's `pending → active` flip: automated callers need `confirmFirstUse: true`, recorded `confirmedBy: "automated"`.
- §11's ephemeral "stay": disabled entirely in automated mode.
- Migration (`kg_upgrade`): refuses without `confirmMigration: true` in automated mode; backup still written regardless.
- Reads (`kg_search` etc.) hard-error on ambiguity in automated mode too — same read/write symmetry already established elsewhere.

## 13. Platform-specific cwd handling

- **Claude Code, Gemini:** trust `process.cwd()` directly — confirmed correct and already session-isolated (4 simultaneous Claude Code sessions, each process's cwd matched its actual project folder; Gemini's cwd verified correct including after a live session move).
- **Codex:** cannot trust `process.cwd()` the way Claude Code/Gemini can — confirmed live: the running Codex-spawned server process's working directory was the *plugin's own install location* (`~/.codex/plugins/cache/.../mcp-server`), not the actual project folder the Codex session was working in. `.codex-plugin/mcp.json` sets `"cwd": "."`, but that resolves relative to wherever Codex itself considers its own reference point at spawn — not the user's workspace. This is a known, open, upstream Codex limitation, not a KMGraph packaging mistake: [openai/codex#9989 "Pass workspace directory to MCP servers"](https://github.com/openai/codex/issues/9989), [openai/codex#22842 "Clarify/support plugin-root relative paths in plugin-provided .mcp.json"](https://github.com/openai/codex/issues/22842). Trusting `process.cwd()` on Codex would be silently, confidently wrong on every call, not just occasionally. Also does not implement the standard MCP `roots` capability. **Workaround: `codex/sandbox-state-meta`** — an experimental, capability-gated Codex extension confirmed via direct source inspection (`rmcp_client.rs`, `mcp_tool_call.rs`, `runtime.rs` at tag `rust-v0.145.0`): server advertises the capability, Codex injects the live turn's cwd into `_meta.sandboxCwd` (a `file://` URI, needs decoding) on every tool call, independent of model output. Fall back to an explicit `workspaceRoot` param for any client without this capability (including future platforms).

  **Forward-compatibility caveat, checked against the protocol's own docs, low near-term risk:** this relies on Codex's classic `initialize`-handshake capability advertisement. MCP's 2026-07-28 spec revision (SEP-2575) removes that handshake only for servers that *choose* to adopt the new "modern" per-request transport — it explicitly preserves the legacy handshake via fallback for servers that don't, and adoption is this server's own choice, not something forced by Codex or the spec. No evidence Codex itself has near-term plans to move (recent, active upstream investment is in the classic capability model, not a transport migration). **No action needed unless/until this server is deliberately migrated to `server/discover`-based capability advertisement — revisit this note at that time**, and note the new spec's SEP-2133 "Extensions" mechanism (reverse-DNS-identified, negotiated via an `extensions` map) is the likely eventual formal home for a capability like this, though its exact negotiation mechanics under the modern transport aren't yet documented.
- VS Code, Cursor, Windsurf, others: untested, deliberately out of scope — design should stay extensible without requiring pre-verification of every possible future client.

## 14. Migration path

- Rides the **existing `upgrade-inspector` mechanism** (already shipped for the v0.6.20 cowork/global-topic migration) — not a bespoke disconnected script.
- Explicit plain-English notice of the behavior change, explicit consent before cutover, originals backed up before any destructive step (ADR-063 pattern, matches the cowork-mode migration precedent).
- **Reconciles the two divergent config files as part of this same step** — `~/.kmgraph/kg-config.json` (current) vs. legacy `~/.claude/kg-config.json` (confirmed live and still actively written to, at least one real code path — `kg_search` — still preferring the stale legacy file at time of writing). Any implementation must retire the legacy path outright, not add new resolution logic alongside an unreconciled duplicate.
- `cli.ts` independently reads/writes `.active` as its own third surface (alongside `commands/*.md`/`agents/*.md` and `index.ts`'s resolution logic) — needs the same migration treatment.
- Standing approval already given to edit `commands/*.md` and `skills/*.md` for this migration specifically (PROTECTED-directory gate satisfied for this migration only, not a blanket waiver).
- Proceeds independently of ENH-034 (capture-pipeline command renaming) — accepted risk that 3 overlapping files may need a second edit pass if ENH-034 later lands.

## 15. Explicitly out of scope / deferred

- **ENH-053** — topic-KGs spanning multiple projects. No real use case observed.
- **ENH-054** — full audit-trail history log. YAGNI'd; lightweight status+timestamp covers every discussed need. **Revival trigger recorded**: shared-login/hot-desk accountability (e.g. a federal contractor sharing a desk/machine) — a genuine "who touched what, when" need, distinct from KG-resolution correctness (which is already fully handled by §§4-9 regardless of how many people's projects share one machine's registry). If revived: strictly read-only, sort by git-derived recency (not `lastUsed`, removed in §4; not raw filesystem mtime either, per §4/§10's re-clone caveat).
- **ENH-055** — `kmg-capture-router` trigger-vocabulary gap (misses "future enhancement"/"worth capturing" phrasing).
- Cross-branch `ENH-NNN`/`issue-N` ID collision — deferred, git catches it for free today (§6).
- Post-merge git divergence between already-merged clones — explicitly out of scope, manual human git operation (§9).
- Agent-behavior heuristics for defaulting search scope / cross-scope follow-up offers — deferred to a later planning pass, not architectural.

## 16. Documentation-impact checklist (required before/during implementation)

Per this project's CLAUDE.md rule ("update affected reference and guide pages when behavior changes"):

- `[personal]`/`[project]` marker syntax (§11) — confirmed user-facing, needs doc coverage.
- Four-answer `kmg-init` duplicate-`graphId` prompt (§9) — user-facing flow, needs doc coverage.
- New standalone `kg_compare_graphs` tool (§10) — needs its own reference entry.
- Resolution-flow behavior change (§3) — the switch from `.active` to cwd-derived resolution is a user-visible behavior change.
- Interactivity/automated-mode error shape (§12) — integrator-facing (anyone scripting against these tools needs to know the `KMG_INPUT_REQUIRED` contract).
- `kmg-switch` retirement (§11) — any existing docs referencing it need updating/removal.

## 17. Verification notes

Empirical claims in this spec were independently checked, not taken on trust, at multiple points during the source ADR's development: `getProjectRoot()`'s actual behavior (direct code read), Codex's `sandbox-state-meta` mechanism (re-verified against real `openai/codex` source at a pinned tag), the registry's name-keyed structure (`utils.ts:29,88`), absence of hashing/locking code (`grep` for `createHash`/`crypto`, confirmed zero matches), this repo's own file count and duplicate-basename count (690 files, 22 duplicate basenames — confirmed exact via independent recount), Gemini's elicitation gap (live GitHub issue, filed date confirmed), and the MCP 2026-07-28 spec change (confirmed via the protocol's own changelog). Where a claim could not be independently verified (e.g. the ~215ms hashing timing figure), that is noted rather than presented as confirmed.

## 18. Grouped release scope

Surveyed all open issues/ENHs for overlap with this work (2026-07-28). **None of the items below are closed by writing this spec — closure only happens after the corresponding implementation work is done, tested, and passing**, same bar as any other fix in this project. Listed here so release/branch planning groups the right work together rather than discovering overlap mid-implementation.

**Resolved *by* this design, not separate work — close once implemented and verified:**
- **ENH-049** (Concurrent Multi-Repo/Multi-Tool Work with Different Active KGs) — the real-world pain point that motivated this entire ADR; this spec *is* its design. Verify the resolved behavior actually eliminates the reported friction before closing, not just that the mechanism was built.
- **issue-10** (`KG_MISMATCH` guard / `getProjectRoot()`) — becomes dead code once this model ships (§11). Retire as part of the same change.
- **issue-14** (config split-brain, legacy `~/.claude/kg-config.json`) — directly addressed by the migration path (§14).
- **issue-23** (`kg_config_switch` false-success bug) — moot once `kmg-switch`/`kg_config_switch` is retired (§11); the buggy command disappears rather than being fixed.

**Efficient to fold in — same code being touched anyway, not required to ship this release:**
- **issue-15** (personal-KG writes misindexed under the project-local FTS5 bucket, still open) — already named in §11 as a constraint the new model must not reproduce; the write path this touches is the same one being rebuilt.
- **ENH-030** (KG remove/unregister command, proposed) — thin UI on top of the registry archive/delete lifecycle already being rebuilt (§4).
- **ENH-051** (duplicated KG path logic between `cli.ts` and `kmg-init.md`, deferred) — `cli.ts` is already called out in §14 as needing the same migration treatment as everything else; deduplicating its path logic in the same pass avoids a second edit later (same tradeoff already accepted for ENH-034 in §14).

**New item filed as a result of this session's research, tracked separately, grouping optional:**
- **issue-32** (already-running MCP server processes silently serve stale plugin code after an upgrade) — filed 2026-07-28 against ADR-055's Known Gap. Out of this ADR's own scope (a code-staleness problem, not a KG-resolution problem) but surfaced during this same research and worth considering for the same release window given the shared "upgrade/update handling" theme.

**Explicitly not grouped:** ENH-053 (deliberately descoped, revisit only if a real use case appears), ENH-055 (unrelated code path — capture-router trigger vocabulary, no shared code with this work).

**Acknowledged, not designed for — flagged by a concurrent session working issue-18 (2026-08-01):** `gov-capture-routing` (the mechanism `issue-18` documents as referenced-but-unreachable across 8+ commands) does a conceptually similar job to §11's `[personal]`/`[project]` marker syntax — detecting a level signal and resolving which KG a call targets. No code overlap exists today (`gov-capture-routing` has been silently non-functional for 3+ months, so it was invisible to this ADR's own design research), but `commands/kmg-sync-all.md`'s `gov-capture-routing` pass-down contract does call `kmg-switch` for its restore step — already covered by this spec's own §11 retirement sweep (`kmg-sync-all.md` is already in the Task 7.2 grep-sweep file list). No scope change to this ADR from this note; recorded so issue-18's "fix vs. retire" decision can be made in light of what this ADR ships, rather than independently. Full findings: `knowledge/handoffs/2026-08-01-issue-18-adr-067-overlap-findings.md`.

## Related

- Source ADR: `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`
- ADR-001 (original `.active`/switch model)
- ADR-055 (`knowledge/decisions/ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification.md`) — houses the related-but-distinct running-process-staleness gap surfaced during this ADR's research (§ Known Gap)
- ADR-063 (never destroy known-good state before a confirmed write — invariant reused throughout)
- ADR-066 (content-storage taxonomy — source of the project-local/personal/global-topic shapes)
- issue-10, issue-14, issue-15, issue-27
- ENH-053, ENH-054, ENH-055
