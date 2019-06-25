// noinspection ES6ConvertRequireIntoImport
const winston = require("winston");
// noinspection ES6ConvertRequireIntoImport
const path = require("path");
// noinspection ES6ConvertRequireIntoImport
const logfmter = require("logfmt");
// noinspection ES6ConvertRequireIntoImport
const R = require("ramda");
// noinspection ES6ConvertRequireIntoImport
const { defaultLogDir } = require("./base");

// noinspection ES6ConvertRequireIntoImport
const { devPretty, fileLogFilter } = require("../middleware/request-logger");

const logDir = defaultLogDir(process.env.LOG_DIR);
const filename = path.join(logDir, "access.log");

const logfmt = winston.format((info, opts) => {
  const props = R.omit(R.defaultTo([], opts.but), info);
  info.props = logfmter.stringify(props);
  return info;
});

const logging = {
  logger: winston.createLogger({
    format: winston.format.combine(winston.format.timestamp()),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logfmt({ but: ["level", "message", "timestamp"] }),
          winston.format.printf(
            info =>
              `${info.timestamp} ${info.level} ${info.message} ${info.props}`
          )
        )
      }),
      new winston.transports.File({
        filename,
        level: "info",
        format: winston.format.combine(
          logfmt(),
          winston.format.printf(info => `${info.timestamp} ${info.props}`)
        )
      })
    ]
  }),
  requestLogger: winston.createLogger({
    format: winston.format.combine(winston.format.timestamp()),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          devPretty(),
          winston.format.splat(),
          winston.format.printf(
            info => `${info.timestamp} ${info.level} ${info.message}`
          )
        )
      }),
      new winston.transports.File({
        filename,
        level: "info",
        format: winston.format.combine(
          fileLogFilter(),
          logfmt(),
          winston.format.printf(info => `${info.timestamp} ${info.props}`)
        )
      })
    ],
    level: "info"
  })
};

module.exports = logging;
