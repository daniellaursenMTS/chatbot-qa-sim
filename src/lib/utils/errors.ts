import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode },
    );
  }

  console.error("Unhandled error:", error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 },
  );
}

export function validationError(
  message: string,
  details?: Record<string, unknown>,
): ApiError {
  return new ApiError(400, "VALIDATION_ERROR", message, details);
}

export function notFoundError(resource: string): ApiError {
  return new ApiError(404, "NOT_FOUND", `${resource} not found`);
}
