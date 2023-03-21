import newRelicErrorTransport from "./index";
import { Transform } from "stream";

const { buildCallback } = newRelicErrorTransport;
const processEnv = process.env;
const mockNoticeError = jest.fn();

jest.mock("newrelic", () => ({
  noticeError: mockNoticeError,
}));

describe("New Relic error transport", () => {
  beforeEach(() => {
    process.env = {
      ...processEnv,
      NEW_RELIC_APP_NAME: "appName",
      NEW_RELIC_LICENSE_KEY: "key",
    };
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = processEnv;
  });

  it("entrypoint returns the transform", () => {
    expect(newRelicErrorTransport.default()).toBeInstanceOf(Transform);
  });

  it("buildCallback does not call noticeError if error is falsy", async () => {
    await buildCallback([null]);
    expect(mockNoticeError).not.toHaveBeenCalled();
  });

  it("buildCallback calls noticeError if error is enriched error", async () => {
    await buildCallback([
      { "error.message": "an error", "error.stack": "error stack" },
    ]);

    const noticeErrorArg = mockNoticeError.mock.calls[0][0];

    expect(noticeErrorArg).toBeInstanceOf(Error);
    expect(noticeErrorArg.message).toBe("an error");
    expect(noticeErrorArg.stack).toBe("error stack");
    expect(noticeErrorArg.name).toBe("Error");
  });

  it("buildCallback calls noticeError if error is raw error", async () => {
    await buildCallback([
      {
        err: {
          message: "another error",
          stack: "another error stack",
        },
      },
    ]);

    const noticeErrorArg = mockNoticeError.mock.calls[0][0];

    expect(noticeErrorArg).toBeInstanceOf(Error);
    expect(noticeErrorArg.message).toBe("another error");
    expect(noticeErrorArg.stack).toBe("another error stack");
    expect(noticeErrorArg.name).toBe("Error");
  });

  it("buildCallback calls noticeError if error is generic object", async () => {
    await buildCallback([{ someKey: "some value" }]);

    const noticeErrorArg = mockNoticeError.mock.calls[0][0];

    expect(noticeErrorArg).toBeInstanceOf(Object);
    expect(noticeErrorArg).toEqual({
      someKey: "some value",
    });
  });

  it("buildCallback loops through a list of errors", async () => {
    await buildCallback([
      { "error.message": "an error", "error.stack": "error stack" },
      { someKey: "some value" },
    ]);

    const noticeErrorArgFirstCall = mockNoticeError.mock.calls[0][0];
    const noticeErrorArgSecondCall = mockNoticeError.mock.calls[1][0];

    expect(noticeErrorArgFirstCall).toBeInstanceOf(Error);
    expect(noticeErrorArgFirstCall.message).toBe("an error");
    expect(noticeErrorArgSecondCall).toEqual({
      someKey: "some value",
    });
  });
});
