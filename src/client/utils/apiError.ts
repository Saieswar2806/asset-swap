/**
 * Centralized frontend API error normalization & HTML/technical-message protection.
 * Ensures users never see raw HTML error pages, `Cannot POST/GET`, SQL errors, or stack traces.
 */

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly data: any;
  public readonly isRetryable: boolean;
  public readonly isSessionExpired: boolean;

  constructor(params: {
    message: string;
    status: number;
    code?: string;
    data?: any;
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.status = params.status;
    this.code = params.code || defaultCodeForStatus(params.status);
    this.data = params.data;
    this.isSessionExpired = params.status === 401;
    this.isRetryable =
      params.status === 0 ||
      params.status === 408 ||
      params.status === 429 ||
      params.status >= 500 ||
      this.code === "HTML_ERROR_RESPONSE";
  }
}

function defaultCodeForStatus(status: number): string {
  if (status === 0) return "NETWORK_ERROR";
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status === 401) return "SESSION_EXPIRED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "RESOURCE_NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status >= 500) return "SERVER_ERROR";
  return "REQUEST_FAILED";
}

export function looksLikeHtml(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<html") ||
    trimmed.includes("<body") ||
    trimmed.includes("<head>") ||
    /<pre>\s*cannot\s+(get|post|put|patch|delete)\s+/i.test(text)
  );
}

export function looksLikeTechnicalInternals(text: string): boolean {
  if (!text) return false;
  return (
    looksLikeHtml(text) ||
    /cannot\s+(get|post|put|patch|delete)\s+\//i.test(text) ||
    /http error!?\s*status/i.test(text) ||
    /sqlite|unique constraint failed|syntaxerror|typeerror|referenceerror|unexpected token/i.test(text) ||
    /\n\s+at\s+\S+\s+\(/.test(text) ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Failed to fetch|NetworkError/i.test(text)
  );
}

export function parseApiResponseBody(
  rawText: string,
  contentType?: string | null
): { parsed: any; isHtml: boolean } {
  const isHtmlHeader = Boolean(contentType && contentType.toLowerCase().includes("text/html"));
  if (isHtmlHeader || looksLikeHtml(rawText)) {
    return {
      parsed: {
        success: false,
        error: {
          code: "HTML_ERROR_RESPONSE",
          message: "The server returned an unexpected response."
        }
      },
      isHtml: true
    };
  }

  if (!rawText || !rawText.trim()) {
    return { parsed: {}, isHtml: false };
  }

  try {
    return { parsed: JSON.parse(rawText), isHtml: false };
  } catch {
    return {
      parsed: {
        success: false,
        error: {
          code: "INVALID_RESPONSE_FORMAT",
          message: rawText
        }
      },
      isHtml: false
    };
  }
}

export function extractErrorDetails(data: any): { code?: string; rawMessage: string } {
  if (!data || typeof data !== "object") {
    return { rawMessage: typeof data === "string" ? data : "" };
  }

  if (data.error && typeof data.error === "object") {
    return {
      code: typeof data.error.code === "string" ? data.error.code : undefined,
      rawMessage:
        (typeof data.error.message === "string" && data.error.message) ||
        (typeof data.message === "string" && data.message) ||
        ""
    };
  }

  const rawMessage =
    (typeof data.error === "string" && data.error) ||
    (typeof data.message === "string" && data.message) ||
    "";
  return {
    code: typeof data.code === "string" ? data.code : undefined,
    rawMessage
  };
}

export function defaultUserMessageForStatus(status: number, fallbackMessage?: string): string {
  if (status === 0) {
    return "We are unable to connect right now. Please try again.";
  }
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 403) {
    return "You don't have permission to perform this action.";
  }
  if (status === 404) {
    return "The requested information is unavailable.";
  }
  if (status === 409) {
    return "This request conflicts with existing records. Please refresh and try again.";
  }
  if (status === 400 || status === 422) {
    return fallbackMessage || "Please review your entered details and try again.";
  }
  if (status >= 500) {
    return "Something went wrong. Please try again later.";
  }
  return fallbackMessage || "Something went wrong. Please try again later.";
}

export function sanitizeClientErrorMessage(
  rawMessage: unknown,
  status: number,
  fallbackMessage?: string
): string {
  const candidate = typeof rawMessage === "string" ? rawMessage.trim() : "";

  if (!candidate || looksLikeTechnicalInternals(candidate)) {
    return defaultUserMessageForStatus(status, fallbackMessage);
  }

  if (status === 401 && /authentication required|invalid.*token|expired/i.test(candidate)) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 404 && /endpoint is unavailable|route.*not found|api.*not found/i.test(candidate)) {
    return fallbackMessage || "The requested service is temporarily unavailable. Please try again.";
  }

  return candidate;
}

/**
 * Formats contextual user-facing error text inside UI pages/modals.
 */
export function getContextualErrorMessage(err: unknown, contextualFallback: string): {
  message: string;
  isRetryable: boolean;
  isSessionExpired: boolean;
  status: number;
} {
  if (err instanceof ApiClientError) {
    if (err.isSessionExpired) {
      return {
        message: "Your session has expired. Please sign in again.",
        isRetryable: false,
        isSessionExpired: true,
        status: 401
      };
    }
    if (err.status === 403) {
      return {
        message: "You don't have permission to perform this action.",
        isRetryable: false,
        isSessionExpired: false,
        status: 403
      };
    }
    if (err.status === 0) {
      return {
        message: "We are unable to connect right now. Please try again.",
        isRetryable: true,
        isSessionExpired: false,
        status: 0
      };
    }
    if (err.code === "HTML_ERROR_RESPONSE" || err.code === "API_ROUTE_NOT_FOUND" || err.status >= 500) {
      return {
        message: contextualFallback,
        isRetryable: true,
        isSessionExpired: false,
        status: err.status
      };
    }
    return {
      message: sanitizeClientErrorMessage(err.message, err.status, contextualFallback),
      isRetryable: err.isRetryable,
      isSessionExpired: false,
      status: err.status
    };
  }

  const raw = err instanceof Error ? err.message : "";
  return {
    message: sanitizeClientErrorMessage(raw, 500, contextualFallback),
    isRetryable: true,
    isSessionExpired: false,
    status: 500
  };
}

export function resolveApiBaseUrl(): string {
  try {
    const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL;
    if (typeof envBase === "string" && envBase.trim()) {
      return envBase.trim().replace(/\/+$/, "");
    }
  } catch {
    // Non-Vite test environment
  }
  return "/api";
}
