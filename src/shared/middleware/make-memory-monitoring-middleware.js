// @flow
import type {Middleware, $Request, $Response, NextFunction} from "express";
import {getRequestLogger} from "../get-request-logger.js";
import {shutdownGateway} from "../shutdown.js";
import type {Logger, RequestWithLog} from "../types.js";

/**
 * Check to see if there are ENV variables specified to limit the total
 * memory usage of a process. We look at the GAE_MEMORY_MB and MIN_FREE_MB
 * variables to compute out the maximum amount of memory this process
 * should be using. Then we compare it against what is actually being used
 * and if it's above that threshold we shutdown the server.
 */
export const makeMemoryMonitoringMiddleware = <
    TReq: RequestWithLog<$Request>,
    TRes: $Response,
>(
    rootlogger: Logger,
): Middleware<TReq, TRes> => {
    const {GAE_MEMORY_MB, MIN_FREE_MB} = process.env;
    rootlogger.info(`Creating memory monitoring middleware`, {
        GAE_MEMORY_MB,
        MIN_FREE_MB,
    });

    const middleware = <TReq: RequestWithLog<$Request>, TRes: $Response>(
        req: TReq,
        res: TRes,
        next: NextFunction,
    ): void => {
        const logger = getRequestLogger(rootlogger, req);

        if (!GAE_MEMORY_MB || !MIN_FREE_MB) {
            logger.warn(
                "Memory monitoring cannot be performed. Environment variables missing.",
            );
            next();
            return;
        }
        const gaeLimitBytes = parseFloat(GAE_MEMORY_MB) * 1024 * 1024;
        const minFreeBytes = parseFloat(MIN_FREE_MB) * 1024 * 1024;
        const maxAllowedBytes = gaeLimitBytes - minFreeBytes;
        const totalUsageBytes = process.memoryUsage().rss;

        logger.info("Memory check", {
            gaeLimitBytes,
            minFreeBytes,
            maxAllowedBytes,
            totalUsageBytes,
        });

        // We check to see if the total memory usage for this process is
        // higher than what's allowed and, if so, we shut it down gracefully
        if (totalUsageBytes >= maxAllowedBytes) {
            logger.warn("Memory usage is exceeding maximum.", {
                totalUsageBytes,
                maxAllowedBytes,
            });
            shutdownGateway(logger);
        }
        next();
    };
    return middleware;
};