import React from 'react';
import styles from './Glossary.module.css';

const TERMS = {
  lesson: 'A structured record of a debugging breakthrough, fix, or insight — captured in docs/lessons-learned/ with git metadata.',
  ADR: 'Architecture Decision Record — a document capturing a technical choice with its context, rationale, and consequences.',
  KG: 'Knowledge Graph — the collection of structured markdown files (lessons, ADRs, patterns, sessions) managed by KMGraph.',
  skill: 'An auto-triggered context provider that detects natural-language signals and suggests relevant commands — fires without explicit invocation.',
  agent: 'A heavy-lift subprocess that handles resource-intensive work (large file parsing, git archaeology) in isolation from the main conversation.',
  command: 'A KMGraph slash command (e.g., /kmgraph:capture-lesson) available in Claude Code.',
  capture: 'The act of documenting a lesson, decision, or pattern into the knowledge graph.',
  recall: 'Full-text search across all captured knowledge — lessons, ADRs, patterns, and sessions.',
  session: 'A session summary — a snapshot of work done in one conversation, including lessons captured and plans in progress.',
  handoff: 'A structured document that transfers context from one developer or session to another.',
  hook: 'A shell script that runs at a Claude Code lifecycle event (SessionStart, PostToolUse, Stop, Notification).',
  pattern: 'A reusable, generalized insight extracted from one or more lessons — stored in docs/lessons-learned/patterns/.',
};

/**
 * Renders a term with a tooltip showing its KMGraph definition.
 * Usage: <Glossary term="ADR">ADR</Glossary>
 */
export default function Glossary({ term, children }) {
  const definition = TERMS[term] || TERMS[children];
  if (!definition) {
    return <span>{children || term}</span>;
  }
  return (
    <span className={styles.glossary} title={definition}>
      {children || term}
      <span className={styles.indicator}>†</span>
    </span>
  );
}
