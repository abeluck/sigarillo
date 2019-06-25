import log from "../logger";

function errorHandler() {
  return async (ctx, next) => {
    try {
      await next();
      const status = Number(ctx.response.status);
      if (status === 404 && !ctx.response.body) {
        ctx.throw(404);
      }
    } catch (err) {
      console.log(err);
      log.error(err.message, { code: err.code, stack: err.stack });
      if (err.status === 401 && !ctx.response.body) {
        ctx.redirect("/login");
        ctx.status = 401;
      } else {
        await ctx.render("error", {
          request: ctx.request,
          response: ctx.response,
          stack: err.stack,
          status: ctx.status,
          code: err.code,
          message: err.message,
          errorData: JSON.stringify(err)
        });
      }
    }
  };
}

export default errorHandler;
