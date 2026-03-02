export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterMs: number) {
    super(
      `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)}s`,
      429,
      'RATE_LIMIT_EXCEEDED',
    );
  }
}

export class ConsentRequiredError extends AppError {
  constructor() {
    super('User consent required but not granted', 403, 'CONSENT_REQUIRED');
  }
}

export class BudgetExhaustedError extends AppError {
  constructor(campaignId: string) {
    super(
      `Budget exhausted for campaign '${campaignId}'`,
      409,
      'BUDGET_EXHAUSTED',
    );
  }
}
