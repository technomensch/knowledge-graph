---
active_platform: claude
platforms:
  - name: claude
    tier_map:
      fast-tier: Haiku
      standard-tier: Sonnet
      powerful-tier: Opus
    effort_levels: [low, medium, high, xhigh, max]
---

# Fixture: legacy bare-alias tier_map

Uses bare model-alias names (Haiku/Sonnet/Opus) as tier_map values instead of
full model IDs (e.g. claude-haiku-4-5-20251001). The resolver's validation
gate should flag these as suspicious — legacy alias usage that predates the
current full-model-ID convention — per its "Reject bare alias names" rule.
