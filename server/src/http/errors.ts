export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
    // Payload strutturato specifico dell'errore (es. anteprima di un'operazione
    // che richiede conferma), serializzato in `error.details`.
    public readonly details?: unknown,
  ) {
    super(message);
  }

  static badRequest(message: string, fields?: Record<string, string[]>): ApiError {
    return new ApiError(400, "VALIDATION_ERROR", message, fields);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static unauthorized(message: string): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message: string): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}
