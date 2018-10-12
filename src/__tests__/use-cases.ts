import { ConfigContext, newConfig, number, string } from "../";

// Pretend one component has some config
const RollbarEnv = {
  ROLLBAR_URL: string()
};

const StatsEnv = {
  STATSD_URL: string()
};

const AppEnv = {
  APP_URL: string(),
  ...RollbarEnv,
  ...StatsEnv
};

/* eslint-disable prefer-destructuring */
describe("AppEnv", () => {
  const validEnvVars = {
    ROLLBAR_URL: "http://rollbar",
    STATSD_URL: "http://statsd",
    APP_URL: "http://app"
  };

  it("can be constructed", () => {
    const context = new ConfigContext(validEnvVars);
    const c = newConfig(AppEnv, context);

    expect(c.ROLLBAR_URL).toBe("http://rollbar");
    expect(c.STATSD_URL).toBe("http://statsd");
    expect(c.APP_URL).toBe("http://app");
  });
});
