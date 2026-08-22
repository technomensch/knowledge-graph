---
active_platform: claude
platforms:
  - name: claude
    tier_map:
      fast-tier: fast-tier
      standard-tier: standard-tier
      powerful-tier: powerful-tier
    effort_levels: [low, medium, high, xhigh, max]
---

# Fixture: invalid bare tier-label tier_map

Uses bare tier labels (fast-tier/standard-tier/powerful-tier) as tier_map
*values* instead of resolving to an actual model ID or alias — a
misconfiguration where the tier maps to its own label. The resolver's
validation gate should flag these as suspicious per its "Reject bare tier
labels" rule.
