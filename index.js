const build = require("pino-abstract-transport");

const createDeserializedError = (message, stack) => {
  const error = new Error(message);
  error.stack = stack;

  return error;
};

const buildCallback = async (source) => {
  const isNewrelicEnabled =
    process.env.NEW_RELIC_APP_NAME && process.env.NEW_RELIC_LICENSE_KEY;

  if (!isNewrelicEnabled) {
    return;
  }
  const newrelic = require("newrelic");

  for await (const logObj of source) {
    if (!logObj) {
      return;
    }

    const enrichedPinoError = logObj?.["error.message"] && logObj;
    const rawPinoError = logObj?.err;

    if (enrichedPinoError) {
      newrelic.noticeError(
        createDeserializedError(
          enrichedPinoError["error.message"],
          enrichedPinoError["error.stack"]
        )
      );
    } else if (rawPinoError) {
      newrelic.noticeError(
        createDeserializedError(rawPinoError.message, rawPinoError.stack)
      );
    } else {
      newrelic.noticeError(logObj);
    }
  }
};

const newRelicErrorTransport = () => {
  return build(buildCallback);
};

module.exports.default = newRelicErrorTransport;
module.exports.buildCallback = buildCallback;
