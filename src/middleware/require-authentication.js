import { UnauthorizedError } from '../errors'

async function isAuthenticated(ctx, next) {
  if (ctx.isAuthenticated()) {
    await next()
  } else {
    ctx.throw(401, new UnauthorizedError())
  }
}

export default isAuthenticated
