import { newConfig, number, string } from "../";

// Each component has its own/different config
const RollbarEnv = {
  ROLLBAR_URL: string(),
};

const StatsEnv = {
  STATSD_URL: string(),
};

// Pretend this is a 3rd party initialization function that we can't change.
// It expects a url and port as part of its initialization config.
function createThirdPartyMod(settings: { somePort: number; someUrl: string }): string {
  return `${settings.someUrl}:${settings.somePort}`;
}

// And so we declare an "env" adapter for its config
const SomeThirdPartyEnv = {
  somePort: number({ env: "SOME_PORT" }),
  someUrl: string(),
};

const somePrimitivesObject = {
  foo: true,
  bar: "bar",
  baz: 1,
};

const AppEnv = {
  APP_URL: string(),
  ENVIRONMENT: string({ default: "staging" }),
  ...RollbarEnv,
  ...StatsEnv,
  someThirdParty: SomeThirdPartyEnv,
  somePrimitives: somePrimitivesObject,
};

/* eslint-disable prefer-destructuring */
describe("AppEnv", () => {
  const validEnvVars = {
    APP_URL: "http://app",
    ENVIRONMENT: "production",
    ROLLBAR_URL: "http://rollbar",
    SOME_PORT: "100",
    SOME_URL: "thirdPartyUrl",
    STATSD_URL: "http://statsd",
  };

  it("can be constructed", () => {
    const c = newConfig(AppEnv, validEnvVars);
    expect(c.ROLLBAR_URL).toBe("http://rollbar");
    expect(c.STATSD_URL).toBe("http://statsd");
    expect(c.APP_URL).toBe("http://app");
    expect(c.ENVIRONMENT).toBe("production");
  });

  it("can compose settings", () => {
    const c = newConfig(AppEnv, validEnvVars);
    expect(createThirdPartyMod(c.someThirdParty)).toBe("thirdPartyUrl:100");
  });

  it("can compose settings", () => {
    const c = newConfig(AppEnv, validEnvVars);
    expect(createThirdPartyMod(c.someThirdParty)).toBe("thirdPartyUrl:100");
  });

  it("throws a single error for composed configs", () => {
    const invalidEnv: Partial<typeof validEnvVars> = { ...validEnvVars };
    delete invalidEnv.APP_URL;
    delete invalidEnv.SOME_URL;
    delete invalidEnv.SOME_PORT;
    expect(() => newConfig(AppEnv, invalidEnv)).toThrow(
      "APP_URL is not set, SOME_PORT is not set, SOME_URL is not set"
    );
  });

  it("can pass primitive values as-is", () => {
    const c = newConfig(AppEnv, validEnvVars);
    expect(c.somePrimitives).toEqual(somePrimitivesObject);
  });
});
