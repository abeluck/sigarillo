// noinspection ES6ConvertRequireIntoImport
const path = require("path");
// noinspection ES6ConvertRequireIntoImport
const R = require("ramda");

const ROOT = path.resolve(__dirname, "..");
// noinspection ES6ConvertRequireIntoImport
require("dotenv").config({ path: path.join(ROOT, "..", ".env") });

const defaultEnv = R.defaultTo("development");
const defaultPort = R.defaultTo(3000);
const defaultHost = R.defaultTo("0.0.0.0");
const defaultMetricsHost = R.defaultTo("0.0.0.0");
const defaultMetricsPort = R.defaultTo(9391);
const defaultDataPath = R.defaultTo(path.join(ROOT, "..", "data"));
const defaultLogDir = R.defaultTo(path.join(ROOT, "..", "data", "log"));
const defaultFilePath = R.defaultTo(path.join(ROOT, "..", "tmp"));
const isEmpty = R.either(R.isNil, R.isEmpty);
const isNotEmpty = R.complement(isEmpty);

const NODE_ENV = defaultEnv(process.env.NODE_ENV);
const isProd = NODE_ENV === "production";
const isTest = NODE_ENV === "test";
const isDev = NODE_ENV === "development";

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (port >= 0) {
    return port;
  }

  return undefined;
}

const validateEnv = (key, predicate, errorMessage = "") => {
  const message =
    errorMessage || `Environment variable ${key} must be defined.`;
  const val = process.env[key] || undefined;
  if (!predicate(val)) throw new Error(message);
};

module.exports = {
  defaultEnv,
  defaultHost,
  defaultPort,
  defaultMetricsHost,
  defaultMetricsPort,
  defaultDataPath,
  defaultLogDir,
  defaultFilePath,
  isNotEmpty,
  isEmpty,
  ROOT,
  isProd,
  isDev,
  isTest,
  NODE_ENV,
  validateEnv,
  normalizePort
};
