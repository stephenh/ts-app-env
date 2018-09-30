import {
  ConfigContext,
  ConfigError,
  newConfig,
  number,
  string,
} from "../";

class AppConfig {
  public name = string({ env: "NAME" });

  public nameWithDefault = string({ env: "NAME_NOT_SET", default: "DEFAULT" });

  public nameOptional = string({ env: "NAME_NOT_SET", optional: true });

  public port = number({ env: "PORT" });

  public portWithDefault = number({ env: "PORT_NOT_SET", default: 8081 });

  public portOptional = number({ env: "PORT_NOT_SET", optional: true });

  public nameIsEnvName = string();

  public SOME_URL = string();
}

/* eslint-disable prefer-destructuring */
describe("AppConfig", () => {
  // default test value
  const validEnvVars = {
    NAME: "app",
    NAME_IS_ENV_NAME: "app2",
    PORT: "8080",
    SOME_URL: "url"
  };

  it("can be constructed", () => {
    const context = new ConfigContext(validEnvVars);
    const c: AppConfig = newConfig(AppConfig, context);
    const name: string = c.name;
    expect(name).toBe("app");
  });

  it("cannot be constructed with missing env vars", () => {
    const context = new ConfigContext({});
    expect(() => newConfig(AppConfig, context)).toThrow(ConfigError);
  });

  it("can be constructed with missing env vars if skip is set", () => {
    const log = jest.spyOn(global.console, "log").mockImplementation(() => undefined);
    const invalidEnvVars = { ...validEnvVars };
    delete invalidEnvVars.NAME;
    const context = new ConfigContext(invalidEnvVars);
    const conf = newConfig(AppConfig, context, true);
    expect(conf.name).toBeUndefined();
    expect(log).toHaveBeenCalledWith("Ignoring errors while instantiating config: NAME is not set");
  });

  it("error message contains the name of all missing env vars", () => {
    const invalidEnvVars = { ...validEnvVars };
    delete invalidEnvVars.NAME;
    delete invalidEnvVars.PORT;
    const context = new ConfigContext(invalidEnvVars);
    try {
      newConfig(AppConfig, context);
    } catch (e) {
      expect(e.message).toEqual("NAME is not set, PORT is not set");
    }
  });

  it("uses a default value if its given", () => {
    const context = new ConfigContext(validEnvVars);
    const nameWithDefault: string = newConfig(AppConfig, context)
      .nameWithDefault;
    expect(nameWithDefault).toBe("DEFAULT");
  });

  it("can use the property name as the env variable name", () => {
    const context = new ConfigContext(validEnvVars);
    const name: string = newConfig(AppConfig, context).nameIsEnvName;
    expect(name).toBe("app2");
  });

  it("can use the property name as if already snake cased", () => {
    const context = new ConfigContext(validEnvVars);
    const url: string = newConfig(AppConfig, context).SOME_URL;
    expect(url).toBe("url");
  });

  it("allows options to be optional", () => {
    const context = new ConfigContext(validEnvVars);
    const config = newConfig(AppConfig, context);
    const nameOptional: string | undefined = config.nameOptional;
    expect(nameOptional).toBeUndefined();
  });

  it("can parse numbers", () => {
    const context = new ConfigContext(validEnvVars);
    const port: number = newConfig(AppConfig, context).port;
    expect(port).toBe(8080);
  });

  it("can handle invalid numbers", () => {
    const vars = { ...validEnvVars, PORT: "invalid" };
    const context = new ConfigContext(vars);
    try {
      newConfig(AppConfig, context);
      fail();
    } catch (e) {
      expect(e.message).toEqual("PORT is not a number");
    }
  });

  it("can get number default value", () => {
    const context = new ConfigContext(validEnvVars);
    const portWithDefault: number = newConfig(AppConfig, context).portWithDefault;
    expect(portWithDefault).toBe(8081);
  });

  it("can have optional numbers", () => {
    const context = new ConfigContext(validEnvVars);
    const config = newConfig(AppConfig, context);
    const portOptional: number | undefined = config.portOptional;
    expect(portOptional).toBeUndefined();
  });
});
