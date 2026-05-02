export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return Response.json(
      { ok: false, code: err.code, message: err.message, details: err.details ?? null },
      { status: err.status }
    );
  }
  if (err instanceof Error) {
    return Response.json({ ok: false, code: "INTERNAL", message: err.message }, { status: 500 });
  }
  return Response.json({ ok: false, code: "INTERNAL", message: "Unknown error" }, { status: 500 });
}

