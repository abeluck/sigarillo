class HttpError extends Error {
  constructor(status) {
    super();
    this.status = status;
  }
}
class BadRequestError extends HttpError {
  constructor() {
    super(400);
  }
}

class UnauthorizedError extends HttpError {
  constructor() {
    super(401);
  }
}

class ForbiddenError extends HttpError {
  constructor() {
    super(403);
  }
}

class NotFoundError extends HttpError {
  constructor() {
    super(404);
  }
}

class ServerError extends HttpError {
  constructor() {
    super(500);
  }
}

export {
  BadRequestError, // 400
  UnauthorizedError, // 401
  ForbiddenError, // 403
  NotFoundError, // 404
  ServerError // 500
};
