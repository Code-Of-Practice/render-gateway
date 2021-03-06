"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.traceImpl = void 0;

var _getGatewayInfo = require("./get-gateway-info.js");

var _getDelta = require("./get-delta.js");

var _createLogger = require("./create-logger.js");

var _kaError = _interopRequireDefault(require("./ka-error.js"));

var _errors = require("./errors.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Start tracing an event.
 *
 * This will log the start of a trace and open a trace session, which is
 * returned. Use the returned session to end the trace when the traced event is
 * over. The traced event will be logged and also written to the Google Cloud
 * StackDriver Trace agent.
 *
 * Trace logs include metadata about the trace such as duration and memory
 * usage.
 *
 * @param {Logger} logger A logger to use for documention and timing the
 * traced action.
 * @param {string} action The name of the traced action. Keep it short. This
 * should be the name of an action rather than a specific URL, for example. Use
 * addLabel on the returned session or the session info when ending the session
 * to add additional details about the trace.
 * @param {string} message A message that will be logged. This is not included
 * in the traces.
 * @param {Tracer} [tracer] A Google Cloud trace agent tracer which
 * can be used to record the traced action.
 * @returns {ITraceSession} A trace session that the caller should use to
 * indicate when the session is finished.
 */
const traceImpl = (logger, action, message, tracer) => {
  if (!action) {
    throw new _kaError.default("Must provide an action for the trace session.", _errors.Errors.Internal);
  }

  const logMessage = `${action}${message ? `: ${message}` : ""}`;
  /**
   * We are going to use the logger's profiling API (provided by winston).
   * However, we want to mark the start of the trace as it gives us some
   * debug information which can be valuable when investigating operations.
   *
   * Winston only logs when profiling is done and the optional trace agent
   * tracer will only show the span if it is ended.
   *
   * Since this is noise in most situations, we will log this at the lowest
   * level of silly.
   */

  logger.silly(`TRACE ${logMessage}`);
  /**
   * Now we start the profiling timer.
   */

  const profiler = logger.startTimer();
  const beforeMemory = process.memoryUsage();
  const {
    name: gatewayName
  } = (0, _getGatewayInfo.getGatewayInfo)();
  /**
   * Next, if we were given a tracer, we start a trace section for this so
   * trace session so that it will appear in Stackdriver Trace.
   *
   * We annotate the span with the gateway name so that it is clear in the
   * trace which spans were created by this API and which were inserted by
   * other means.
   */

  const span = tracer === null || tracer === void 0 ? void 0 : tracer.createChildSpan({
    name: `${gatewayName}.${action}`
  });
  const profileLabels = {};

  const addLabel = (name, value) => {
    /**
     * Track this so we can also include it in our logging info.
     */
    profileLabels[name] = value;
    /**
     * Send this label on to the trace span.
     *
     * We disable this lint rule as the linter does not appear to
     * understand the optional chaining.
     */

    span === null || span === void 0 ? void 0 : span.addLabel(name, value);
  };
  /**
   * This is the function that we will return to our caller.
   * It can then be used to end and record the trace session.
   */


  const end = info => {
    const afterMemory = process.memoryUsage();
    /**
     * Add some session information to the span as labels.
     */

    addLabel("/memory/delta", (0, _getDelta.getDelta)(beforeMemory, afterMemory));
    addLabel("/memory/final", afterMemory);
    /**
     * We need to build the metadata that we will be logging.
     * This is a combination of the given info, some custom things we add,
     * and any profile labels that were added.
     */

    const metadata = _objectSpread(_objectSpread(_objectSpread(_objectSpread({}, (0, _createLogger.getDefaultMetadata)()), profileLabels), info), {}, {
      message: `TRACED ${logMessage}`,
      level: (info === null || info === void 0 ? void 0 : info.level) || "debug"
    });
    /**
     * Let's mark our profile as done.
     *
     * We include the session info object, but make sure to set the level
     * and message ourselves.
     */


    profiler.done(metadata);
    /**
     * If we started a tracer span, let's end it.
     *
     * We disable this lint rule as the linter does not appear to
     * understand the optional chaining.
     */

    span === null || span === void 0 ? void 0 : span.endSpan();
  };

  return {
    get action() {
      return action;
    },

    addLabel,
    end
  };
};

exports.traceImpl = traceImpl;
//# sourceMappingURL=trace-impl.js.map