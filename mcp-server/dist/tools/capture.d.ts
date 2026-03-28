import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
}
export declare function validateMetadata(metadata: CaptureRequest["metadata"]): CaptureRequest["metadata"] | CaptureError;
export declare function deriveFileName(type: CaptureRequest["type"], metadata: CaptureRequest["metadata"], adrNumber?: number): string;
export declare function generateFrontmatter(type: CaptureRequest["type"], metadata: CaptureRequest["metadata"]): string;
export declare function resolveTargetPath(kgPath: string, type: CaptureRequest["type"], metadata: CaptureRequest["metadata"]): {
    dir: string;
    fileName: string;
    adrNumber?: number;
};
export declare function checkExistingFile(type: CaptureRequest["type"], kgPath: string, metadata: CaptureRequest["metadata"]): string | null;
export declare function updateReadmeIndex(indexPath: string, entry: {
    title: string;
    relativePath: string;
    description?: string;
}): void;
export declare function handleCapture(request: CaptureRequest): Promise<CaptureResponse | CaptureError>;
export declare function registerCaptureTool(server: McpServer): void;
//# sourceMappingURL=capture.d.ts.map