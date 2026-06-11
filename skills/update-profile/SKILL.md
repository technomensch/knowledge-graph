---
name: update-profile
description: Detect when the user asks to update their profile and route changes to all three profile files (me.md + rules.md + triggers.md) as a unit.
---

# Skill: update-profile

**Purpose:** Detect when the user asks to update their profile and route changes to all three profile files (me.md + rules.md + triggers.md) as a unit — not rules.md alone.

---

## What "User Profile" Means

A profile is a **three-file bundle**. A change to one file is often incomplete without reviewing the others:

| File | Contains |
|------|----------|
| `me.md` | Identity, working style, communication preferences, platform config |
| `rules.md` | Enforcement rules, always/never behaviors, project conventions |
| `triggers.md` | When each rule fires — workflow phase conditions, event gates |

**Rule without trigger = incomplete.** A rule in `rules.md` with no corresponding entry in `triggers.md` will not fire at the right moment.

---

## Trigger Patterns (match any)

- "update my profile" / "update the user profile" / "update the profile"
- "update my [user/project] profile"
- "add this to my profile" / "add this to the profile"
- "add to my [user/project] profile"
- "update the [user/personal/project] profile"
- "the profile needs [X]" / "my profile should say [X]"
- "add [X] to my profile"

## Do NOT trigger on

- Explicit file-level requests: "update rules.md", "add to me.md", "edit triggers.md" — these are direct edits, not profile-level operations; handle as file edits only
- "update my settings" — not a profile operation
- "update the docs" — handled by `doc-update-router`

---

## Execution Flow

### Step 1: Resolve level (user vs project)

Check for explicit signal in the user's message:

| Signal | Level |
|--------|-------|
| "user profile" / "personal profile" / "my profile" (no project qualifier) | User level: `~/.kmgraph/` |
| "project profile" / "for this project" / "in this project" | Project level: `knowledge/` |
| Ambiguous | Ask: "User-level (`~/.kmgraph/`) or project-level (`knowledge/`) profile?" |

### Step 2: Identify what changed

From context, determine which of the three files need updating:

- **me.md**: identity, style, communication preferences, platform changes, working habits
- **rules.md**: a new always/never rule, behavioral directive, or project convention
- **triggers.md**: when a rule should fire — new workflow gate, phase condition, or event entry

If a new rule is being added to `rules.md`, **always check whether a trigger entry is also needed** in `triggers.md`. Surface this check even if the user only mentioned rules.md.

### Step 3: Draft updates

For each file that needs updating, draft the proposed content inline for user review before writing.

### Step 4: Gate — all three files reviewed

Before marking the profile update complete:

- [ ] `me.md` — reviewed; updated if needed or confirmed no change needed
- [ ] `rules.md` — reviewed; updated if needed or confirmed no change needed
- [ ] `triggers.md` — reviewed; updated if needed or confirmed no change needed

Do not mark done until all three are explicitly checked.

### Step 5: Write

Write to the correct level (`~/.kmgraph/` or `knowledge/`) using the Write or Edit tool. Commit changes in the project KG (knowledge/) if applicable.

---

## Routing Table

| Level | File | Path |
|-------|------|------|
| User | me.md | `~/.kmgraph/me.md` |
| User | rules.md | `~/.kmgraph/rules.md` |
| User | triggers.md | `~/.kmgraph/triggers.md` |
| Project | me.md | `knowledge/me.md` |
| Project | rules.md | `knowledge/rules.md` |
| Project | triggers.md | `knowledge/triggers.md` |

---

## Conflict Avoidance

- **rules-capture** fires on implicit behavioral directives mid-session. update-profile fires on explicit profile update requests. If both could fire, update-profile takes priority — the user named the artifact explicitly.
- **lesson-capture** and **adr-guide** — do not conflict; different artifact types.
