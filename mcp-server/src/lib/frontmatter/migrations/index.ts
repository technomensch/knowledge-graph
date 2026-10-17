import { step1 } from "./step1-keys-and-ids.js";
import { step2 } from "./step2-wikilinks.js";
import { step3 } from "./step3-flatten-related.js";
import { step4 } from "./step4-status-category.js";
import type { Migration } from "./types.js";

/** Only the maintainer raises this, deliberately, in a release (approved retirement rule). */
export const FRONTMATTER_SCHEMA_FLOOR = 0;

export const MIGRATIONS: Migration[] = [step1, step2, step3, step4];
