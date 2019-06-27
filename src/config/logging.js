// noinspection ES6ConvertRequireIntoImport
const winston = require("winston");
// noinspection ES6ConvertRequireIntoImport
const logfmter = require("logfmt");
// noinspection ES6ConvertRequireIntoImport
const R = require("ramda");

// noinspection ES6ConvertRequireIntoImport
const { prodLogFmt } = require("../middleware/request-logger");

const logfmt = winston.format((info, opts) => {
  const props = R.omit(R.defaultTo([], opts.but), info);
  const infoPatched = info;
  infoPatched.props = logfmter.stringify(props);
  return infoPatched;
});

const logfmtPrintf = info =>
  `${info.timestamp} ${info.level} "${info.message}" ${info.props}`;

const logging = {
  logger: winston.createLogger({
    format: winston.format.combine(winston.format.timestamp()),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logfmt({ but: ["level", "message", "timestamp"] }),
          winston.format.printf(logfmtPrintf)
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
          prodLogFmt(),
          winston.format.splat(),
          logfmt({ but: ["statusColor", "level", "message", "timestamp"] }),
          winston.format.printf(logfmtPrintf)
        )
      })
    ],
    level: "info"
  })
};

module.exports = logging;
