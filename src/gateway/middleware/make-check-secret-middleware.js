// @flow
import type {Middleware, $Response, NextFunction} from "express";
import {getRuntimeMode, getLogger} from "../../ka-shared/index.js";
import {getSecrets} from "../get-secrets.js";

import type {AuthenticationOptions, Request} from "../types.js";

async function makeProductionMiddleware<Req: Request, Res: $Response>(
    options: AuthenticationOptions,
): Promise<Middleware<Req, Res>> {
    /**
     * We look up the secret when the middleware is created. That means
     * that if the secret changes, the server needs to be
     * restarted/refreshed somehow.
     *
     * TODO(somewhatabstract, WEB-1410): Add ability to trigger refresh of
     * server - likely just a killswitch to kill an instance so that GAE spins
     * up new ones.
     */
    const {secretKey, headerName, cryptoKeyPath} = options;
    const secrets = await getSecrets(cryptoKeyPath);
    const secret = secrets[secretKey];
    if (secret == null) {
        throw new Error("Unable to load secret");
    }

    return function (req: Req, res: Res, next: NextFunction): void {
        const requestSecret = req.header(headerName);
        /**
         * We delete the header because we don't want it getting logged.
         */
        delete req.headers[options.headerName];
        if (requestSecret !== secret) {
            res.status(401).send({error: "Missing or invalid secret"});
            return;
        }

        next();
    };
}

function makeDevelopmentMiddleware<Req: Request, Res: $Response>(
    options: ?AuthenticationOptions,
): Promise<Middleware<Req, Res>> {
    /**
     * The secrets middleware is a noop when not in production.
     */
    return Promise.resolve(function (
        req: Req,
        res: Res,
        next: NextFunction,
    ): void {
        const logger = getLogger(req);
        /**
         * If authentication options were given, let's log a message if the
         * expected header is omitted. This is a valid thing to do in dev since
         * we don't authenticate dev requests, but it is also useful to know
         * during testing if the header is missing.
         */
        if (options != null) {
            if (req.header(options.headerName) == null) {
                logger.warn(
                    "Authentication header was not included in request.",
                    {
                        header: options.headerName,
                    },
                );
            } else {
                /**
                 * We delete the header because we don't want it getting logged.
                 */
                delete req.headers[options.headerName];
                logger.debug(
                    "Authentication header present but ignored in current runtime mode",
                    {
                        header: options.headerName,
                    },
                );
            }
        } else {
            logger.info("Authentication is not configured for this service.");
        }
        next();
    });
}

/**
 * Make the middleware to verify a request's authentication secret.
 *
 * This is a noop when not in production, otherwise this loads the appropriate
 * secret as identified by the options and then uses the configured header name
 * to identify the request header that it is to be matched against.
 */
export function makeCheckSecretMiddleware<Req: Request, Res: $Response>(
    authenticationOptions?: AuthenticationOptions,
): Promise<Middleware<Req, Res>> {
    if (authenticationOptions != null && getRuntimeMode() === "production") {
        return makeProductionMiddleware(authenticationOptions);
    }

    return makeDevelopmentMiddleware(authenticationOptions);
}
