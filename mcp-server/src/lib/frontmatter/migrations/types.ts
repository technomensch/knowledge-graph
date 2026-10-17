import type { NoteIndex } from "../links.js";

export interface MigrationContext { index: NoteIndex }
export interface StepResult { text: string; notes: string[]; skip?: string }

export interface Migration {
  step: number;
  id: string;
  title: string;
  introducedIn: string;
  /** Steps that must be fully applied before this one may be applied. */
  requires: number[];
  /** Every frontmatter key this step may add, remove or change (old and new spellings). */
  touchedKeys: string[];
  /** relPath is graph-relative with `/` separators and no `.md`. */
  scope: (relPath: string) => boolean;
  transform: (text: string, relPath: string, ctx: MigrationContext) => StepResult;
}
