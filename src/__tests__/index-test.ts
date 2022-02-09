import { boolean, ConfigError, newConfig, number, string } from "../";

const AppConfig = {
  enabled: boolean(),

  flag: boolean({ default: false }),

  name: string({ env: "NAME", notNeededIn: "development" }),

  nameWithDefault: string({ env: "NAME_NOT_SET", default: "DEFAULT" }),

  nameOptional: string({ env: "NAME_NOT_SET", optional: true }),

  port: number({ env: "PORT" }),

  portWithDefault: number({ env: "PORT_NOT_SET", default: 8081 }),

  portOptional: number({ env: "PORT_NOT_SET", optional: true }),

  nameIsEnvName: string(),

  SOME_URL: string(),
};

/* eslint-disable prefer-destructuring */
describe("AppEnv", () => {
  // default test value
  const validEnvVars = {
    ENABLED: "true",
    NAME: "app",
    NAME_IS_ENV_NAME: "app2",
    PORT: "8080",
    SOME_URL: "url",
  };

  it("can be constructed", () => {
    const c: typeof AppConfig = newConfig(AppConfig, validEnvVars);
    const name: string = c.name;
    expect(name).toBe("app");
  });

  it("cannot be constructed with missing env vars", () => {
    expect(() => newConfig(AppConfig, {})).toThrow(ConfigError);
  });

  it("can be constructed with missing env vars if skip is set", () => {
    const log = jest.spyOn(global.console, "log").mockImplementation(() => undefined);
    const invalidEnvVars: Partial<typeof validEnvVars> = { ...validEnvVars };
    delete invalidEnvVars.NAME;
    const conf = newConfig(AppConfig, invalidEnvVars, { ignoreErrors: true });
    expect(conf.name).toBeUndefined();
    expect(log).toHaveBeenCalledWith("Ignoring errors while instantiating config: NAME is not set");
  });

  it("can be constructed with missing env vars and also not complain about it", () => {
    const log = jest.spyOn(global.console, "log").mockImplementation(() => undefined);
    const invalidEnvVars: Partial<typeof validEnvVars> = { ...validEnvVars };
    delete invalidEnvVars.NAME;
    const conf = newConfig(AppConfig, invalidEnvVars, { ignoreErrors: true, doNotLogErrors: true });
    expect(conf.name).toBeUndefined();
    expect(log).toHaveBeenCalledTimes(0);
  });

  it("error message contains the name of all missing env vars", () => {
    const invalidEnvVars: Partial<typeof validEnvVars> = { ...validEnvVars };
    delete invalidEnvVars.NAME;
    delete invalidEnvVars.PORT;
    expect(() => newConfig(AppConfig, invalidEnvVars)).toThrow("NAME is not set, PORT is not set");
  });

  it("can ignore unset values in development environments", () => {
    const devEnvVars: Partial<typeof validEnvVars> = { ...validEnvVars };
    delete devEnvVars.NAME;
    const conf = newConfig(AppConfig, devEnvVars, { nodeEnv: "development" });
    expect(conf.name).toBeUndefined();
  });

  it("uses a default value if its given", () => {
    const nameWithDefault: string = newConfig(AppConfig, validEnvVars).nameWithDefault;
    expect(nameWithDefault).toBe("DEFAULT");
  });

  it("can use the property name as the env variable name", () => {
    const name: string = newConfig(AppConfig, validEnvVars).nameIsEnvName;
    expect(name).toBe("app2");
  });

  it("can use the property name as if already snake cased", () => {
    const url: string = newConfig(AppConfig, validEnvVars).SOME_URL;
    expect(url).toBe("url");
  });

  it("allows options to be optional", () => {
    const config = newConfig(AppConfig, validEnvVars);
    const nameOptional: string | undefined = config.nameOptional;
    expect(nameOptional).toBeUndefined();
  });

  it("can parse numbers", () => {
    const port: number = newConfig(AppConfig, validEnvVars).port;
    expect(port).toBe(8080);
  });

  it("can handle invalid numbers", () => {
    const vars = { ...validEnvVars, PORT: "invalid" };
    expect(() => newConfig(AppConfig, vars)).toThrow("PORT is not a number");
  });

  it("can get number default value", () => {
    const portWithDefault: number = newConfig(AppConfig, validEnvVars).portWithDefault;
    expect(portWithDefault).toBe(8081);
  });

  it("can have optional numbers", () => {
    const config = newConfig(AppConfig, validEnvVars);
    const portOptional: number | undefined = config.portOptional;
    expect(portOptional).toBeUndefined();
  });

  it("can have booleans", () => {
    const config = newConfig(AppConfig, validEnvVars);
    const enabled: boolean = config.enabled;
    expect(enabled).toBe(true);
  });

  it("can have booleans that default to false", () => {
    const config = newConfig(AppConfig, validEnvVars);
    expect(config.flag).toBe(false);
  });

  it("numbers are allowed to be floats", () => {
    validEnvVars.PORT = "100.5";
    const config = newConfig(AppConfig, validEnvVars);
    expect(config.port).toBe(100.5);
  });

  it("is frozen", () => {
    const config = newConfig(AppConfig, validEnvVars);
    expect(() => (config.name = "something else")).toThrow(
      new TypeError("Cannot assign to read only property 'name' of object '#<Object>'")
    );
  });
});
