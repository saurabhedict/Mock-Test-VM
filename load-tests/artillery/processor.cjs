const DEFAULT_SESSION_WAIT_SECONDS = 75;

const parsePositiveInteger = (value, fallbackValue) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
};

const buildProtectionBypassQuery = () => {
  const secret = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "").trim();

  if (!secret) {
    return "";
  }

  return (
    `?x-vercel-protection-bypass=${encodeURIComponent(secret)}` +
    "&x-vercel-set-bypass-cookie=true"
  );
};

const isVercelProtectionChallenge = (response) => {
  const body = String(response?.body || "");

  return (
    response?.statusCode === 401 &&
    /Authentication Required|deployment protection|protection bypass|Vercel authentication/i.test(
      body
    )
  );
};

const extractResponseMessage = (response) => {
  const body = String(response?.body || "").trim();

  if (!body) {
    return "";
  }

  try {
    const parsed = JSON.parse(body);
    return String(parsed.message || parsed.msg || "").trim();
  } catch {
    return body.slice(0, 180).trim();
  }
};

module.exports = {
  prepareStudentContext(context, events, done) {
    const missing = [];

    if (!process.env.LOAD_EXAM_ID) {
      missing.push("LOAD_EXAM_ID");
    }

    if (!process.env.LOAD_TEST_ID) {
      missing.push("LOAD_TEST_ID");
    }

    if (missing.length > 0) {
      return done(
        new Error(
          `Missing required environment variables: ${missing.join(", ")}. ` +
            "Set them before running the Artillery benchmark."
        )
      );
    }

    if (!context.vars.email || !context.vars.password) {
      return done(
        new Error(
          "The current virtual user did not receive an email/password row from students.csv. " +
            "Make sure load-tests/artillery/students.csv exists and has enough unique verified student accounts."
        )
      );
    }

    const sessionWaitSeconds = parsePositiveInteger(
      process.env.LOAD_SESSION_WAIT_SECONDS,
      DEFAULT_SESSION_WAIT_SECONDS
    );

    context.vars.examId = process.env.LOAD_EXAM_ID;
    context.vars.testId = process.env.LOAD_TEST_ID;
    context.vars.sessionWaitSeconds = sessionWaitSeconds;
    context.vars.timeTakenSeconds = sessionWaitSeconds;
    context.vars.protectionBypassQuery = buildProtectionBypassQuery();

    events.emit("counter", "bench.student_session.prepared", 1);
    return done();
  },

  ensureAccessToken(requestParams, response, context, ee, done) {
    if (isVercelProtectionChallenge(response)) {
      return done(
        new Error(
          "The target deployment is protected by Vercel authentication. " +
            "Set VERCEL_AUTOMATION_BYPASS_SECRET before running the benchmark."
        )
      );
    }

    if (!context.vars.accessToken) {
      return done(
        new Error("Login completed without returning accessToken in the response body.")
      );
    }

    return done();
  },

  ensureAttemptId(requestParams, response, context, ee, done) {
    if (isVercelProtectionChallenge(response)) {
      return done(
        new Error(
          "The target deployment is protected by Vercel authentication. " +
            "Set VERCEL_AUTOMATION_BYPASS_SECRET before running the benchmark."
        )
      );
    }

    if (response?.statusCode >= 400) {
      const message = extractResponseMessage(response);
      return done(
        new Error(
          `Session start returned ${response.statusCode}${
            message ? `: ${message}` : ""
          }`
        )
      );
    }

    if (!context.vars.attemptId) {
      return done(new Error("Session start completed without returning attemptId."));
    }

    return done();
  },
};
