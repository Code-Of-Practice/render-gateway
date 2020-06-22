// @flow
import * as Shutdown from "../shutdown.js";
import * as UseAppEngineMiddleware from "../use-app-engine-middleware.js";
import * as SetupStackdriver from "../setup-stackdriver.js";
import {startGateway} from "../start-gateway.js";
import {createLogger} from "../create-logger.js";

jest.mock("../shutdown.js");

describe("#start-gateway", () => {
    beforeEach(() => {
        jest.spyOn(process, "on").mockImplementation(() => {});
        jest.spyOn(Shutdown, "shutdownGateway").mockResolvedValue();
    });

    const GAE_SERVICE = process.env.GAE_SERVICE;
    afterEach(() => {
        if (process.env.GAE_SERVICE == null) {
            delete process.env.GAE_SERVICE;
        } else {
            process.env.GAE_SERVICE = GAE_SERVICE;
        }
    });

    it("should set GAE_SERVICE if it is not set", () => {
        // Arrange
        delete process.env.GAE_SERVICE;
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const pretendApp = ({
            listen: jest.fn(),
        }: any);
        jest.spyOn(
            UseAppEngineMiddleware,
            "useAppEngineMiddleware",
        ).mockReturnValue(Promise.resolve(pretendApp));

        // Act
        startGateway(options, pretendApp);

        // Assert
        expect(process.env.GAE_SERVICE).toBe("TEST_GATEWAY");
    });

    it("should not set GAE_SERVICE if it is already set", () => {
        // Arrange
        process.env.GAE_SERVICE = "GAE_SERVICE_NAME";
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const pretendApp = ({
            listen: jest.fn(),
        }: any);
        jest.spyOn(
            UseAppEngineMiddleware,
            "useAppEngineMiddleware",
        ).mockReturnValue(Promise.resolve(pretendApp));

        // Act
        startGateway(options, pretendApp);

        // Assert
        expect(process.env.GAE_SERVICE).toBe("GAE_SERVICE_NAME");
    });

    it("should setup stackdriver", async () => {
        // Arrange
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const pretendApp = ({
            listen: jest.fn(),
        }: any);
        jest.spyOn(
            UseAppEngineMiddleware,
            "useAppEngineMiddleware",
        ).mockReturnValue(Promise.resolve(pretendApp));
        const setupStackdriverSpy = jest
            .spyOn(SetupStackdriver, "setupStackdriver")
            .mockReturnValue(Promise.resolve(pretendApp));

        // Act
        await startGateway(options, pretendApp);

        // Assert
        expect(setupStackdriverSpy).toHaveBeenCalledWith("test");
    });

    it("should add GAE middleware", async () => {
        // Arrange
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const pretendApp = ({
            listen: jest.fn(),
        }: any);
        const useAppEngineMiddlewareSpy = jest
            .spyOn(UseAppEngineMiddleware, "useAppEngineMiddleware")
            .mockReturnValue(Promise.resolve(pretendApp));

        // Act
        await startGateway(options, pretendApp);

        // Assert
        expect(useAppEngineMiddlewareSpy).toHaveBeenCalledWith(
            pretendApp,
            "test",
            options.logger,
        );
    });

    it("should listen on the configured port", async () => {
        // Arrange
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const pretendApp = ({
            listen: jest.fn(),
        }: any);
        jest.spyOn(
            UseAppEngineMiddleware,
            "useAppEngineMiddleware",
        ).mockReturnValue(Promise.resolve(pretendApp));

        // Act
        await startGateway(options, pretendApp);

        // Assert
        expect(pretendApp.listen).toHaveBeenCalledWith(
            42,
            "127.0.0.1",
            expect.any(Function),
        );
    });

    describe("listen callback", () => {
        it("should report start failure if gateway is null", async () => {
            // Arrange
            const options = {
                name: "TEST_GATEWAY",
                port: 42,
                host: "127.0.0.1",
                logger: createLogger("test", "debug"),
                mode: "test",
            };
            const listenMock = jest.fn().mockReturnValue(null);
            const pretendApp = ({
                listen: listenMock,
            }: any);
            jest.spyOn(
                UseAppEngineMiddleware,
                "useAppEngineMiddleware",
            ).mockReturnValue(Promise.resolve(pretendApp));
            await startGateway(options, pretendApp);
            const errorSpy = jest.spyOn(options.logger, "error");
            const listenCallback = listenMock.mock.calls[0][2];

            // Act
            listenCallback();

            // Assert
            expect(errorSpy).toHaveBeenCalledWith(
                "TEST_GATEWAY appears not to have started: Unknown error",
            );
        });

        it("should report start failure if there's an error", async () => {
            // Arrange
            const options = {
                name: "TEST_GATEWAY",
                port: 42,
                host: "127.0.0.1",
                logger: createLogger("test", "debug"),
                mode: "test",
            };
            const listenMock = jest.fn().mockReturnValue(null);
            const pretendApp = ({
                listen: listenMock,
            }: any);
            jest.spyOn(
                UseAppEngineMiddleware,
                "useAppEngineMiddleware",
            ).mockReturnValue(Promise.resolve(pretendApp));
            await startGateway(options, pretendApp);
            const errorSpy = jest.spyOn(options.logger, "error");
            const listenCallback = listenMock.mock.calls[0][2];

            // Act
            listenCallback(new Error("BOOM 🧨"));

            // Assert
            expect(errorSpy).toHaveBeenCalledWith(
                "TEST_GATEWAY appears not to have started: BOOM 🧨",
            );
        });

        it.each([[null, undefined, "ADDRESS"]])(
            "should report start failure if address is %s",
            async (address) => {
                // Arrange
                const options = {
                    name: "TEST_GATEWAY",
                    port: 42,
                    host: "127.0.0.1",
                    logger: createLogger("test", "debug"),
                    mode: "test",
                };
                const fakeServer = {
                    address: () => address,
                };
                const listenMock = jest.fn().mockReturnValue(fakeServer);
                const pretendApp = ({
                    listen: listenMock,
                }: any);
                jest.spyOn(
                    UseAppEngineMiddleware,
                    "useAppEngineMiddleware",
                ).mockReturnValue(Promise.resolve(pretendApp));
                await startGateway(options, pretendApp);
                const warnSpy = jest.spyOn(options.logger, "warn");
                const listenCallback = listenMock.mock.calls[0][2];

                // Act
                listenCallback();

                // Assert
                expect(warnSpy).toHaveBeenCalledWith(
                    `TEST_GATEWAY may not have started properly: ${address}`,
                );
            },
        );

        it("should report a successful start", async () => {
            // Arrange
            const options = {
                name: "TEST_GATEWAY",
                port: 42,
                host: "127.0.0.1",
                logger: createLogger("test", "debug"),
                mode: "test",
            };
            const fakeServer = {
                address: () => ({
                    address: "ADDRESS",
                    port: "PORT",
                }),
            };
            const listenMock = jest.fn().mockReturnValue(fakeServer);
            const pretendApp = ({
                listen: listenMock,
            }: any);
            jest.spyOn(
                UseAppEngineMiddleware,
                "useAppEngineMiddleware",
            ).mockReturnValue(Promise.resolve(pretendApp));
            await startGateway(options, pretendApp);
            const infoSpy = jest.spyOn(options.logger, "info");
            const listenCallback = listenMock.mock.calls[0][2];

            // Act
            listenCallback();

            // Assert
            expect(infoSpy).toHaveBeenCalledWith(
                "TEST_GATEWAY running at http://ADDRESS:PORT",
            );
        });

        it("sends ready message on start", async () => {
            // Arrange
            const options = {
                name: "TEST_GATEWAY",
                port: 42,
                host: "127.0.0.1",
                logger: createLogger("test", "debug"),
                mode: "test",
            };
            const fakeServer = {
                address: () => ({
                    address: "ADDRESS",
                    port: "PORT",
                }),
            };
            const listenMock = jest.fn().mockReturnValue(fakeServer);
            const pretendApp = ({
                listen: listenMock,
            }: any);
            jest.spyOn(
                UseAppEngineMiddleware,
                "useAppEngineMiddleware",
            ).mockReturnValue(Promise.resolve(pretendApp));
            const sendSpy = jest.spyOn(process, "send").mockReturnValue(null);
            await startGateway(options, pretendApp);
            const listenCallback = listenMock.mock.calls[0][2];

            // Act
            listenCallback();

            // Assert
            expect(sendSpy).toHaveBeenCalledWith("ready");
        });

        it("sends online message on start", async () => {
            // Arrange
            const options = {
                name: "TEST_GATEWAY",
                port: 42,
                host: "127.0.0.1",
                logger: createLogger("test", "debug"),
                mode: "test",
            };
            const fakeServer = {
                address: () => ({
                    address: "ADDRESS",
                    port: "PORT",
                }),
            };
            const listenMock = jest.fn().mockReturnValue(fakeServer);
            const pretendApp = ({
                listen: listenMock,
            }: any);
            jest.spyOn(
                UseAppEngineMiddleware,
                "useAppEngineMiddleware",
            ).mockReturnValue(Promise.resolve(pretendApp));
            const sendSpy = jest.spyOn(process, "send").mockReturnValue(null);
            await startGateway(options, pretendApp);
            const listenCallback = listenMock.mock.calls[0][2];

            // Act
            listenCallback();

            // Assert
            expect(sendSpy).toHaveBeenCalledWith("online");
        });
    });

    it("should attempt to shutdown the gateway on SIGINT", async () => {
        // Arrange
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const fakeServer = {
            address: () => ({
                address: "ADDRESS",
                port: "PORT",
            }),
            close: jest.fn(),
        };
        const shutdownSpy = jest.spyOn(Shutdown, "shutdownGateway");
        const listenMock = jest.fn().mockReturnValue(fakeServer);
        const pretendApp = ({
            listen: listenMock,
        }: any);
        jest.spyOn(
            UseAppEngineMiddleware,
            "useAppEngineMiddleware",
        ).mockReturnValue(Promise.resolve(pretendApp));
        const processSpy = jest.spyOn(process, "on");
        await startGateway(options, pretendApp);
        const infoSpy = jest.spyOn(options.logger, "info");
        const processCallback = processSpy.mock.calls[0][1];

        // Act
        processCallback();

        // Assert
        expect(infoSpy).toHaveBeenCalledWith(
            "SIGINT received, shutting down server.",
        );
        expect(shutdownSpy).toHaveBeenCalled();
    });

    it("should attempt to shutdown the gateway on shutdown message", async () => {
        // Arrange
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const fakeServer = {
            address: () => ({
                address: "ADDRESS",
                port: "PORT",
            }),
            close: jest.fn(),
        };
        const shutdownSpy = jest.spyOn(Shutdown, "shutdownGateway");
        const listenMock = jest.fn().mockReturnValue(fakeServer);
        const pretendApp = ({
            listen: listenMock,
        }: any);
        jest.spyOn(
            UseAppEngineMiddleware,
            "useAppEngineMiddleware",
        ).mockReturnValue(Promise.resolve(pretendApp));
        const processSpy = jest.spyOn(process, "on");
        await startGateway(options, pretendApp);
        const infoSpy = jest.spyOn(options.logger, "info");
        const processCallback = processSpy.mock.calls[1][1];

        // Act
        processCallback("shutdown");

        // Assert
        expect(infoSpy).toHaveBeenCalledWith(
            "'shutdown' message received, shutting down server.",
        );
        expect(shutdownSpy).toHaveBeenCalled();
    });

    it("should not attempt to shutdown the gateway on another message", async () => {
        // Arrange
        const options = {
            name: "TEST_GATEWAY",
            port: 42,
            host: "127.0.0.1",
            logger: createLogger("test", "debug"),
            mode: "test",
        };
        const fakeServer = {
            address: () => ({
                address: "ADDRESS",
                port: "PORT",
            }),
            close: jest.fn(),
        };
        const shutdownSpy = jest.spyOn(Shutdown, "shutdownGateway");
        const listenMock = jest.fn().mockReturnValue(fakeServer);
        const pretendApp = ({
            listen: listenMock,
        }: any);
        jest.spyOn(
            UseAppEngineMiddleware,
            "useAppEngineMiddleware",
        ).mockReturnValue(Promise.resolve(pretendApp));
        const processSpy = jest.spyOn(process, "on");
        await startGateway(options, pretendApp);
        const infoSpy = jest.spyOn(options.logger, "info");
        const processCallback = processSpy.mock.calls[1][1];

        // Act
        processCallback("other");

        // Assert
        expect(infoSpy).not.toHaveBeenCalledWith(
            "'shutdown' message received, shutting down server.",
        );
        expect(shutdownSpy).not.toHaveBeenCalled();
    });
});
