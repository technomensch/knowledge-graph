import * as fs from "fs";
import * as path from "path";
import { readConfig, getActiveGraphPath } from "../config.js";

/**
 * Derive project root from KG path.
 * If path ends in /docs, parent is project root; otherwise path itself is root.
 */
export function getProjectRoot(kgPath: string): string {
  if (kgPath.endsWith("/docs")) {
    return path.dirname(kgPath);
  }
  return kgPath;
}

export interface CaptureRequest {
  content: string;
  type: "lesson" | "session" | "adr";
  metadata: {
    title: string;
    category?: string;
    tags?: string[];
    git?: {
      branch?: string;
      commit?: string;
      commit_short?: string;
      author?: string;
      email?: string;
    };
    version?: string;
    existingFile?: string;
  };
}

export interface CaptureResponse {
  status: "created" | "updated";
  filePath: string;
  relativePath: string;
  indexResult: Record<string, unknown>;
}

export interface CaptureError {
  error: "KG_MISMATCH" | "VALIDATION_ERROR" | "IO_ERROR" | "CONFLICT";
  activeKg?: string;
  activeKgRoot?: string;
  cwd?: string;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Slugify a string for use in filenames
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate filename based on type and metadata
 */
function deriveFileName(
  type: "lesson" | "session" | "adr",
  metadata: CaptureRequest["metadata"]
): { filename: string; directory: string } {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];

  switch (type) {
    case "lesson": {
      const category = metadata.category || "general";
      const slug = slugify(metadata.title);
      const filename = `Lessons_Learned_${slug}.md`;
      return { filename, directory: path.join("lessons-learned", category) };
    }

    case "session": {
      const month = date.toISOString().slice(0, 7); // YYYY-MM
      const slug = slugify(metadata.title || "session");
      const filename = `${dateStr}-${slug}.md`;
      return { filename, directory: path.join("sessions", month) };
    }

    case "adr": {
      const slug = slugify(metadata.title);
      const filename = `ADR-NNN-${slug}.md`;
      return { filename, directory: "decisions" };
    }
  }
}

/**
 * Generate YAML frontmatter for the file
 */
function generateFrontmatter(
  type: "lesson" | "session" | "adr",
  metadata: CaptureRequest["metadata"]
): string {
  const date = new Date().toISOString().split("T")[0];

  const frontmatter: Record<string, unknown> = {
    title: metadata.title,
    date: date,
  };

  if (metadata.category) {
    frontmatter.category = metadata.category;
  }

  if (metadata.tags && metadata.tags.length > 0) {
    frontmatter.tags = metadata.tags;
  }

  if (metadata.git) {
    frontmatter.git = metadata.git;
  }

  if (metadata.version) {
    frontmatter.version = metadata.version;
  }

  if (type === "adr") {
    frontmatter.status = "Proposed";
  }

  // Generate YAML frontmatter
  let yaml = "---\n";
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      yaml += `${key}:\n`;
      for (const item of value) {
        yaml += `  - ${item}\n`;
      }
    } else if (typeof value === "object" && value !== null) {
      yaml += `${key}:\n`;
      for (const [k, v] of Object.entries(value)) {
        yaml += `  ${k}: ${v}\n`;
      }
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }
  yaml += "---\n";

  return yaml;
}

/**
 * Check for KG/CWD alignment
 */
function checkAlignment(kgPath: string): CaptureError | null {
  const projectRoot = getProjectRoot(kgPath);
  const cwd = process.cwd();

  if (!cwd.startsWith(projectRoot)) {
    return {
      error: "KG_MISMATCH",
      activeKgRoot: projectRoot,
      cwd: cwd,
      message: `Active KG project root (${projectRoot}) does not match current working directory (${cwd})`,
    };
  }

  return null;
}

/**
 * Update README.md with new entry
 */
function updateReadmeIndex(
  indexPath: string,
  title: string,
  relativePath: string
): void {
  let content = "";
  if (fs.existsSync(indexPath)) {
    content = fs.readFileSync(indexPath, "utf-8");
  }

  const entry = `- [${title}](${relativePath})`;
  if (!content.includes(entry)) {
    content += `\n${entry}\n`;
  }

  fs.writeFileSync(indexPath, content, "utf-8");
}

/**
 * Check for duplicate session files (same date)
 */
function checkSessionConflict(sessionDir: string, filename: string): boolean {
  if (!fs.existsSync(sessionDir)) {
    return false;
  }

  const date = filename.split("-").slice(0, 3).join("-");
  const files = fs.readdirSync(sessionDir);
  return files.some((f) => f.startsWith(date));
}

/**
 * Find next available ADR number
 */
function getNextAdrNumber(decisionsDir: string): number {
  if (!fs.existsSync(decisionsDir)) {
    return 1;
  }

  const files = fs.readdirSync(decisionsDir);
  const adrNumbers = files
    .filter((f) => f.startsWith("ADR-"))
    .map((f) => {
      const match = f.match(/ADR-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });

  return adrNumbers.length > 0 ? Math.max(...adrNumbers) + 1 : 1;
}

/**
 * Main capture handler
 */
export async function handleCapture(
  request: CaptureRequest
): Promise<CaptureResponse | CaptureError> {
  try {
    const config = readConfig();
    const kgPath = getActiveGraphPath(config);

    if (!kgPath) {
      return {
        error: "VALIDATION_ERROR",
        message: "No active knowledge graph configured",
      };
    }

    const alignmentError = checkAlignment(kgPath);
    if (alignmentError) {
      return alignmentError;
    }

    if (!request.metadata.title) {
      return {
        error: "VALIDATION_ERROR",
        message: "Metadata must include 'title'",
      };
    }

    let { filename, directory } = deriveFileName(request.type, request.metadata);

    if (request.type === "adr") {
      const decisionsDir = path.join(kgPath, "decisions");
      const nextNumber = getNextAdrNumber(decisionsDir);
      const slug = slugify(request.metadata.title);
      filename = `ADR-${String(nextNumber).padStart(3, "0")}-${slug}.md`;
    }

    if (request.metadata.existingFile) {
      const filePath = path.join(kgPath, request.metadata.existingFile);
      if (!fs.existsSync(filePath)) {
        return {
          error: "IO_ERROR",
          message: `Existing file not found: ${request.metadata.existingFile}`,
        };
      }

      const frontmatter = generateFrontmatter(request.type, request.metadata);
      const content = frontmatter + request.content;
      fs.writeFileSync(filePath, content, "utf-8");

      return {
        status: "updated",
        filePath: filePath,
        relativePath: request.metadata.existingFile,
        indexResult: {},
      };
    }

    const targetDir = path.join(kgPath, directory);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (request.type === "session") {
      if (checkSessionConflict(targetDir, filename)) {
        return {
          error: "CONFLICT",
          message: `Session file already exists for this date: ${filename}`,
        };
      }
    }

    const filePath = path.join(targetDir, filename);
    const frontmatter = generateFrontmatter(request.type, request.metadata);
    const content = frontmatter + request.content;

    fs.writeFileSync(filePath, content, "utf-8");

    const readmeDir = path.join(kgPath, directory);
    const readmePath = path.join(readmeDir, "README.md");
    updateReadmeIndex(readmePath, request.metadata.title, `./${filename}`);

    const relativePath = path.relative(kgPath, filePath);

    return {
      status: "created",
      filePath: filePath,
      relativePath: relativePath,
      indexResult: { readmePath, entryAdded: true },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: "IO_ERROR",
      message: message,
    };
  }
}

/**
 * Register the capture tool with the MCP server
 */
export function registerCaptureTool(server: any): void {
  server.tool(
    "kg_capture",
    {
      description:
        "Capture a lesson, session summary, or ADR to the active knowledge graph with automatic file naming, frontmatter generation, and write guard enforcement",
      inputSchema: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "Full markdown content of the lesson/session/ADR",
          },
          type: {
            type: "string",
            enum: ["lesson", "session", "adr"],
            description: "Type of content being captured",
          },
          metadata: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Title or topic (required)",
              },
              category: {
                type: "string",
                description:
                  "Optional subdirectory (architecture, debugging, patterns, process)",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Optional searchability tags",
              },
              git: {
                type: "object",
                properties: {
                  branch: { type: "string" },
                  commit: { type: "string" },
                  commit_short: { type: "string" },
                  author: { type: "string" },
                  email: { type: "string" },
                },
                description: "Optional git metadata from the session",
              },
              version: {
                type: "string",
                description: "Optional version for updates",
              },
              existingFile: {
                type: "string",
                description:
                  "Path to existing file for update-in-place (relative to KG root)",
              },
            },
            required: ["title"],
          },
        },
        required: ["content", "type", "metadata"],
      },
    },
    async (request: {
      content: string;
      type: "lesson" | "session" | "adr";
      metadata: CaptureRequest["metadata"];
    }) => {
      const result = await handleCapture(request);
      return result;
    }
  );
}
