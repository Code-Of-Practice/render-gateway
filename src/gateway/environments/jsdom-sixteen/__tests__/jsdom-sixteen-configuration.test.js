// @flow

import {JSDOMSixteenConfiguration} from "../jsdom-sixteen-configuration.js";

describe("JSDOMSixteenConfiguration", () => {
    describe("#constructor", () => {
        it.each([null, "not a function"])(
            "should throw if invalid getFileList is provided",
            (badGetFileList) => {
                // Arrange

                // Act
                const underTest = () =>
                    new JSDOMSixteenConfiguration(badGetFileList, jest.fn());

                // Assert
                expect(underTest).toThrowErrorMatchingSnapshot();
            },
        );

        it.each([null, "not a function"])(
            "should throw if invalid getResourceLoader is provided",
            (badGetResourceLoader) => {
                // Arrange

                // Act
                const underTest = () =>
                    new JSDOMSixteenConfiguration(
                        jest.fn(),
                        badGetResourceLoader,
                    );

                // Assert
                expect(underTest).toThrowErrorMatchingSnapshot();
            },
        );

        it("should throw if invalid afterEnvSetup is provided", () => {
            // Arrange

            // Act
            const underTest = () =>
                new JSDOMSixteenConfiguration(
                    jest.fn(),
                    jest.fn(),
                    ("not a function": any),
                );

            // Assert
            expect(underTest).toThrowErrorMatchingInlineSnapshot(
                `"Must provide valid callback for after env setup or null"`,
            );
        });
    });

    describe("#getFileList", () => {
        it("should invoke method passed at construction", async () => {
            // Arrange
            const fakeGetFileList = jest
                .fn()
                .mockReturnValue(Promise.resolve(("FILE_LIST": any)));
            const underTest = new JSDOMSixteenConfiguration(
                fakeGetFileList,
                jest.fn(),
            );
            const fakeRenderAPI: any = "FAKE_RENDER_API";

            // Act
            const result = await underTest.getFileList("URL", fakeRenderAPI);

            // Assert
            expect(fakeGetFileList).toHaveBeenCalledWith("URL", fakeRenderAPI);
            expect(result).toBe("FILE_LIST");
        });
    });

    describe("#getResourceLoader", () => {
        it("should invoke method passed at construction", () => {
            // Arrange
            const fakeGetResourceLoader = jest
                .fn()
                .mockReturnValue(("RESOURCE_LOADER": any));
            const underTest = new JSDOMSixteenConfiguration(
                jest.fn(),
                fakeGetResourceLoader,
            );
            const fakeRenderAPI: any = "FAKE_RENDER_API";

            // Act
            const result = underTest.getResourceLoader("URL", fakeRenderAPI);

            // Assert
            expect(fakeGetResourceLoader).toHaveBeenCalledWith(
                "URL",
                fakeRenderAPI,
            );
            expect(result).toBe("RESOURCE_LOADER");
        });
    });

    describe("#afterEnvSetup", () => {
        it("should invoke method passed at construction", () => {
            // Arrange
            const fakeAfterEnvSetup = jest
                .fn()
                .mockReturnValue(("SETUP_OBJECT": any));
            const underTest = new JSDOMSixteenConfiguration(
                jest.fn(),
                jest.fn(),
                fakeAfterEnvSetup,
            );
            const fakeRenderAPI: any = "FAKE_RENDER_API";

            // Act
            const result = underTest.afterEnvSetup("URL", fakeRenderAPI);

            // Assert
            expect(fakeAfterEnvSetup).toHaveBeenCalledWith(
                "URL",
                fakeRenderAPI,
            );
            expect(result).toBe("SETUP_OBJECT");
        });

        it("should return null if no method passed at construction", () => {
            // Arrange
            const underTest = new JSDOMSixteenConfiguration(
                jest.fn(),
                jest.fn(),
            );
            const fakeRenderAPI: any = "FAKE_RENDER_API";

            // Act
            const result = underTest.afterEnvSetup("URL", fakeRenderAPI);

            // Assert
            expect(result).toBeNull();
        });
    });
});