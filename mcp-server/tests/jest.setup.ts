/**
 * Jest global setup — runs before every test file.
 *
 * issue-55 (Opus review F5): FTS5 index files live outside the repo, at
 * `~/.kmgraph/index/` by default. Before path-keying, every `npm test` run
 * overwrote the same handful of fixed-name files in the developer's *real*
 * index directory; after path-keying, each run would instead create a brand
 * new orphaned file per temp KG, forever, since nothing anywhere enumerates
 * or reaps that directory.
 *
 * `KG_INDEX_DIR` (see `getIndexDir()` in src/utils.ts) redirects all of it
 * into a tmpdir the OS reaps on its own. Set here rather than per-test-file
 * so no suite can forget it. An explicit KG_INDEX_DIR from the environment
 * wins, so a caller can still point the suite somewhere specific.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

if (!process.env.KG_INDEX_DIR) {
  process.env.KG_INDEX_DIR = fs.mkdtempSync(
    path.join(os.tmpdir(), "kmgraph-jest-index-")
  );
}
