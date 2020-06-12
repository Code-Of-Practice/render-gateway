"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.JSDOMSixteenEnvironment = void 0;

var _index = require("../../../shared/index.js");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const MinimalPage = "<!DOCTYPE html><html><head></head><body></body></html>";
/**
 * A render environment built to support the JSDOM 16.x API.
 */

class JSDOMSixteenEnvironment {
  /**
   * Create a new instance of this environment.
   *
   * @param {IJSDOMSixteenConfiguration} configuration
   * Configuration for the environment.
   */
  constructor(configuration) {
    _defineProperty(this, "_configuration", void 0);

    _defineProperty(this, "_retrieveTargetFiles", async (url, renderAPI, resourceLoader) => {
      const traceSession = renderAPI.trace("JSDOM16._retrieveTargetFiles", `JSDOMSixteenEnvironment retrieving files`);

      try {
        /**
         * First, we need to know what files to execute so that we can
         * produce a render result, and we need a resource loader so that
         * we can retrieve those files as well as support retrieving
         * additional files within our JSDOM environment.
         */
        const fileURLs = await this._configuration.getFileList(url, renderAPI, (url, options) => resourceLoader.fetch(url, options));
        traceSession.addLabel("fileCount", fileURLs.length);
        /**
         * Now let's use the resource loader to get the files.
         * We ignore the `FetchOptions` param of resourceLoader.fetch as we
         * have nothing to pass there.
         */

        return {
          files: await Promise.all(fileURLs.map(f => {
            const fetchResult = resourceLoader.fetch(f);
            /**
             * Resource loader's fetch can return null. It shouldn't for
             * any of these files though, so if it does, let's raise an
             * error!
             */

            if (fetchResult == null) {
              throw new Error(`Unable to retrieve ${f}. ResourceLoader returned null.`);
            }
            /**
             * No need to reconnect the abort() in this case since we
             * won't be calling it.
             */


            return fetchResult.then(b => ({
              content: b.toString(),
              url: f
            }));
          })),
          urls: fileURLs
        };
      } finally {
        traceSession.end();
      }
    });

    _defineProperty(this, "render", async (url, renderAPI) => {
      /**
       * We want to tidy up nicely if there's a problem and also if the render
       * context is closed, so let's handle that by putting closeable things
       * into a handy list and providing a way to close them all.
       */
      const closeables = [];

      try {
        /**
         * We are going to need a resource loader so that we can obtain files
         * both inside and outside the JSDOM VM.
         */
        const resourceLoader = this._configuration.getResourceLoader(url, renderAPI); // Let's get those files!


        const files = await this._retrieveTargetFiles(url, renderAPI, resourceLoader);
        /**
         * We want a JSDOM instance for the url we want to render. This is
         * where we setup custom resource loading and our virtual console
         * too.
         */

        const {
          JSDOM
        } = require("jsdom");

        const {
          createVirtualConsole
        } = require("./create-virtual-console.js");

        const jsdomInstance = new JSDOM(MinimalPage, {
          url,
          runScripts: "dangerously",
          resources: resourceLoader,
          pretendToBeVisual: true,
          virtualConsole: createVirtualConsole(renderAPI.logger)
        });
        closeables.push(jsdomInstance.window);
        /**
         * OK, we know this is a JSDOM instance but we want to expose a nice
         * wrapper. As part of that wrapper, we want to make it easier to
         * run scripts (like our rendering JS code) within the VM context.
         * So, let's create a helper for that.
         *
         * We cast the context to any, because otherwise it is typed as an
         * empty object, which makes life annoying.
         */

        const vmContext = jsdomInstance.getInternalVMContext();
        /**
         * Next, we want to patch timers so we can make sure they don't
         * fire after we are done (and so we can catch dangling timers if
         * necessary). To do this, we are going to hang the timer API off
         * the vmContext and then execute it from inside the context.
         * Super magic.
         */

        const tmpFnName = "__tmp_patchTimers";

        const {
          patchAgainstDanglingTimers
        } = require("./patch-against-dangling-timers.js");

        vmContext[tmpFnName] = patchAgainstDanglingTimers;

        const timerGateAPI = this._runScript(vmContext, `${tmpFnName}(window);`);

        delete vmContext[tmpFnName];
        closeables.push(timerGateAPI);
        /**
         * At this point, we give our configuration an opportunity to
         * modify the render context and capture the return result, which
         * can be used to tidy up after we're done.
         */

        const afterRenderTidyUp = await this._configuration.afterEnvSetup(url, files.urls, renderAPI, vmContext);
        closeables.push(afterRenderTidyUp);
        /**
         * At this point, before loading the files for rendering, we must
         * configure the registration point in our render context.
         */

        const {
          registrationCallbackName
        } = this._configuration;
        const registeredCbName = "__registeredCallback";

        vmContext[registrationCallbackName] = cb => {
          vmContext[registrationCallbackName][registeredCbName] = cb;
        };

        closeables.push({
          close: () => {
            delete vmContext[registrationCallbackName];
          }
        });
        /**
         * The context is configured. Now we need to load the files into it
         * which should cause our registration callback to be invoked.
         * We pass the filename here so we can get some nicer stack traces.
         */

        for (const {
          content,
          url
        } of files.files) {
          this._runScript(vmContext, content, {
            filename: url
          });
        }
        /**
         * With the files all loaded, we should have a registered callback.
         * Let's assert that and then invoke the render process.
         */


        if (typeof vmContext[registrationCallbackName][registeredCbName] !== "function") {
          throw new Error("No render callback was registered.");
        }
        /**
         * And now we run the registered callback inside the VM.
         */


        const result = await this._runScript(vmContext, `
    const cb = window["${registrationCallbackName}"]["${registeredCbName}"];
    cb();`);
        /**
         * Let's make sure that the rendered function returned something
         * resembling a render result.
         */

        if (result == null || !Object.prototype.hasOwnProperty.call(result, "body") || !Object.prototype.hasOwnProperty.call(result, "status") || !Object.prototype.hasOwnProperty.call(result, "headers")) {
          throw new Error(`Malformed render result: ${JSON.stringify(result)}`);
        }
        /**
         * After all that, we should have a result, so let's return it and
         * let our finally tidy up all the render context we built.
         */


        return result;
      } finally {
        /**
         * We need to make sure that whatever happens, we tidy everything
         * up.
         */
        await this._closeAll(closeables, renderAPI.logger);
      }
    });

    if (configuration == null) {
      throw new Error("Must provide environment configuration");
    }

    this._configuration = configuration;
  }

  _closeAll(closeables, logger) {
    return new Promise(resolve => {
      /**
       * We wrap this in a timeout to hopefully mitigate any chances
       * of https://github.com/jsdom/jsdom/issues/1682
       */
      setTimeout(() => {
        /**
         * We want to close things in reverse, just to be sure we
         * tidy up in the same order that we put things together.
         */
        for (let i = closeables.length - 1; i >= 0; i--) {
          try {
            var _closeables$i, _closeables$i$close;

            // eslint-disable-next-line flowtype/no-unused-expressions
            (_closeables$i = closeables[i]) === null || _closeables$i === void 0 ? void 0 : (_closeables$i$close = _closeables$i.close) === null || _closeables$i$close === void 0 ? void 0 : _closeables$i$close.call(_closeables$i);
          } catch (e) {
            const simplifiedError = (0, _index.extractError)(e);
            logger.error(`Closeable encountered an error during resource loader close: ${simplifiedError.error || ""}`, _objectSpread({}, simplifiedError));
          }
        }
        /**
         * Let's clear the array to make sure we're not holding
         * on to any references unnecessarily.
         */


        closeables.length = 0;
        resolve();
      });
    });
  }

  _runScript(vmContext, script, options) {
    const {
      Script
    } = require("vm");

    const realScript = new Script(script, options);
    return realScript.runInContext(vmContext);
  }
  /**
   * Generate a render result for the given url.
   *
   * @param {string} url The URL that is to be rendered. This is always
   * relative to the host and so does not contain protocol, hostname, nor port
   * information.
   * @param {RenderAPI} renderAPI An API of utilities for assisting with the
   * render operation.
   * @returns {Promise<RenderResult>} The result of the render that is to be
   * returned by the gateway service as the response to the render request.
   * This includes the body of the response and the status code information.
   */


}

exports.JSDOMSixteenEnvironment = JSDOMSixteenEnvironment;
//# sourceMappingURL=jsdom-sixteen-environment.js.map