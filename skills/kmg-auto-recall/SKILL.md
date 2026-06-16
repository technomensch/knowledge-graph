
# Skill: kmg-auto-recall

**Purpose:** Auto-invoke knowledge graph search when user asks about project history, past decisions, or previously solved problems.

**Trigger Keywords:**
- "have we done this before"
- "what did we decide about"
- "did we figure out"
- "is there a lesson on"
- "what do we know about"
- "have I seen this before"

**Note on planning contexts:** In brainstorming and planning workflows, recall is
enforced via HARD BLOCK injection in `pre-skill-rules-inject.sh` — not via these
trigger keywords. This skill handles reactive ("have we?") recall only.

**Behavior:**
When triggered:
1. Extract the user's search query/keywords from their question
2. Invoke the `kmgraph:kmg-recall` command via the Skill tool with the extracted query
   - The command chains through `gov-capture-routing` (level/scope detection) → `recall-agent` (search)
   - This is NOT a direct recall-agent dispatch; level routing happens first
   - `gov-capture-routing` is Claude Code-only. On non-Claude platforms or if unavailable: dispatch directly to recall-agent with `--scope=active` as fallback (UQ-8)
3. Present results naturally — do not expose internal routing mechanics

**Priority enforcement:**
Recall results take priority — the model must reason about findings before recommending:
- If recall surfaces a rejected approach, examine WHY it was rejected and whether that reason is still applicable.
- If still applicable: do not propose the approach; if unavoidable, explain why no workaround exists.
- If no longer applicable: may propose it, but must document why the old rejection no longer holds AND lay out the full cascade impact.
- If it is the only viable option: propose it, but lay out complete ramifications and cascade effects across all affected systems.
- If nothing found: state "No prior art found for [topic]." and continue.

**Example Trigger:**
```
User: "Have we solved database migration issues before?
I'm seeing timeout errors on large tables."
```

**Assistant Response:**
"Let me check what we've documented about this before answering..."
→ [Invoke kmgraph:kmg-recall via Skill tool with query: "database migration timeout errors"]
→ [Command routes through gov-capture-routing → recall-agent]
→ [Surface relevant lessons/decisions, including related patterns]
