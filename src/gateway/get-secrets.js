// @flow
import {getRuntimeMode, getGCloudSecrets} from "../ka-shared/index.js";

import type {Secrets} from "../ka-shared/index.js";

/**
 * Get the secrets table for the service.
 */
export const getSecrets = (cryptoKeyPath: string): Promise<Secrets> => {
    switch (getRuntimeMode()) {
        case "production":
            return getGCloudSecrets({
                cryptoKeyPath,
            });

        default:
            /**
             * This should never get called, but I wanted to demonstrate
             * call usage. We give a false path and return null from the
             * lookupFn. This means it won't find a secrets config file, and it
             * it does, it'll still throw from looking up null values.
             *
             * A service that needs this behavior would provide a real root path
             * and a real lookup function.
             */
            return getGCloudSecrets({
                serviceRootPath: "",
                lookupFn: () => null,
            });
    }
};
