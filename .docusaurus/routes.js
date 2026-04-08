import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/knowledge-graph/docs-updates/',
    component: ComponentCreator('/knowledge-graph/docs-updates/', '219'),
    exact: true
  },
  {
    path: '/knowledge-graph/docs-updates/archive/',
    component: ComponentCreator('/knowledge-graph/docs-updates/archive/', '283'),
    exact: true
  },
  {
    path: '/knowledge-graph/docs-updates/authors/',
    component: ComponentCreator('/knowledge-graph/docs-updates/authors/', 'f50'),
    exact: true
  },
  {
    path: '/knowledge-graph/docs-updates/github-docs-visuals/',
    component: ComponentCreator('/knowledge-graph/docs-updates/github-docs-visuals/', '8a2'),
    exact: true
  },
  {
    path: '/knowledge-graph/docs-updates/tags/',
    component: ComponentCreator('/knowledge-graph/docs-updates/tags/', '021'),
    exact: true
  },
  {
    path: '/knowledge-graph/docs-updates/tags/accessibility/',
    component: ComponentCreator('/knowledge-graph/docs-updates/tags/accessibility/', 'd4d'),
    exact: true
  },
  {
    path: '/knowledge-graph/docs-updates/tags/ux/',
    component: ComponentCreator('/knowledge-graph/docs-updates/tags/ux/', 'cbd'),
    exact: true
  },
  {
    path: '/knowledge-graph/docs-updates/tags/visuals/',
    component: ComponentCreator('/knowledge-graph/docs-updates/tags/visuals/', '8bb'),
    exact: true
  },
  {
    path: '/knowledge-graph/',
    component: ComponentCreator('/knowledge-graph/', '8fa'),
    routes: [
      {
        path: '/knowledge-graph/',
        component: ComponentCreator('/knowledge-graph/', '8b9'),
        routes: [
          {
            path: '/knowledge-graph/tags/',
            component: ComponentCreator('/knowledge-graph/tags/', '914'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/adr-guide/',
            component: ComponentCreator('/knowledge-graph/tags/adr-guide/', 'd1c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/agents-template/',
            component: ComponentCreator('/knowledge-graph/tags/agents-template/', 'd37'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/ai-drift/',
            component: ComponentCreator('/knowledge-graph/tags/ai-drift/', '761'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/antigravity/',
            component: ComponentCreator('/knowledge-graph/tags/antigravity/', '691'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/architecture/',
            component: ComponentCreator('/knowledge-graph/tags/architecture/', 'f70'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/audit-trail/',
            component: ComponentCreator('/knowledge-graph/tags/audit-trail/', '4b4'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/auto-detect/',
            component: ComponentCreator('/knowledge-graph/tags/auto-detect/', '651'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/auto-trigger/',
            component: ComponentCreator('/knowledge-graph/tags/auto-trigger/', 'e8c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/automation/',
            component: ComponentCreator('/knowledge-graph/tags/automation/', 'c89'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/best-practices/',
            component: ComponentCreator('/knowledge-graph/tags/best-practices/', '601'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/branch-management/',
            component: ComponentCreator('/knowledge-graph/tags/branch-management/', '399'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/branch-naming/',
            component: ComponentCreator('/knowledge-graph/tags/branch-naming/', 'de2'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/branches/',
            component: ComponentCreator('/knowledge-graph/tags/branches/', 'e6f'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/cache/',
            component: ComponentCreator('/knowledge-graph/tags/cache/', 'f06'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/capture-lesson/',
            component: ComponentCreator('/knowledge-graph/tags/capture-lesson/', '634'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/capture/',
            component: ComponentCreator('/knowledge-graph/tags/capture/', '081'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/changelog/',
            component: ComponentCreator('/knowledge-graph/tags/changelog/', 'a6b'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/chat-extraction/',
            component: ComponentCreator('/knowledge-graph/tags/chat-extraction/', 'd72'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/claude-code/',
            component: ComponentCreator('/knowledge-graph/tags/claude-code/', 'c4d'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/command-language/',
            component: ComponentCreator('/knowledge-graph/tags/command-language/', 'fe4'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/command-ux/',
            component: ComponentCreator('/knowledge-graph/tags/command-ux/', 'd14'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/commands/',
            component: ComponentCreator('/knowledge-graph/tags/commands/', '5c0'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/configuration/',
            component: ComponentCreator('/knowledge-graph/tags/configuration/', '64f'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/consistency/',
            component: ComponentCreator('/knowledge-graph/tags/consistency/', '307'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/constraints/',
            component: ComponentCreator('/knowledge-graph/tags/constraints/', '881'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/context-mode/',
            component: ComponentCreator('/knowledge-graph/tags/context-mode/', '286'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/cross-llm-compatibility/',
            component: ComponentCreator('/knowledge-graph/tags/cross-llm-compatibility/', 'e9f'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/debugging/',
            component: ComponentCreator('/knowledge-graph/tags/debugging/', '9f9'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/decoupling/',
            component: ComponentCreator('/knowledge-graph/tags/decoupling/', 'ef5'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/deprecation/',
            component: ComponentCreator('/knowledge-graph/tags/deprecation/', '759'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/diataxis/',
            component: ComponentCreator('/knowledge-graph/tags/diataxis/', 'a42'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/discovery/',
            component: ComponentCreator('/knowledge-graph/tags/discovery/', 'ef2'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/docs/',
            component: ComponentCreator('/knowledge-graph/tags/docs/', '0fd'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/documentation/',
            component: ComponentCreator('/knowledge-graph/tags/documentation/', '6fc'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/docusaurus/',
            component: ComponentCreator('/knowledge-graph/tags/docusaurus/', '5e9'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/drift/',
            component: ComponentCreator('/knowledge-graph/tags/drift/', '95a'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/dry/',
            component: ComponentCreator('/knowledge-graph/tags/dry/', '12c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/enforcement/',
            component: ComponentCreator('/knowledge-graph/tags/enforcement/', '8a0'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/examples/',
            component: ComponentCreator('/knowledge-graph/tags/examples/', 'ba0'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/friction/',
            component: ComponentCreator('/knowledge-graph/tags/friction/', '754'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/fts-5/',
            component: ComponentCreator('/knowledge-graph/tags/fts-5/', 'c19'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/gemini-cli/',
            component: ComponentCreator('/knowledge-graph/tags/gemini-cli/', '3f5'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/gemini/',
            component: ComponentCreator('/knowledge-graph/tags/gemini/', 'a66'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/git/',
            component: ComponentCreator('/knowledge-graph/tags/git/', '741'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/governance/',
            component: ComponentCreator('/knowledge-graph/tags/governance/', '31c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/graceful-degradation/',
            component: ComponentCreator('/knowledge-graph/tags/graceful-degradation/', '8df'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/graceful-fallback/',
            component: ComponentCreator('/knowledge-graph/tags/graceful-fallback/', 'b5c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/guardrails/',
            component: ComponentCreator('/knowledge-graph/tags/guardrails/', '214'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/hooks/',
            component: ComponentCreator('/knowledge-graph/tags/hooks/', '961'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/ide-integration/',
            component: ComponentCreator('/knowledge-graph/tags/ide-integration/', '733'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/identifiers/',
            component: ComponentCreator('/knowledge-graph/tags/identifiers/', 'f60'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/information-architecture/',
            component: ComponentCreator('/knowledge-graph/tags/information-architecture/', '962'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/install/',
            component: ComponentCreator('/knowledge-graph/tags/install/', '969'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/interactivity/',
            component: ComponentCreator('/knowledge-graph/tags/interactivity/', 'ab3'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/issue-tracking/',
            component: ComponentCreator('/knowledge-graph/tags/issue-tracking/', '437'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/kmgraph/',
            component: ComponentCreator('/knowledge-graph/tags/kmgraph/', 'b8b'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/knowledge-management/',
            component: ComponentCreator('/knowledge-graph/tags/knowledge-management/', 'b6b'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/landing-page/',
            component: ComponentCreator('/knowledge-graph/tags/landing-page/', '5e2'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/lesson-capture/',
            component: ComponentCreator('/knowledge-graph/tags/lesson-capture/', 'f28'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/lifecycle/',
            component: ComponentCreator('/knowledge-graph/tags/lifecycle/', '40e'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/llm-engineering/',
            component: ComponentCreator('/knowledge-graph/tags/llm-engineering/', 'e21'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/logic-redundancy/',
            component: ComponentCreator('/knowledge-graph/tags/logic-redundancy/', '936'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/marketplace/',
            component: ComponentCreator('/knowledge-graph/tags/marketplace/', 'd43'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/mcp-optional/',
            component: ComponentCreator('/knowledge-graph/tags/mcp-optional/', 'd20'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/mcp-server/',
            component: ComponentCreator('/knowledge-graph/tags/mcp-server/', '6fa'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/mcp/',
            component: ComponentCreator('/knowledge-graph/tags/mcp/', 'c98'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/measurement/',
            component: ComponentCreator('/knowledge-graph/tags/measurement/', 'bcd'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/memory-system/',
            component: ComponentCreator('/knowledge-graph/tags/memory-system/', '13c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/memory/',
            component: ComponentCreator('/knowledge-graph/tags/memory/', '3f7'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/metrics/',
            component: ComponentCreator('/knowledge-graph/tags/metrics/', '80f'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/modularity/',
            component: ComponentCreator('/knowledge-graph/tags/modularity/', '2ee'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/multi-branch-workflow/',
            component: ComponentCreator('/knowledge-graph/tags/multi-branch-workflow/', 'e4c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/namespace/',
            component: ComponentCreator('/knowledge-graph/tags/namespace/', '28e'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/paths/',
            component: ComponentCreator('/knowledge-graph/tags/paths/', 'd3a'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/plan-mode/',
            component: ComponentCreator('/knowledge-graph/tags/plan-mode/', 'c57'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/planning/',
            component: ComponentCreator('/knowledge-graph/tags/planning/', '5fe'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/platform-portability/',
            component: ComponentCreator('/knowledge-graph/tags/platform-portability/', 'e0c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/plugin-design/',
            component: ComponentCreator('/knowledge-graph/tags/plugin-design/', '19b'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/plugin-development/',
            component: ComponentCreator('/knowledge-graph/tags/plugin-development/', 'fc7'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/plugin-distribution/',
            component: ComponentCreator('/knowledge-graph/tags/plugin-distribution/', 'ced'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/plugin-hooks/',
            component: ComponentCreator('/knowledge-graph/tags/plugin-hooks/', '5f2'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/plugin-json/',
            component: ComponentCreator('/knowledge-graph/tags/plugin-json/', 'af9'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/plugin/',
            component: ComponentCreator('/knowledge-graph/tags/plugin/', 'a9d'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/portability/',
            component: ComponentCreator('/knowledge-graph/tags/portability/', '8ed'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/portfolio-quality/',
            component: ComponentCreator('/knowledge-graph/tags/portfolio-quality/', '851'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/process-vocabulary/',
            component: ComponentCreator('/knowledge-graph/tags/process-vocabulary/', '3df'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/process/',
            component: ComponentCreator('/knowledge-graph/tags/process/', 'f93'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/protocol/',
            component: ComponentCreator('/knowledge-graph/tags/protocol/', '222'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/read-only/',
            component: ComponentCreator('/knowledge-graph/tags/read-only/', '1aa'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/registration/',
            component: ComponentCreator('/knowledge-graph/tags/registration/', '0ea'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/release-management/',
            component: ComponentCreator('/knowledge-graph/tags/release-management/', '9bc'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/release/',
            component: ComponentCreator('/knowledge-graph/tags/release/', 'a20'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/routing/',
            component: ComponentCreator('/knowledge-graph/tags/routing/', 'b08'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/scope-consistency/',
            component: ComponentCreator('/knowledge-graph/tags/scope-consistency/', 'a2f'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/search/',
            component: ComponentCreator('/knowledge-graph/tags/search/', '546'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/security/',
            component: ComponentCreator('/knowledge-graph/tags/security/', 'f09'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/session-start/',
            component: ComponentCreator('/knowledge-graph/tags/session-start/', '9a0'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/session-summary/',
            component: ComponentCreator('/knowledge-graph/tags/session-summary/', '353'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/settings-management/',
            component: ComponentCreator('/knowledge-graph/tags/settings-management/', '04a'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/shell-scripts/',
            component: ComponentCreator('/knowledge-graph/tags/shell-scripts/', 'fd8'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/silent-failures/',
            component: ComponentCreator('/knowledge-graph/tags/silent-failures/', '860'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/single-source-of-truth/',
            component: ComponentCreator('/knowledge-graph/tags/single-source-of-truth/', 'c31'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/skill-triggers/',
            component: ComponentCreator('/knowledge-graph/tags/skill-triggers/', '6a5'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/skills/',
            component: ComponentCreator('/knowledge-graph/tags/skills/', '71c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/snapshot-gate/',
            component: ComponentCreator('/knowledge-graph/tags/snapshot-gate/', '8da'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/spec-drift/',
            component: ComponentCreator('/knowledge-graph/tags/spec-drift/', '2a9'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/sqlite/',
            component: ComponentCreator('/knowledge-graph/tags/sqlite/', '534'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/stdin/',
            component: ComponentCreator('/knowledge-graph/tags/stdin/', '1e3'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/subagents/',
            component: ComponentCreator('/knowledge-graph/tags/subagents/', '4fa'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/synchronization/',
            component: ComponentCreator('/knowledge-graph/tags/synchronization/', '106'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/testing/',
            component: ComponentCreator('/knowledge-graph/tags/testing/', '821'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/tier-2/',
            component: ComponentCreator('/knowledge-graph/tags/tier-2/', 'e20'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/tier-3/',
            component: ComponentCreator('/knowledge-graph/tags/tier-3/', '6ca'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/typescript/',
            component: ComponentCreator('/knowledge-graph/tags/typescript/', '1e2'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/update-notifications/',
            component: ComponentCreator('/knowledge-graph/tags/update-notifications/', '92b'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/update/',
            component: ComponentCreator('/knowledge-graph/tags/update/', 'f93'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/upgrade/',
            component: ComponentCreator('/knowledge-graph/tags/upgrade/', '9e7'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/user-facing/',
            component: ComponentCreator('/knowledge-graph/tags/user-facing/', 'eef'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/ux/',
            component: ComponentCreator('/knowledge-graph/tags/ux/', 'bad'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/validation/',
            component: ComponentCreator('/knowledge-graph/tags/validation/', 'b89'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/version/',
            component: ComponentCreator('/knowledge-graph/tags/version/', 'e64'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/versioning/',
            component: ComponentCreator('/knowledge-graph/tags/versioning/', 'd81'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/wasm/',
            component: ComponentCreator('/knowledge-graph/tags/wasm/', '518'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/workflow/',
            component: ComponentCreator('/knowledge-graph/tags/workflow/', '19c'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/write-tool/',
            component: ComponentCreator('/knowledge-graph/tags/write-tool/', '129'),
            exact: true
          },
          {
            path: '/knowledge-graph/tags/zero-config/',
            component: ComponentCreator('/knowledge-graph/tags/zero-config/', '42a'),
            exact: true
          },
          {
            path: '/knowledge-graph/',
            component: ComponentCreator('/knowledge-graph/', '289'),
            routes: [
              {
                path: '/knowledge-graph/CHANGELOG-DOCS-ONLY/',
                component: ComponentCreator('/knowledge-graph/CHANGELOG-DOCS-ONLY/', 'd2d'),
                exact: true
              },
              {
                path: '/knowledge-graph/CHEAT-SHEET/',
                component: ComponentCreator('/knowledge-graph/CHEAT-SHEET/', 'b0a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/COMMAND-GUIDE/',
                component: ComponentCreator('/knowledge-graph/COMMAND-GUIDE/', '43e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/CONCEPTS/',
                component: ComponentCreator('/knowledge-graph/CONCEPTS/', 'b4b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/CONFIGURATION/',
                component: ComponentCreator('/knowledge-graph/CONFIGURATION/', '396'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/contributing/docs-updates-workflow/',
                component: ComponentCreator('/knowledge-graph/contributing/docs-updates-workflow/', '2c5'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/',
                component: ComponentCreator('/knowledge-graph/decisions/', 'b99'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-001-centralized-multi-kg-configuration/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-001-centralized-multi-kg-configuration/', 'ae3'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-002-commands-vs-skills-architecture/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-002-commands-vs-skills-architecture/', '75e'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-003-abandon-shadow-commands-for-file-prefix/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-003-abandon-shadow-commands-for-file-prefix/', 'b38'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-004-token-based-memory-size-limits/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-004-token-based-memory-size-limits/', '98e'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-005-defer-memory-rules-engine/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-005-defer-memory-rules-engine/', '354'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-006-delegated-vs-inline-kg-updates/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-006-delegated-vs-inline-kg-updates/', 'cbe'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-006-document-cache-clear-upgrade-workaround/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-006-document-cache-clear-upgrade-workaround/', '1df'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-007-distribution-hygiene-files-allowlist/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-007-distribution-hygiene-files-allowlist/', '1d2'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-008-third-person-language-standard/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-008-third-person-language-standard/', 'bc5'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-009-three-tier-installation-architecture/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-009-three-tier-installation-architecture/', '8c5'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-010-namespace-rename-knowledge-to-kg-sis/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-010-namespace-rename-knowledge-to-kg-sis/', '859'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-011-defer-update-notifications/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-011-defer-update-notifications/', '18c'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-012-hook-security-model/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-012-hook-security-model/', '7f9'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-013-documentation-update-protocol/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-013-documentation-update-protocol/', 'ada'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-014-maintain-dual-plan-file-locations/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-014-maintain-dual-plan-file-locations/', '879'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-015-node-sqlite3-wasm-for-fts5-search/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-015-node-sqlite3-wasm-for-fts5-search/', '5bd'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-016-graceful-fallback-optional-mcp-dependencies/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-016-graceful-fallback-optional-mcp-dependencies/', '0ff'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-017-four-layer-architecture-thin-commands/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-017-four-layer-architecture-thin-commands/', '613'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-018-agents-template-platform-portability/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-018-agents-template-platform-portability/', '6c6'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-019-write-guard-agent-instructions-vs-data-layer/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-019-write-guard-agent-instructions-vs-data-layer/', '6ed'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-020-lifecycle-hooks-suite-automated-capture/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-020-lifecycle-hooks-suite-automated-capture/', 'a5d'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-021-single-source-of-truth-dry-documentation/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-021-single-source-of-truth-dry-documentation/', '8cf'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-022-branch-creation-commands-active-work-guard/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-022-branch-creation-commands-active-work-guard/', '9eb'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-023-single-source-of-truth-changelog/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-023-single-source-of-truth-changelog/', '28c'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-024-decouple-issue-tracking-decisions-sequential-prompts/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-024-decouple-issue-tracking-decisions-sequential-prompts/', '17b'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-025-do-not-commit-enabledplugins-blocks/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-025-do-not-commit-enabledplugins-blocks/', '8e3'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-026-snapshot-gate-uses-session-summary/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-026-snapshot-gate-uses-session-summary/', '0bd'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-027-docusaurus-restructure-diataxis-docs-feed/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-027-docusaurus-restructure-diataxis-docs-feed/', '4f5'),
                exact: true
              },
              {
                path: '/knowledge-graph/decisions/ADR-template/',
                component: ComponentCreator('/knowledge-graph/decisions/ADR-template/', '506'),
                exact: true
              },
              {
                path: '/knowledge-graph/DEPLOYMENT-SITEMAP/',
                component: ComponentCreator('/knowledge-graph/DEPLOYMENT-SITEMAP/', 'efa'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/closed/recall-context-mode-integration/',
                component: ComponentCreator('/knowledge-graph/enhancements/closed/recall-context-mode-integration/', '995'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-001/ENH-001-specification/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-001/ENH-001-specification/', '505'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-001/progress-log/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-001/progress-log/', '701'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-001/solution-approach/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-001/solution-approach/', '0f4'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-001/test-cases/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-001/test-cases/', '4de'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-002/ENH-002-specification/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-002/ENH-002-specification/', '659'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-002/progress-log/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-002/progress-log/', '2aa'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-002/solution-approach/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-002/solution-approach/', '6ff'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-002/test-cases/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-002/test-cases/', 'c40'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-003/ENH-003-specification/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-003/ENH-003-specification/', '422'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-003/progress-log/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-003/progress-log/', '4ee'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-003/solution-approach/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-003/solution-approach/', 'cea'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-003/test-cases/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-003/test-cases/', '3fd'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-004/ENH-004-specification/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-004/ENH-004-specification/', '8ee'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-004/progress-log/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-004/progress-log/', '2a0'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-004/solution-approach/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-004/solution-approach/', '87c'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-005/ENH-005-specification/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-005/ENH-005-specification/', 'bcf'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-005/progress-log/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-005/progress-log/', '82e'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-005/solution-approach/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-005/solution-approach/', '83b'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-005/test-cases/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-005/test-cases/', '181'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-006/ENH-006-specification/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-006/ENH-006-specification/', 'e47'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-006/progress-log/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-006/progress-log/', '89b'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-006/solution-approach/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-006/solution-approach/', '245'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-006/test-cases/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-006/test-cases/', '002'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-008/ENH-008-specification/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-008/ENH-008-specification/', '5cd'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-008/progress-log/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-008/progress-log/', '075'),
                exact: true
              },
              {
                path: '/knowledge-graph/enhancements/ENH-008/solution-approach/',
                component: ComponentCreator('/knowledge-graph/enhancements/ENH-008/solution-approach/', '063'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/decisions/ADR-001-example/',
                component: ComponentCreator('/knowledge-graph/examples/decisions/ADR-001-example/', '31d'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/decisions/ADR-002-example/',
                component: ComponentCreator('/knowledge-graph/examples/decisions/ADR-002-example/', '8d9'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/knowledge/sample-concepts/',
                component: ComponentCreator('/knowledge-graph/examples/knowledge/sample-concepts/', '45f'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/knowledge/sample-gotchas/',
                component: ComponentCreator('/knowledge-graph/examples/knowledge/sample-gotchas/', '1ea'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/knowledge/sample-patterns/',
                component: ComponentCreator('/knowledge-graph/examples/knowledge/sample-patterns/', 'a68'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/architecture/Example_Claude_Code_Skills_Arch/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/architecture/Example_Claude_Code_Skills_Arch/', '724'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/architecture/Example_Three_Tier_Sync/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/architecture/Example_Three_Tier_Sync/', '402'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/patterns/Example_Complete_Memory_System/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/patterns/Example_Complete_Memory_System/', '76f'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/process/Example_Agentic_Momentum/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/process/Example_Agentic_Momentum/', 'ec1'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/process/Example_Chat_History_Workflow/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/process/Example_Chat_History_Workflow/', '524'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/process/Example_Effective_LLM_Constraints/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/process/Example_Effective_LLM_Constraints/', 'eb9'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/process/Example_Git_Branch_Preservation/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/process/Example_Git_Branch_Preservation/', 'c0e'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/process/Example_Identifier_Decoupling/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/process/Example_Identifier_Decoupling/', '764'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/process/Example_Relative_File_Paths/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/process/Example_Relative_File_Paths/', 'ee9'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/lessons-learned/process/Example_SessionStart_Automation/',
                component: ComponentCreator('/knowledge-graph/examples/lessons-learned/process/Example_SessionStart_Automation/', '668'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/', 'ec4'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/baseline/attempt-results/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/baseline/attempt-results/', '5de'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/baseline/solution-approach/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/baseline/solution-approach/', 'f17'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/caching/attempt-results/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/caching/attempt-results/', 'a16'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/caching/solution-approach/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/attempts/caching/solution-approach/', 'e32'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/description/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/description/', '649'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/implementation-log/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/implementation-log/', '2e3'),
                exact: true
              },
              {
                path: '/knowledge-graph/examples/meta-issue/example-performance-saga/test-cases/',
                component: ComponentCreator('/knowledge-graph/examples/meta-issue/example-performance-saga/test-cases/', '060'),
                exact: true
              },
              {
                path: '/knowledge-graph/FAQ/',
                component: ComponentCreator('/knowledge-graph/FAQ/', '2b6'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/GETTING-STARTED/',
                component: ComponentCreator('/knowledge-graph/GETTING-STARTED/', '414'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/GLOSSARY/',
                component: ComponentCreator('/knowledge-graph/GLOSSARY/', 'c2d'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/INSTALL/',
                component: ComponentCreator('/knowledge-graph/INSTALL/', '7f5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/issues/issue-1/issue-1-description/',
                component: ComponentCreator('/knowledge-graph/issues/issue-1/issue-1-description/', '609'),
                exact: true
              },
              {
                path: '/knowledge-graph/knowledge/',
                component: ComponentCreator('/knowledge-graph/knowledge/', '866'),
                exact: true
              },
              {
                path: '/knowledge-graph/knowledge/architecture/',
                component: ComponentCreator('/knowledge-graph/knowledge/architecture/', '559'),
                exact: true
              },
              {
                path: '/knowledge-graph/knowledge/concepts/',
                component: ComponentCreator('/knowledge-graph/knowledge/concepts/', '858'),
                exact: true
              },
              {
                path: '/knowledge-graph/knowledge/entry-template/',
                component: ComponentCreator('/knowledge-graph/knowledge/entry-template/', '51b'),
                exact: true
              },
              {
                path: '/knowledge-graph/knowledge/gotchas/',
                component: ComponentCreator('/knowledge-graph/knowledge/gotchas/', '792'),
                exact: true
              },
              {
                path: '/knowledge-graph/knowledge/patterns/',
                component: ComponentCreator('/knowledge-graph/knowledge/patterns/', '415'),
                exact: true
              },
              {
                path: '/knowledge-graph/knowledge/workflows/',
                component: ComponentCreator('/knowledge-graph/knowledge/workflows/', '9a2'),
                exact: true
              },
              {
                path: '/knowledge-graph/layers-four/',
                component: ComponentCreator('/knowledge-graph/layers-four/', '555'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/lessons-learned/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/', '0e9'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/architecture/Lessons_Learned_Commands_vs_Skills_Architecture/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/architecture/Lessons_Learned_Commands_vs_Skills_Architecture/', '909'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2/', '98d'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/architecture/Lessons_Learned_Plugin_Example_File_Management/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/architecture/Lessons_Learned_Plugin_Example_File_Management/', '289'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users/', 'e45'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Duplicate_Hooks_Declaration/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Duplicate_Hooks_Declaration/', '8d8'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks/', 'dc9'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion/', 'a8f'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure/', '413'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Truncated_Marketplace_Slug/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/debugging/Lessons_Learned_Truncated_Marketplace_Slug/', '081'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/debugging/namespace-visibility-shadow-command-failure/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/debugging/namespace-visibility-shadow-command-failure/', '1f6'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/lesson-template/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/lesson-template/', '7da'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/patterns/2026-03-30-capture-router-auto-detect-type-and-location/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/patterns/2026-03-30-capture-router-auto-detect-type-and-location/', '84d'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/patterns/Lessons_Learned_AGENTS_Template_Platform_Portability/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/patterns/Lessons_Learned_AGENTS_Template_Platform_Portability/', 'c9e'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/patterns/Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/patterns/Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary/', 'c80'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/patterns/Lessons_Learned_Plugin_Settings_Scope_Consistency/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/patterns/Lessons_Learned_Plugin_Settings_Scope_Consistency/', 'c77'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation/', '97f'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/claude-code-plugin-cache-stale-after-update/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/claude-code-plugin-cache-stale-after-update/', '6f7'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/documentation-update-triggers-multibranchfeatures/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/documentation-update-triggers-multibranchfeatures/', 'afb'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_Documentation_Deprecation_Lifecycle/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_Documentation_Deprecation_Lifecycle/', 'bcc'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated/', '051'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard/', 'bee'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_MCP_Server_Binary_Exists_But_Each_IDE_Needs_Explicit_Registration/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_MCP_Server_Binary_Exists_But_Each_IDE_Needs_Explicit_Registration/', '0f8'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_Plan_File_Dual_Location_Protocol/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_Plan_File_Dual_Location_Protocol/', 'e30'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_Plan_Files_Gitignored_Local_Only/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_Plan_Files_Gitignored_Local_Only/', '254'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_Plan_Subagent_Is_Read_Only/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_Plan_Subagent_Is_Read_Only/', '255'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/Lessons_Learned_Process_Spec_Drift_In_Command_Language/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/Lessons_Learned_Process_Spec_Drift_In_Command_Language/', 'cec'),
                exact: true
              },
              {
                path: '/knowledge-graph/lessons-learned/process/local-marketplace-testing-workflow/',
                component: ComponentCreator('/knowledge-graph/lessons-learned/process/local-marketplace-testing-workflow/', '634'),
                exact: true
              },
              {
                path: '/knowledge-graph/NAVIGATION-INDEX/',
                component: ComponentCreator('/knowledge-graph/NAVIGATION-INDEX/', 'ec4'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/PERSONAL-V-PROJECT/',
                component: ComponentCreator('/knowledge-graph/PERSONAL-V-PROJECT/', '0f9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/pillars-four/',
                component: ComponentCreator('/knowledge-graph/pillars-four/', '850'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/reference/ARCHITECTURE/',
                component: ComponentCreator('/knowledge-graph/reference/ARCHITECTURE/', '404'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/reference/META-ISSUE-GUIDE/',
                component: ComponentCreator('/knowledge-graph/reference/META-ISSUE-GUIDE/', '577'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/reference/PATTERNS-GUIDE/',
                component: ComponentCreator('/knowledge-graph/reference/PATTERNS-GUIDE/', 'e33'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/reference/PLATFORM-ADAPTATION/',
                component: ComponentCreator('/knowledge-graph/reference/PLATFORM-ADAPTATION/', '0df'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/reference/SANITIZATION-CHECKLIST/',
                component: ComponentCreator('/knowledge-graph/reference/SANITIZATION-CHECKLIST/', '2bd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/reference/WORKFLOWS/',
                component: ComponentCreator('/knowledge-graph/reference/WORKFLOWS/', '0db'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/SEARCH/',
                component: ComponentCreator('/knowledge-graph/SEARCH/', '2f1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/STYLE-GUIDE/',
                component: ComponentCreator('/knowledge-graph/STYLE-GUIDE/', '8e5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/templates/',
                component: ComponentCreator('/knowledge-graph/templates/', 'f76'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/AGENTS-template/',
                component: ComponentCreator('/knowledge-graph/templates/AGENTS-template/', '343'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/decisions/',
                component: ComponentCreator('/knowledge-graph/templates/decisions/', 'b67'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/decisions/ADR-template/',
                component: ComponentCreator('/knowledge-graph/templates/decisions/ADR-template/', 'b2f'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/documentation/doc-template/',
                component: ComponentCreator('/knowledge-graph/templates/documentation/doc-template/', '093'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/knowledge/',
                component: ComponentCreator('/knowledge-graph/templates/knowledge/', '922'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/knowledge/architecture/',
                component: ComponentCreator('/knowledge-graph/templates/knowledge/architecture/', '6dd'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/knowledge/concepts/',
                component: ComponentCreator('/knowledge-graph/templates/knowledge/concepts/', 'f1a'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/knowledge/entry-template/',
                component: ComponentCreator('/knowledge-graph/templates/knowledge/entry-template/', '1e3'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/knowledge/gotchas/',
                component: ComponentCreator('/knowledge-graph/templates/knowledge/gotchas/', '93a'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/knowledge/patterns/',
                component: ComponentCreator('/knowledge-graph/templates/knowledge/patterns/', 'b5a'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/knowledge/workflows/',
                component: ComponentCreator('/knowledge-graph/templates/knowledge/workflows/', '3b4'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/lessons-learned/',
                component: ComponentCreator('/knowledge-graph/templates/lessons-learned/', '3a6'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/lessons-learned/lesson-template/',
                component: ComponentCreator('/knowledge-graph/templates/lessons-learned/lesson-template/', 'c36'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/MEMORY-template/',
                component: ComponentCreator('/knowledge-graph/templates/MEMORY-template/', '9a9'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/', '15c'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/analysis/lessons-learned/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/analysis/lessons-learned/', 'd0f'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/analysis/root-cause-evolution/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/analysis/root-cause-evolution/', 'da0'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/analysis/timeline/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/analysis/timeline/', 'ad4'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/attempt-template/attempt-results/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/attempt-template/attempt-results/', 'cb2'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/attempt-template/plan-reference/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/attempt-template/plan-reference/', 'ed9'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/attempt-template/solution-approach/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/attempt-template/solution-approach/', 'b9d'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/description/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/description/', 'bb0'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/implementation-log/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/implementation-log/', '448'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/related-issues/github-links/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/related-issues/github-links/', 'ec3'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/meta-issue/test-cases/',
                component: ComponentCreator('/knowledge-graph/templates/meta-issue/test-cases/', 'a1c'),
                exact: true
              },
              {
                path: '/knowledge-graph/templates/sessions/session-template/',
                component: ComponentCreator('/knowledge-graph/templates/sessions/session-template/', '628'),
                exact: true
              },
              {
                path: '/knowledge-graph/TRACK-ISSUES/',
                component: ComponentCreator('/knowledge-graph/TRACK-ISSUES/', '453'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/knowledge-graph/',
                component: ComponentCreator('/knowledge-graph/', '757'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
