/* eslint-disable no-bitwise,no-param-reassign */
import chalk from "chalk";
import R from "ramda";
import bytes from "bytes";
import humanize from "humanize-number";
import winston from "winston";
import Counter from "passthrough-counter";

/**
 * Color map.
 */

const colorCodes = {
  7: "magenta",
  5: "red",
  4: "yellow",
  3: "cyan",
  2: "green",
  1: "green",
  0: "yellow"
};

/**
 * Show the response time in a human readable format.
 * In milliseconds if less than 10 seconds,
 * in seconds otherwise.
 */

function time(start) {
  const delta = Date.now() - start;
  return humanize(
    delta < 10000 ? `${delta}ms` : `${Math.round(delta / 1000)}s`
  );
}

function log(print, ctx, start, len, err, event) {
  // get the status code of the response
  let status;
  if (err) {
    status = err.isBoom ? err.output.statusCode : err.status || 500;
  } else {
    status = ctx.status || 404;
  }

  // set the color of the status code;
  const s = (status / 100) | 0;
  const color = R.has(s, colorCodes) ? colorCodes[s] : 0;

  // get the human readable response length
  let length;
  if (~[204, 205, 304].indexOf(status)) {
    length = "";
  } else if (len == null) {
    length = "-";
  } else {
    length = bytes(len).toLowerCase();
  }

  print({
    length,
    status,
    method: ctx.method,
    path: ctx.originalUrl,
    statusColor: color,
    duration: time(start),
    requestId: ctx.state.id
  });
}

// the koa2 middleware
function requestLogger(app, logger, isProd) {
  app.requestLogger = logger;
  return async (ctx, next) => {
    const print = (...args) => ctx.app.requestLogger.info("", ...args);
    // request
    const start = Date.now();

    try {
      await next();
    } catch (err) {
      // log uncaught downstream errors
      log(print, ctx, start, null, err);
      throw err;
    }
    // calculate the length of a streaming response
    // by intercepting the stream with a counter.
    // only necessary if a content-length header is currently not set.
    const { length } = ctx.response;
    const { body, res } = ctx;
    let counter;
    if (length == null && body && body.readable) {
      ctx.body = body.pipe((counter = Counter())).on("error", ctx.onerror);
    }

    // log when the response is finished or closed,
    // whichever happens first.
    // eslint-disable-next-line no-use-before-define
    const onfinish = done.bind(null, "finish");
    // eslint-disable-next-line no-use-before-define
    const onclose = done.bind(null, "close");

    res.once("finish", onfinish);
    res.once("close", onclose);

    function done(event) {
      res.removeListener("finish", onfinish);
      res.removeListener("close", onclose);
      log(print, ctx, start, counter ? counter.length : length, null, event);
    }
  };
}

const prodLogFmt = winston.format((info, opts) => {
  const msgs = [];
  if (info.method) msgs.push(`${chalk.bold(info.method.toUpperCase())}`);
  if (info.path) msgs.push(`${chalk.gray(info.path)}`);

  info.message = `${msgs.join(" ")}`;
  return info;
});

export { requestLogger, prodLogFmt };
