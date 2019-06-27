function errorHandler() {
  return async (ctx, next) => {
    try {
      await next();
      const status = Number(ctx.response.status);
      if (status === 404 && !ctx.response.body) {
        ctx.throw(404);
      }
    } catch (err) {
      const status = ctx.status ? ctx.status : err.status;
      ctx.status = status;
      if (err.status === 401 && !ctx.response.body) {
        ctx.redirect("/login");
      } else {
        ctx.render("error", {
          status,
          request: ctx.request,
          response: ctx.response,
          stack: err.stack,
          message: err.message,
          errorData: JSON.stringify(err)
        });
      }
    }
  };
}

export default errorHandler;
