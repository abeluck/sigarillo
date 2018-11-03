class BadRequestError extends Error {}

class UnauthorizedError extends Error {}

class ForbiddenError extends Error {}

class NotFoundError extends Error {}

class ServerError extends Error {}

export {
  BadRequestError, // 400
  UnauthorizedError, // 401
  ForbiddenError, // 403
  NotFoundError, // 404
  ServerError, // 500
}
