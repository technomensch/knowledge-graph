---
title: Custom Rules
---

# Custom Rules

> "How do I make the AI follow my conventions without repeating them every session?"

A rule is a behavioral instruction for your AI assistant. A trigger is the situation where it fires. Together, they let you encode your working conventions so the AI follows them automatically — without you repeating them every session.

## What a rule looks like

Rules live in `rules.md` (personal) or `knowledge/rules.md` (project). Each rule is a plain-language instruction:

```markdown
### Always run tests before pushing
Run the full test suite before any `git push`. If tests fail, fix them first — do not push with failures.
```

## What a trigger looks like

Triggers live in `triggers.md`. Each trigger names the rule and declares when it applies:

```markdown
## Before pushing to origin
- Apply: `rules.md § Always run tests before pushing`
```

The trigger fires when the phase matches — before a push, at session start, before creating a PR, etc.

## Rules vs. identity

Your identity file (`me.md`) describes *who you are* — your expertise, preferences, and working style. Rules describe *how the AI should behave* in specific situations.

- Use `me.md` for: "I prefer explicit over clever" or "I've been using Go for ten years."
- Use `rules.md` for: "Always write a failing test before implementing" or "Never force-push to main."

## Writing a good rule

Good rules are:
- **Specific** — "run `npm test`" beats "run tests"
- **Actionable** — the AI can follow them without judgment calls
- **Bounded** — rules with triggers are more reliable than unconditional ones

## Capturing rules

Run `/kmgraph:kmg-rules-capture` to add a new rule. The skill prompts you for the rule text and whether it applies in specific situations — then routes it to the right file automatically.

## Related

- [Your AI Profile](../portability/your-ai-profile) — identity vs. behavior: what goes where
- [Customize Hooks](./customize-hooks.md) — automate rule enforcement at the shell level
