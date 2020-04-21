"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.patchAgainstDanglingTimers = void 0;

/**
 * Patch the timer API to protect against dangling timers.
 *
 * @returns {IGate} A gate API to control when timers should be allowed to run
 * (gate is open), or when we should prevent them running and report dangling
 * timers (gate is closed).
 */
const patchAgainstDanglingTimers = objToPatch => {
  let warned = false;

  const patchCallbackFnWithGate = (obj, fnName, gate) => {
    const old = obj[fnName];
    delete obj[fnName];

    obj[fnName] = (callback, ...args) => {
      const gatedCallback = () => {
        if (gate.isOpen) {
          callback();
          return;
        }

        if (!warned) {
          warned = true;
          /**
           * This uses console because it runs in the VM, so it
           * doesn't have direct access to our winston logging.
           * Our virtual JSDOM console manages that.
           */
          // eslint-disable-next-line no-console

          console.warn("Dangling timer(s) detected");
        }
      };

      return old(gatedCallback, ...args);
    };
  };
  /**
   * Make a gate so we can control how the timers are handled.
   * The gate is default open.
   */


  let gateOpen = true;
  const gate = {
    open: () => {
      gateOpen = true;
    },
    close: () => {
      gateOpen = false;
    },

    get isOpen() {
      return gateOpen;
    }

  };
  /**
   * Patch the timer functions on window so that dangling timers don't kill
   * us when we close the window.
   */

  patchCallbackFnWithGate(objToPatch, "setTimeout", gate);
  patchCallbackFnWithGate(objToPatch, "setInterval", gate);
  patchCallbackFnWithGate(objToPatch, "requestAnimationFrame", gate);
  return gate;
};

exports.patchAgainstDanglingTimers = patchAgainstDanglingTimers;
//# sourceMappingURL=patch-against-dangling-timers.js.map