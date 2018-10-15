import { ConfigContext, newConfig, number, string } from "../";

// Each component has its own/different config
const RollbarEnv = {
  ROLLBAR_URL: string()
};

const StatsEnv = {
  STATSD_URL: string()
};

// Pretend this is a 3rd party initialization function that we can't change.
// It expects a url and port as part of its initialization config.
function createThirdPartyMod(settings: { somePort: number; someUrl: string }): string {
  return `${settings.someUrl}:${settings.somePort}`;
}

// And so we declare an "env" adapter for its config
const SomeThirdPartyEnv = {
  somePort: number({ env: "SOME_PORT" }),
  someUrl: string()
};

const AppEnv = {
  APP_URL: string(),
  ...RollbarEnv,
  ...StatsEnv,
  someThirdParty: SomeThirdPartyEnv
};

/* eslint-disable prefer-destructuring */
describe("AppEnv", () => {
  const validEnvVars = {
    APP_URL: "http://app",
    ROLLBAR_URL: "http://rollbar",
    SOME_PORT: "100",
    SOME_URL: "thirdPartyUrl",
    STATSD_URL: "http://statsd"
  };

  it("can be constructed", () => {
    const context = new ConfigContext(validEnvVars);
    const c = newConfig(AppEnv, context);
    expect(c.ROLLBAR_URL).toBe("http://rollbar");
    expect(c.STATSD_URL).toBe("http://statsd");
    expect(c.APP_URL).toBe("http://app");
  });

  it("can compose settings", () => {
    const context = new ConfigContext(validEnvVars);
    const c = newConfig(AppEnv, context);
    expect(createThirdPartyMod(c.someThirdParty)).toBe("thirdPartyUrl:100");
  });
});
