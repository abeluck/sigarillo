import path from "path";
import http from "http";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import session from "koa-session";
import sass from "koa2-sass";
import mount from "koa-mount";
import serve from "koa-static";
import prometheus from "@echo-health/koa-prometheus-exporter";
import R from "ramda";

import { version } from "../package.json";
import config from "./config";
import hbs from "./koa-hbs";
import { requestLogger } from "./middleware/request-logger";
import db from "./middleware/db";
import passport from "./middleware/passport";
import requestId from "./middleware/request-id";
import errorHandler from "./middleware/error-handler";
import routes from "./routes";
import helpers from "./helpers/handlebars";
import logger from "./logger";

function start() {
  const app = new Koa();
  exports.app = app;

  // register prometheus metric tracking middleware
  app.use(prometheus.httpMetricMiddleware());

  // register handlebar helpers
  helpers();
  app.logger = logger;

  // register requestId middleware
  app.use(requestId());

  // default error handler, renders nice errors
  app.use(errorHandler());

  app.use(
    requestLogger(app, config.server.logging.requestLogger, config.env.isProd)
  );

  // trust proxy
  app.proxy = true;

  // app keys for cookie signing ref: https://koajs.com/#app-keys-
  app.keys = config.site.secrets;

  // sessions stored in cookies
  app.use(session({}, app));

  // initialize database connection
  app.use(db(app));

  // configure passport for authentication
  app.use(passport(app));

  // parse the body of json and form requests and make the available at ctx.request.body
  app.use(bodyParser());

  // compile that sass
  app.use(
    sass(
      {
        path: `${__dirname}/assets/scss`,
        dest: `${__dirname}/assets/css`,
        debug: true,
        outputStyle: "compressed"
      },
      {
        includePaths: [`${__dirname}/assets/scss`]
      }
    )
  );

  // serve static assets
  app.use(mount("/assets", serve(`${__dirname}/assets`)));

  // register handlebars templates
  app.use(
    hbs(path.resolve(__dirname, "views"), {
      helperDirs: path.resolve(__dirname, "helpers"),
      partialDirs: path.resolve(__dirname, "views/partials")
    })
  );

  // configure routes
  routes(app);

  // eslint-disable-next-line no-console
  console.log(`
     _                  _ _ _
 ___(_) __ _  __ _ _ __(_) | | ___
/ __| |/ _\` |/ _\` | '__| | | |/ _ \\
\\__ \\ | (_| | (_| | |  | | | | (_) |
|___/_|\\__, |\\__,_|_|  |_|_|_|\\___/
       |___/

                   version: ${version}
`);
  if (
    R.equals(config.server.port, config.server.metricsPort) &&
    R.equals(config.server.host, config.server.metricsHost)
  ) {
    app.use(prometheus.middleware());
    app.logger.warn(
      "WARNING: your /metrics are exposed publicly. specifiy a different METRICS_PORT/HOST to secure your /metrics endpoint"
    );
    app.logger.info(
      `${config.site.name} and metrics is now listening on port ${config.server.host}:${config.server.port}`
    );
    app.listen(config.server.port, config.server.host);
  } else {
    http
      .createServer(app.callback())
      .listen(config.server.port, config.server.host, () => {
        app.logger.info(
          `${config.site.name} is now listening on ${config.server.host}:${config.server.port}`
        );
      });
    const metricsApp = new Koa();
    metricsApp.use(prometheus.middleware());
    http
      .createServer(metricsApp.callback())
      .listen(config.server.metricsPort, config.server.metricsHost, () => {
        app.logger.info(
          `Prometheus metrics exposed on ${config.server.metricsHost}:${config.server.metricsPort}`
        );
      });
  }
}

// noinspection JSUnusedGlobalSymbols
export default start;
