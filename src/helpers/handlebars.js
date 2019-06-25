import hbs from "koa-hbs";

function init() {
  hbs.registerHelper("if_eq", (a, b, opts) => {
    if (a === b) {
      return opts.fn(this);
    }
    return opts.inverse(this);
  });
}

export default init;
