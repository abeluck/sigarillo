/* eslint-disable global-require */
// noinspection ES6ConvertRequireIntoImport
const R = require("ramda");
// noinspection ES6ConvertRequireIntoImport
const {
  defaultHost,
  defaultPort,
  defaultMetricsHost,
  defaultMetricsPort,
  defaultDataPath,
  defaultFilePath,
  isNotEmpty,
  ROOT,
  isProd,
  isDev,
  isTest,
  NODE_ENV,
  validateEnv,
  normalizePort
} = require("./base");
// noinspection ES6ConvertRequireIntoImport
const knexfile = require("./knexfile");

function parseSecrets(commaString) {
  return commaString.split(",");
}

const isNotChangeMe = R.complement(R.equals("changeme"));
validateEnv(
  "SECRETS",
  R.both(isNotEmpty, isNotChangeMe),
  "The env var 'SECRETS' must be set"
);
// noinspection ES6ConvertRequireIntoImport
module.exports = {
  site: {
    name: "Sigarillo",
    secrets: parseSecrets(process.env.SECRETS)
  },
  server: {
    port: normalizePort(defaultPort(process.env.PORT)),
    host: defaultHost(process.env.HOST),
    metricsPort: normalizePort(defaultMetricsPort(process.env.METRICS_PORT)),
    metricsHost: defaultMetricsHost(process.env.METRICS_HOST),
    root: ROOT,
    data: defaultDataPath(process.env.DATA_PATH),
    files: defaultFilePath(process.env.FILE_PATH),
    logging: require("./logging")
  },
  env: {
    isDev,
    isProd,
    isTest
  },

  cors: {
    origin: "*",
    exposeHeaders: ["Authorization"],
    credentials: true,
    allowMethods: ["GET", "PUT", "POST", "DELETE"],
    allowHeaders: ["Authorization", "Content-Type"],
    keepHeadersOnError: true
  },

  bodyParser: {
    enableTypes: ["json"]
  },

  db: knexfile[NODE_ENV]
};
