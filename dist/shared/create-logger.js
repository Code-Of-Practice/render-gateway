"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createLogger = void 0;

var _stream = _interopRequireDefault(require("stream"));

var _winston = _interopRequireDefault(require("winston"));

var lw = _interopRequireWildcard(require("@google-cloud/logging-winston"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * This is how the log message gets formatted.
 *
 * We can expand this to include additional metadata as needed. For example,
 * if we have the profiling API from react-render-server, we could include
 * the duration metadata.
 */
const devFormatter = ({
  level,
  message
}) => `${level}: ${message}`;
/**
 * Build the formatters to give us some nice dev output.
 */


const getFormatters = mode => {
  const formatters = [_winston.default.format.splat(), // Allows for %s style substitutions
  _winston.default.format.printf(info => devFormatter(info))];

  if (mode === "development") {
    formatters.push(_winston.default.format.cli({
      level: true
    }));
  }

  return _winston.default.format.combine(...formatters);
};
/**
 * Gets the logging transport for the given mode.
 */


const getTransport = mode => {
  switch (mode) {
    /**
     * Our flow types guard against misuse as long as someone is using them.
     * Let's be defensive and cope with a bad value. In that case, we'll
     * assume our test mode as it's the most inert.
     */
    default:
    case "test":
      /**
       * During testing, we just dump logging.
       * This avoids storing it anywhere and keeps it out of our
       * test output.
       * To do this, we use a stream that just writes to nowhere.
       *
       * If you want to test logging, you can jest.spy on the logger's
       * log method, or any other of its more specific logging methods.
       */
      const sink = new _stream.default.Writable({
        write: () => {}
      }); // This is a hack to make our writable stream work $FlowFixMe

      sink._write = sink.write;
      return new _winston.default.transports.Stream({
        format: getFormatters("test"),
        stream: sink
      });

    case "development":
      /**
       * If we're in dev mode, just use a console transport.
       */
      return new _winston.default.transports.Console({
        format: getFormatters("development")
      });

    case "production":
      /**
       * We must be in production, so we will use the Stackdriver logging
       * setup.
       *
       * If using the Google-provided middleware that adds a log property
       * to the express request, make sure this transport is passed to
       * that middleware so that it doesn't add its own.
       */
      return new lw.LoggingWinston();
  }
};
/**
 * Create a logger for the given runtime mode and log level.
 */


const createLogger = (runtimeMode, logLevel) => {
  const winstonLogger = _winston.default.createLogger({
    level: logLevel,
    transports: getTransport(runtimeMode)
  });

  winstonLogger.debug(`Created logger (Level=${logLevel} Mode=${runtimeMode})`);
  return winstonLogger;
};

exports.createLogger = createLogger;
//# sourceMappingURL=create-logger.js.map