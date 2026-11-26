import type { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const DEFAULT_ERROR_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "RESOURCE_NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  500: "INTERNAL_SERVER_ERROR"
};

/**
 * Catch-all handler for unmatched `/api/*` endpoints.
 * Guarantees structured JSON instead of Express's default HTML 404 error page.
 */
export function apiNotFoundHandler(req: Request, res: Response): void {
  const fullPath = req.originalUrl ? req.originalUrl.split("?")[0] : req.path;
  console.warn(`[API 404] ${req.method} ${fullPath} - endpoint not found`);
  res.status(404).json({
    success: false,
    error: {
      code: "API_ROUTE_NOT_FOUND",
      message: "The requested API service endpoint is unavailable."
    }
  });
}

/**
 * Centralized Express 5 error middleware.
 * Logs full error details internally while returning clean, safe JSON to API callers.
 */
export function apiErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const anyErr = err as any;

  // 1. Handle malformed JSON payloads from express.json()
  if (
    err instanceof SyntaxError &&
    (anyErr?.type === "entity.parse.failed" || (anyErr?.status === 400 && "body" in anyErr))
  ) {
    console.warn(`[API 400] Malformed JSON body on ${req.method} ${req.originalUrl}`);
    res.status(400).json({
      success: false,
      error: {
        code: "MALFORMED_JSON",
        message: "The request body contains malformed JSON."
      }
    });
    return;
  }

  // 2. Payload too large
  if (anyErr?.type === "entity.too.large" || anyErr?.status === 413) {
    res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The uploaded request payload exceeds allowed size limits."
      }
    });
    return;
  }

  // 3. Explicit structured ApiError
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      console.error(`[API ${err.statusCode}] ${req.method} ${req.originalUrl}:`, err);
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  // 4. Unexpected server/database errors - log privately, never expose SQL/stacks/paths to client
  console.error(`[API 500] Unhandled error on ${req.method} ${req.originalUrl}:`, err);

  const rawStatus = Number(anyErr?.statusCode || anyErr?.status);
  const statusCode = rawStatus >= 400 && rawStatus < 500 ? rawStatus : 500;
  const code = DEFAULT_ERROR_CODES[statusCode] || "INTERNAL_SERVER_ERROR";

  let safeMessage = "An unexpected server error occurred. Please try again later.";
  if (statusCode < 500 && typeof anyErr?.message === "string" && anyErr.message.trim()) {
    // Strip accidental SQL/stack markers even on 4xx thrown errors
    const msg = anyErr.message.trim();
    const looksTechnical = /SQLITE|SELECT |INSERT |UPDATE |DELETE |syntax|at\s+\S+\s+\(/i.test(msg);
    if (!looksTechnical) {
      safeMessage = msg;
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: safeMessage
    }
  });
}
