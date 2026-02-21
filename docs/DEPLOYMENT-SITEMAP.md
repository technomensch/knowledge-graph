# Deployment Sitemap

## 1. Inventory of User-Facing Files
- `docs/GETTING-STARTED.md`
- `docs/COMMAND-GUIDE.md`
- `docs/CONCEPTS.md`
- `docs/CONFIGURATION.md`
- `docs/STYLE-GUIDE.md`
- `docs/CHEAT-SHEET.md`
- `docs/NAVIGATION-INDEX.md`
- `docs/FAQ.md`
- `core/docs/ARCHITECTURE.md`
- `core/docs/PATTERNS-GUIDE.md`
- `core/docs/WORKFLOWS.md`
- `core/docs/META-ISSUE-GUIDE.md`
- `core/docs/PLATFORM-ADAPTATION.md`
- `core/docs/SANITIZATION-CHECKLIST.md`

## 2. Proposed Sidebar/Navigation Structure
- **Introduction**
  - Getting Started
  - FAQ
  - Concepts
- **Guides**
  - Command Guide
  - Configuration
  - Platform Adaptation
  - Cheat Sheet
- **Architecture & Ecosystem**
  - Architecture overview
  - Patterns Guide
  - Workflows
  - Meta-Issue Guide
- **Contributing**
  - Style Guide
  - Sanitization Checklist

## 3. Exclusion List (Files Not Hosted)
- `docs/plans/*`
- `docs/decisions/*`
- `docs/knowledge/*`
- `docs/lessons-learned/*`
- `docs/chat-history/*`
- `core/templates/*`
- `core/examples/*`

## 4. Configuration Skeleton
Example `mkdocs.yml`:
```yaml
site_name: Knowledge Graph Documentation
nav:
  - Introduction:
    - Getting Started: GETTING-STARTED.md
    - FAQ: FAQ.md
    - Concepts: CONCEPTS.md
  - Guides:
    - Command Guide: COMMAND-GUIDE.md
    - Configuration: CONFIGURATION.md
    - Platform Adaptation: ../core/docs/PLATFORM-ADAPTATION.md
    - Cheat Sheet: CHEAT-SHEET.md
  - Architecture & Ecosystem:
    - Architecture: ../core/docs/ARCHITECTURE.md
    - Patterns Guide: ../core/docs/PATTERNS-GUIDE.md
    - Workflows: ../core/docs/WORKFLOWS.md
    - Meta-Issue Guide: ../core/docs/META-ISSUE-GUIDE.md
  - Contributing:
    - Style Guide: STYLE-GUIDE.md
    - Sanitization Checklist: ../core/docs/SANITIZATION-CHECKLIST.md
```
