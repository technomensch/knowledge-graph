
# Run this after installing an upgraded plugin version to check what's new and apply changes

Checks this KG for what's new (new directories, templates, config fields,
backfix categories) and applies pending changes, without going through
the full `/kmgraph:kmg-init` wizard. Does not download or install a new
plugin version itself; run this after the plugin is already updated.

---

## Usage

```bash
/kmgraph:kmg-upgrade
/kmgraph:kmg-upgrade --named=<kg-name>
/kmgraph:kmg-upgrade --preview
```

**Parameters:**
- `--named=<kg-name>` (optional): target a specific KG by its exact name key in `kg-config.json`.
- `--preview` (optional): jump straight to the shared module's preview mode (Option 0) instead of showing the Apply/Choose/Skip menu first.
- (no flags): resolve the target graph from the current working directory via `kg_resolve`.

---

## Execution Steps

### Step 0: Resolve Target Graph

**If `--named=<kg-name>` is given:** read `${KG_CONFIG_PATH:-$HOME/.kmgraph/kg-config.json}`, look up `.graphs["<kg-name>"]`. If absent, tell the user no KG is registered under that name and stop. Do not fall through to cwd resolution.

**Else (no flags):** call `kg_resolve` (no params; defaults to `scope: "project"`, cwd-derived).

**If `kg_resolve` errors** (no graph registered for this directory): tell the user and offer `/kmgraph:kmg-init` to create one, or suggest `--named` to name a target explicitly. Do not proceed to Step 1.

Take the resolved entry's `path` as `{KG_PATH}`, its config key as `{kg_name}`, its `type` field as `{KG_TYPE}`, and its `categories` array as `{categories}`. These four are the exact parameters the shared module (Step 1 below) expects.

### Step 1: Enter the Shared Upgrade-Inspector Module

**→ Execute shared module:** Read `commands/kmg-init-shared/kmg-upgrade-inspector.md` and follow it exactly, starting from its "Step 0: Verify active graph, then call kg_upgrade inspect" section.

Parameters (from Step 0 above):
- `{KG_PATH}` = resolved KG path
- `{kg_name}` = resolved KG's config key
- `{KG_TYPE}` = resolved KG's `type` field
- `{categories}` = resolved KG's `categories` array

If `--preview` was passed on the command line, treat it exactly as the shared module's own `--preview` flag is documented to behave: run the inspection, show the preview, then show the Apply/Choose/Skip menu (without option 0, since preview already ran).

Do not perform the "Pre-Wizard: Existing KG Detection" menu from `commands/kmg-init.md` (the "see what's new / re-initialize / cancel" choice). That menu exists because `/kmgraph:kmg-init` also handles brand-new KG creation and needs to disambiguate intent. `/kmgraph:kmg-upgrade` has no new-KG-creation path, so there is nothing to disambiguate: go straight to the shared module.

---

## See Also

- `/kmgraph:kmg-init`: full initialization wizard; its "See what's new" path enters this same shared module
- `commands/kmg-init-shared/kmg-upgrade-inspector.md`: the shared module this command enters directly
- `knowledge/decisions/ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification.md`: design rationale (§ Amendment, Component A)

---

**Created:** 2026-09-07
**Related:** ADR-055 amendment, `v0.7.9-orchestration-plan.md`
